# Business Requirements Document (BRD)
## Project: Rotary Connect (Responsive Web App)
### Client: Rotary Club - Amity Trivandrum Chapter

---

## 1. Project Overview & Objectives
The goal of this project is to design and develop **Rotary Connect**, a secure, responsive web application for managing the members, events, attendance, announcements, photo galleries, tasks, and financial dues of the Rotary Club - Amity Trivandrum Chapter. 

The application provides a fully custom, modern web experience with rich UI/UX, robust access controls, scalability, and real-time cross-device synchronization powered by Firebase Firestore.

---

## 2. Stakeholders & User Roles (Access Matrix)

The application supports four primary user roles, each with distinct permissions:

| Feature / Module | Member | Secretary | Treasurer | President (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| **View Directory & Profiles** | Read-Only | Read / Write | Read-Only | Read / Write |
| **Announcements** | Read-Only | Read / Write | Read-Only | Read / Write |
| **Events & Meetings** | Read & RSVP | Read / Write | Read-Only | Read / Write |
| **Mark Attendance** | None | Read / Write | None | Read / Write |
| **View Payments / Dues** | View Own | Committee Edit | Read / Write | Read / Write |
| **Create Receivables** | None | None | Read / Write | Read / Write |
| **Approve Payment Edits** | None | 2-of-3 Auth | 2-of-3 Auth | 2-of-3 Auth |
| **Meeting Minutes** | View | Create/Edit | View | Create/Edit |
| **Tasks & Project Notes** | View Own | Create/Edit | Create/Edit | Create/Edit |
| **User Feedbacks** | Create | View/Acknowledge | View/Acknowledge | View/Acknowledge |

> **Note on Committee**: The President, Secretary, and Treasurer form the core Committee.

---

## 3. Functional Requirements

### 3.1. Authentication & Security
- **Secure Logins**: Members must be authenticated to access any club information via email and PIN.
- **Session Management**: Per-tab session storage enabling simultaneous testing, falling back to persistent local storage for convenience. Cross-tab data sync uses storage event listeners.

### 3.2. Dashboard (Home)
- **Welcome Banner**: Dynamic greeting tailored to the logged-in member with mobile-first styling.
- **Next Meeting Highlight**: Highlighted upcoming event card.
- **Quick Action Grid**: Mobile-friendly buttons for Members, Events, Attendance, and Payments.
- **Top Bar**: Rotary wheel logo contextually hidden when deep-linked on mobile to allow back navigation.

### 3.3. Member Directory
- **Listing View**: Alphabetical list of members displaying profile image (or initials if none), name (with proper Rotarian Salutations like Rtn. or Rtn. Mrs.), role, and phone number. Profile images are globally updated across all views.
- **Search**: Real-time search by name.
- **Profile Detail View**:
  - Full-screen drawer layout on mobile.
  - Profile attributes: Classification, Blood Group, Birthday, Wedding Anniversary, Profile Image Upload.

### 3.4. Events & Meetings
- **Tabbed View**: Categorized into *Upcoming* and *Past* events.
- **Event Cards**: Display date badge, event title, time, venue, and description.
- **Meeting Console**: Deep integration for Secretaries/Presidents to manage meetings (Minutes, Tasks, Notes, Opinions).

### 3.5. Attendance Tracking
- **Event Selection**: List of events requiring attendance registration.
- **Quick Search**: Search bar to quickly locate members.
- **Status Toggles**: Mobile-optimized, inline toggles for Present/Absent.
- **QR Code Check-in**: Generates a dynamic QR code for an event. Members can scan it using their mobile device to self-check-in, which directly updates the central Firebase database. Duplicate check-ins are prevented.
- **Summary Header**: Responsive 3-column statistics for Present, Absent, and Total strength.

### 3.6. Payments, Dues & Committee Approvals
- **Dues Tab**: Displays outstanding amount, due date, and a "Pay Now" simulated gateway.
- **Receivable Creation**: President and Treasurer can bulk-create receivables (dues) for selected members.
- **Payment Edit Approval Workflow (2-of-3 Rule)**:
  - Any committee member can propose an edit to a pending payment (except their own).
  - The edit requires approval from the *other two* committee members.
  - A dedicated "Approvals Needed" UI shows color-coded diffs of the proposed changes.
  - The proposer can withdraw the edit before it is approved.
  - Rejected edits are flagged with the rejector's name.

### 3.7. Announcements (Notice Board)
- **Notice Feed**: Feed of official announcements ordered chronologically.

### 3.8. Feedback Management
- **Feedback Widget**: Floating widget accessible across the app for members to submit feedback (bug reports, feature requests, general).
- **Admin Feedback Menu**: Dedicated menu for the Core Committee to review submitted feedbacks.
- **Notification System**: Global bell icon displaying a notification badge for the count of *unacknowledged* feedbacks.
- **Acknowledge Workflow**: Core committee members can click "Acknowledge" to mark a feedback as seen, clearing the notification badge.

---

## 4. Non-Functional Requirements (NFR)

### 4.1. Responsive Design & Usability
- **Mobile-First Layout**: Optimized for screen sizes from 360px width upwards.
- **Premium Aesthetics**: Dark blue headers, clean backgrounds, sleek shadows, modern borders, and structured UI components. Splash screen loader displayed for exactly 5 seconds on initial load.

### 4.2. Database & Hosting (Firebase)
The application utilizes Google Firebase for robust, real-time data management:
- **Database (Firestore)**: Cloud NoSQL database storing all collections (Members, Events, Payments, Attendance, Edits, etc.) enabling cross-device real-time sync.
- **Hosting**: Deployed on Firebase Hosting (`rotary-club-of-amity-tvm.web.app`).

---

## 5. Data Schema (Firestore Collections)

### 5.1. `members`
- `Member ID` (string, PK), `Name`, `Mobile`, `Email`, `Role`, `Classification`, `Blood Group`, `Birthday`, `Anniversary`, `Join Date`, `Password/PIN`, `Image`

### 5.2. `events`
- `Event ID` (string, PK), `Event Name`, `Date`, `Time`, `Venue`, `Type`, `Description`

### 5.3. `attendance`
- `Attendance ID` (string, PK), `Event ID`, `Event Name`, `Member ID`, `Member Name`, `Status`, `Date`

### 5.4. `payments`
- `Payment ID` (string, PK), `Member ID`, `Amount`, `Description`, `Category`, `Status` (Paid/Pending), `Due Date`, `Paid Date`

### 5.5. `payment_edits`
- `Edit ID` (string, PK), `Payment ID`, `Status` (pending/approved/rejected/cancelled), `Proposed By`, `Required Approvers` (array), `Approvals` (array), `Rejections` (array), `Changes` (map), `Original` (map)

### 5.6. `feedbacks`
- `id` (string, PK), `userId`, `userName`, `type`, `message`, `timestamp`, `acknowledged` (boolean)

### 5.7. Other Collections
- `announcements`, `tasks`, `projectNotes`, `minutes`, `opinions`
