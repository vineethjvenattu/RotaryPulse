# Business Requirements Document (BRD)
## Project: Rotary Connect (Responsive Web App)
### Client: Rotary Club - Amity Trivandrum Chapter

---

## 1. Project Overview & Objectives
The goal of this project is to design and develop **Rotary Connect**, a secure, responsive web application for managing the members, events, attendance, announcements, photo galleries, and financial dues of the Rotary Club - Amity Trivandrum Chapter. 

While the initial mockup suggested a Glide App (No-Code) powered by Google Sheets, this BRD is structured to transform that mockup into a fully custom, responsive, and modern web application. This will offer richer UI/UX, better access control, scalability, and seamless integrations.

---

## 2. Stakeholders & User Roles (Access Matrix)

The application will support four primary user roles, each with distinct permissions:

| Feature / Module | Member | Secretary | Treasurer | President (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| **View Directory & Profiles** | Read-Only | Read / Write | Read-Only | Read / Write |
| **Announcements** | Read-Only | Read / Write | Read-Only | Read / Write |
| **Events & Meetings** | Read & RSVP | Read / Write | Read-Only | Read / Write |
| **Mark Attendance** | None | Read / Write | None | Read / Write |
| **View Payments / Dues** | View Own | None | Read / Write | Read / Write |
| **Record Offline Payments** | None | None | Read / Write | Read / Write |
| **Photo Gallery** | View & Upload | View & Moderation | View | Full Control |
| **App Settings & Config** | None | None | None | Full Control |

---

## 3. Functional Requirements

### 3.1. Authentication & Security
- **Secure Logins**: Members must be authenticated to access any club information.
- **Login Methods**:
  - Google Sign-In (OAuth 2.0).
  - Phone OTP authentication (for ease of use among senior members).
  - Standard Email / Password.
- **Session Management**: Secure token-based session persistence.

### 3.2. Dashboard (Home)
- **Welcome Banner**: Dynamic greeting tailored to the logged-in member.
- **Next Meeting Highlight**: Countdown, date, time, venue, and a quick "View Details" action.
- **Today's Birthdays / Anniversaries**: Slide/list of members celebrating today with quick links to call/message them.
- **Quick Action Grid**: Mobile-friendly buttons for Members, Events, Attendance, and Payments.
- **Recent Announcements**: Preview of the top 2-3 active announcements.

### 3.3. Member Directory
- **Listing View**: Alphabetical list of members displaying photo, name, role (e.g., President, Member), and phone number.
- **Search & Filter**: Real-time search by name, filtering by Rotary classification (e.g., Real Estate, Education) or blood group.
- **Profile Detail View**:
  - Large profile picture.
  - Action buttons: Call, WhatsApp Message, Email.
  - Profile attributes: Classification, Blood Group, Birthday, Wedding Anniversary.

### 3.4. Events & Meetings
- **Tabbed View**: Categorized into *Upcoming* and *Past* events.
- **Event Cards**: Display date badge, event title, time, venue, and description.
- **RSVP / Attendance Check**: Members can indicate if they will attend.
- **Event Creation (Admin/Secretary)**: Form to add new events with details (Name, Date, Time, Venue, Type, Description).

### 3.5. Attendance Tracking
- **Event Selection**: List of events requiring attendance registration.
- **Quick Search**: Search bar to quickly locate members during meetings.
- **Status Toggles**: Toggle each member's status as Present or Absent.
- **Summary Header**: Display counts for Present, Absent, and Total strength.

### 3.6. Announcements (Notice Board)
- **Notice Feed**: Feed of official announcements ordered chronologically (newest first).
- **Detail View**: Full description and attachments (if any).
- **Creation Form (Admin/Secretary)**: Simple editor to draft and publish new announcements.

### 3.7. Payments & Dues
- **Dues Tab**: Displays outstanding amount, due date, and a "Pay Now" call to action.
- **History Tab**: Itemized history of past payments showing receipt dates, description (e.g., Annual Dues, Project Contribution), and status (Paid, Pending).
- **Payment Integration**: Secure processing of dues (e.g., UPI, Net Banking, Credit/Debit cards).
- **Manual Recording (Treasurer)**: Interface for the Treasurer to record offline payments (Cash/Cheque).

### 3.8. Photo Gallery
- **Album Grid**: Visual layout of albums categorized by events (e.g., "Installation Ceremony", "Blood Donation Camp").
- **Album Details**: Lightbox or grid view of photos in an album.
- **Media Upload**: Interface for members/admins to upload event photos with a moderation workflow for approval.

---

## 4. Non-Functional Requirements (NFR)

### 4.1. Responsive Design & Usability
- **Mobile-First Layout**: Optimized for screen sizes from 360px width upwards (common smartphones) up to large desktops.
- **Accessibility (a11y)**: Clean contrasts, clear touch targets, and legible typography (e.g., Inter, Outfit, or Roboto) suitable for older members.
- **Premium Aesthetics**: Clean dark/light mode accents, sleek shadows, modern borders, and glassmorphic card patterns.

### 4.2. Database & Hosting Selection (Selected: Google Sheets & Free Hosting)
The application will utilize **Google Sheets** as its primary database, keeping operations 100% free and easy to manage for administrators:
- **Database (Google Sheets)**: All club data (Members, Events, Attendance, Payments, Announcements) will reside in a Google Sheets workbook.
- **Backend API Integration**: 
  - **Option A (Recommended): Google Apps Script Web App**: A custom script deployed inside the Google Sheet that acts as a REST API proxy (GET/POST) to read and write data securely without API key management overhead.
  - **Option B: Google Sheets API (v4)**: Integration via Google Cloud Service Account.
- **Authentication**: 
  - Since Google Sheets does not have built-in authentication, we will implement a simple secure member verification system (e.g. email-based verification, password/PIN column in the Members sheet, or a free Firebase Auth/Google Sign-In flow linked to the Sheet's email records).
- **Frontend Hosting**: Deployed on Vercel, Netlify, or GitHub Pages.

---

## 5. Proposed Data Schema (Google Sheets Database Structure)

### 5.1. Members Sheet
- `Member ID` (string, PK) - e.g. M001
- `Name` (string)
- `Mobile` (string)
- `Email` (string)
- `Role` (string: Member, Secretary, Treasurer, President)
- `Classification` (string) - e.g. Real Estate, Education
- `Blood Group` (string)
- `Birthday` (string/date)
- `Anniversary` (string/date)
- `Join Date` (string/date)
- `Password/PIN` (string, hashed) - For member login verification

### 5.2. Events Sheet
- `Event ID` (string, PK) - e.g. E001
- `Event Name` (string)
- `Date` (string/date)
- `Time` (string)
- `Venue` (string)
- `Type` (string: Meeting, Service, Social)
- `Description` (string)

### 5.3. Attendance Sheet
- `Attendance ID` (string, PK) - e.g. AD01
- `Event ID` (string, FK)
- `Event Name` (string)
- `Member ID` (string, FK)
- `Member Name` (string)
- `Status` (string: Present, Absent)
- `Date` (string/date)

### 5.4. Payments / Dues Sheet
- `Payment ID` (string, PK) - e.g. P001
- `Member ID` (string, FK)
- `Member Name` (string)
- `Amount` (number)
- `Description` (string)
- `Status` (string: Paid, Pending)
- `Due Date` (string/date)
- `Paid Date` (string/date)
- `Reference` (string)

### 5.5. Announcements Sheet
- `Announcement ID` (string, PK) - e.g. AN01
- `Date` (string/date)
- `Title` (string)
- `Content` (string)
- `Created By` (string)
