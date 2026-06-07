/**
 * Rotary Connect - Google Sheets Backend API Proxy (Expanded)
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Create the following sheets inside the workbook:
 *    - "Members"
 *    - "Events"
 *    - "Attendance"
 *    - "Payments"
 *    - "Announcements"
 *    - "Minutes"
 *    - "Tasks"
 *    - "ProjectNotes"
 *    - "Opinions"
 * 3. Set up the header columns for row 1 in each sheet:
 *    - Members: Member ID, Name, Mobile, Email, Role, Classification, Blood Group, Birthday, Anniversary, Join Date, Password/PIN
 *    - Events: Event ID, Event Name, Date, Time, Venue, Type, Description
 *    - Attendance: Attendance ID, Event ID, Event Name, Member ID, Member Name, Status, Date
 *    - Payments: Payment ID, Event ID, Member ID, Member Name, Amount, Description, Category, Quantity, Status, Due Date, Paid Date, Reference, Notes
 *    - Announcements: Announcement ID, Date, Title, Content, Created By
 *    - Minutes: Minute ID, Event ID, Notes, Date, Author
 *    - Tasks: Task ID, Event ID, Title, Description, Assigned Member ID, Assigned Member Name, Status, Target Date
 *    - ProjectNotes: Project Note ID, Event ID, Project Event ID, Project Name, Notes, Status
 *    - Opinions: Opinion ID, Event ID, Member ID, Member Name, Opinion Text, Action Required, Action Details
 * 4. Click Extensions > Apps Script in the Google Sheets menu.
 * 5. Replace all default code with this file's contents.
 * 6. Click Deploy > New Deployment. Web App, Execute as "Me", Access "Anyone".
 * 7. Copy the generated Web App URL and add it to your .env file.
 */

// Helper to set headers for CORS support
function handleResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET: Retrieve all data
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const membersData = getSheetRecords(ss.getSheetByName("Members"));
    const sanitizedMembers = membersData.map(m => {
      const { ["Password/PIN"]: pin, ...rest } = m;
      return { ...rest, hasPin: !!pin };
    });

    const data = {
      members: sanitizedMembers,
      events: getSheetRecords(ss.getSheetByName("Events")),
      attendance: getSheetRecords(ss.getSheetByName("Attendance")),
      payments: getSheetRecords(ss.getSheetByName("Payments")),
      announcements: getSheetRecords(ss.getSheetByName("Announcements")),
      minutes: getSheetRecords(ss.getSheetByName("Minutes")),
      tasks: getSheetRecords(ss.getSheetByName("Tasks")),
      projectNotes: getSheetRecords(ss.getSheetByName("ProjectNotes")),
      opinions: getSheetRecords(ss.getSheetByName("Opinions"))
    };
    
    return handleResponse({ success: true, data: data });
  } catch (error) {
    return handleResponse({ success: false, error: error.toString() });
  }
}

// Helper to convert sheet rows into array of objects
function getSheetRecords(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const records = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const record = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j];
      if (row[j] !== "") hasData = true;
    }
    if (hasData) {
      records.push(record);
    }
  }
  return records;
}

// POST: Mutations
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return handleResponse({ success: false, error: "Empty post body" });
    }
    
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "login") {
      return handleLogin(ss, params.email, params.pin);
    } else if (action === "set_pin") {
      return handleSetPin(ss, params.email, params.pin);
    } else if (action === "mark_attendance") {
      return handleMarkAttendance(ss, params.eventId, params.eventName, params.attendanceList, params.date);
    } else if (action === "add_announcement") {
      return handleAddAnnouncement(ss, params.announcement);
    } else if (action === "add_event") {
      return handleAddEvent(ss, params.event);
    } else if (action === "make_payment") {
      return handleMakePayment(ss, params.paymentId, params.reference);
    } else if (action === "add_minute") {
      return handleAddMinute(ss, params.eventId, params.notes, params.author);
    } else if (action === "add_task") {
      return handleAddTask(ss, params.eventId, params.title, params.description, params.assignedMemberId, params.assignedMemberName, params.targetDate);
    } else if (action === "update_task_status") {
      return handleUpdateTaskStatus(ss, params.taskId, params.status);
    } else if (action === "add_project_note") {
      return handleAddProjectNote(ss, params.eventId, params.projectEventId, params.projectName, params.notes, params.status);
    } else if (action === "add_opinion") {
      return handleAddOpinion(ss, params.eventId, params.memberId, params.memberName, params.opinionText, params.actionRequired, params.actionDetails);
    } else if (action === "record_meeting_payment") {
      return handleRecordMeetingPayment(ss, params.eventId, params.memberId, params.memberName, params.category, params.quantity, params.amount, params.notes);
    } else {
      return handleResponse({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    return handleResponse({ success: false, error: error.toString() });
  }
}

// Credentials
function handleLogin(ss, email, pin) {
  const sheet = ss.getSheetByName("Members");
  const records = getSheetRecords(sheet);
  const member = records.find(m => m["Email"].toLowerCase().trim() === email.toLowerCase().trim());
  if (!member) return handleResponse({ success: false, error: "Member email not found" });
  
  const savedPin = String(member["Password/PIN"]).trim();
  if (savedPin === "") return handleResponse({ success: true, needsPinSetup: true, email: member["Email"] });
  
  if (savedPin === String(pin).trim()) {
    const { ["Password/PIN"]: p, ...sanitizedMember } = member;
    return handleResponse({ success: true, member: sanitizedMember });
  } else {
    return handleResponse({ success: false, error: "Incorrect PIN" });
  }
}

// Set PIN
function handleSetPin(ss, email, pin) {
  const sheet = ss.getSheetByName("Members");
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  const emailColIndex = headers.indexOf("Email");
  const pinColIndex = headers.indexOf("Password/PIN");
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][emailColIndex].toLowerCase().trim() === email.toLowerCase().trim()) {
      if (String(values[i][pinColIndex]).trim() !== "") {
        return handleResponse({ success: false, error: "PIN is already setup." });
      }
      sheet.getCell(i + 1, pinColIndex + 1).setValue(String(pin).trim());
      const updatedRecords = getSheetRecords(sheet);
      const member = updatedRecords.find(m => m["Email"].toLowerCase().trim() === email.toLowerCase().trim());
      const { ["Password/PIN"]: p, ...sanitizedMember } = member;
      return handleResponse({ success: true, member: sanitizedMember });
    }
  }
  return handleResponse({ success: false, error: "Member email not found" });
}

// Attendance
function handleMarkAttendance(ss, eventId, eventName, attendanceList, dateStr) {
  const sheet = ss.getSheetByName("Attendance");
  const headers = ["Attendance ID", "Event ID", "Event Name", "Member ID", "Member Name", "Status", "Date"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  attendanceList.forEach(item => {
    let foundRowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === eventId && values[i][3] === item.memberId) {
        foundRowIndex = i + 1;
        break;
      }
    }
    if (foundRowIndex > -1) {
      sheet.getRange(foundRowIndex, 6).setValue(item.status);
      sheet.getRange(foundRowIndex, 7).setValue(dateStr);
    } else {
      const nextId = "AD" + String(sheet.getLastRow()).padStart(3, '0');
      sheet.appendRow([nextId, eventId, eventName, item.memberId, item.memberName, item.status, dateStr]);
    }
  });
  return handleResponse({ success: true });
}

// Events
function handleAddEvent(ss, event) {
  const sheet = ss.getSheetByName("Events");
  const headers = ["Event ID", "Event Name", "Date", "Time", "Venue", "Type", "Description"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const nextId = "E" + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([nextId, event.eventName, event.date, event.time, event.venue, event.type, event.description]);
  return handleResponse({ success: true, id: nextId });
}

// Announcements
function handleAddAnnouncement(ss, announcement) {
  const sheet = ss.getSheetByName("Announcements");
  const headers = ["Announcement ID", "Date", "Title", "Content", "Created By"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const nextId = "AN" + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([nextId, announcement.date, announcement.title, announcement.content, announcement.createdBy]);
  return handleResponse({ success: true, id: nextId });
}

// Simulated Payments
function handleMakePayment(ss, paymentId, reference) {
  const sheet = ss.getSheetByName("Payments");
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idColIndex = headers.indexOf("Payment ID");
  const statusColIndex = headers.indexOf("Status");
  const paidDateColIndex = headers.indexOf("Paid Date");
  const refColIndex = headers.indexOf("Reference");
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idColIndex] === paymentId) {
      const formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      sheet.getRange(i + 1, statusColIndex + 1).setValue("Paid");
      sheet.getRange(i + 1, paidDateColIndex + 1).setValue(formattedDate);
      sheet.getRange(i + 1, refColIndex + 1).setValue(reference);
      return handleResponse({ success: true });
    }
  }
  return handleResponse({ success: false, error: "Payment not found" });
}

// Add Minutes
function handleAddMinute(ss, eventId, notes, author) {
  const sheet = ss.getSheetByName("Minutes");
  const headers = ["Minute ID", "Event ID", "Notes", "Date", "Author"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  
  const values = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === eventId) {
      existingRow = i + 1;
      break;
    }
  }
  
  const formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (existingRow > -1) {
    sheet.getRange(existingRow, 3).setValue(notes);
    sheet.getRange(existingRow, 4).setValue(formattedDate);
    sheet.getRange(existingRow, 5).setValue(author);
  } else {
    const nextId = "MN" + String(sheet.getLastRow()).padStart(3, '0');
    sheet.appendRow([nextId, eventId, notes, formattedDate, author]);
  }
  return handleResponse({ success: true });
}

// Add Task
function handleAddTask(ss, eventId, title, description, assignedMemberId, assignedMemberName, targetDate) {
  const sheet = ss.getSheetByName("Tasks");
  const headers = ["Task ID", "Event ID", "Title", "Description", "Assigned Member ID", "Assigned Member Name", "Status", "Target Date"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const nextId = "T" + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([nextId, eventId, title, description, assignedMemberId, assignedMemberName, "Pending", targetDate]);
  return handleResponse({ success: true, id: nextId });
}

// Update Task Status
function handleUpdateTaskStatus(ss, taskId, status) {
  const sheet = ss.getSheetByName("Tasks");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === taskId) {
      sheet.getRange(i + 1, 7).setValue(status); // Column 7 is Status
      return handleResponse({ success: true });
    }
  }
  return handleResponse({ success: false, error: "Task not found" });
}

// Add Project Note
function handleAddProjectNote(ss, eventId, projectEventId, projectName, notes, status) {
  const sheet = ss.getSheetByName("ProjectNotes");
  const headers = ["Project Note ID", "Event ID", "Project Event ID", "Project Name", "Notes", "Status"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const nextId = "PN" + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([nextId, eventId, projectEventId, projectName, notes, status]);
  return handleResponse({ success: true, id: nextId });
}

// Add Opinion
function handleAddOpinion(ss, eventId, memberId, memberName, opinionText, actionRequired, actionDetails) {
  const sheet = ss.getSheetByName("Opinions");
  const headers = ["Opinion ID", "Event ID", "Member ID", "Member Name", "Opinion Text", "Action Required", "Action Details"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const nextId = "O" + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([nextId, eventId, memberId, memberName, opinionText, actionRequired, actionDetails]);
  return handleResponse({ success: true, id: nextId });
}

// Record Meeting Payment
function handleRecordMeetingPayment(ss, eventId, memberId, memberName, category, quantity, amount, notes) {
  const sheet = ss.getSheetByName("Payments");
  const headers = ["Payment ID", "Event ID", "Member ID", "Member Name", "Amount", "Description", "Category", "Quantity", "Status", "Due Date", "Paid Date", "Reference", "Notes"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  
  const nextId = "P" + String(sheet.getLastRow()).padStart(3, '0');
  const formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  sheet.appendRow([
    nextId,
    eventId,
    memberId,
    memberName,
    amount,
    category + " for Event " + eventId,
    category,
    quantity,
    "Paid",
    formattedDate,
    formattedDate,
    "MEETING_COLLECTION",
    notes
  ]);
  return handleResponse({ success: true, id: nextId });
}
