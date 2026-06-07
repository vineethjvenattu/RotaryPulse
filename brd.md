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

### 4.2. Database & Hosting Selection (Selected: Firebase)
The application will utilize **Firebase** as its backend suite:
- **Cloud Firestore**: Used for storing member directories, event details, RSVPs, attendance logs, announcements, and payment transaction metadata in real-time.
- **Firebase Authentication**: Handles Google Sign-In, Email/Password, and Phone OTP authentication.
- **Firebase Storage**: Stores member profile pictures and event photo albums.
- **Firebase Hosting**: For deploying the responsive front-end web application.

---

## 5. Proposed Data Schema (Firestore-aligned)

### 5.1. Members Collection
- `uid` (string, PK): Firebase Auth UID
- `name` (string)
- `mobile` (string)
- `email` (string)
- `role` (string: Member, Secretary, Treasurer, President)
- `classification` (string)
- `bloodGroup` (string)
- `birthday` (timestamp)
- `anniversary` (timestamp)
- `joinDate` (timestamp)
- `profilePicUrl` (string)

### 5.2. Events Collection
- `eventId` (string, PK)
- `title` (string)
- `date` (timestamp)
- `time` (string)
- `venue` (string)
- `type` (string: Meeting, Service, Social)
- `description` (string)
- `rsvpCount` (integer)

### 5.3. Attendance Collection
- `attendanceId` (string, PK)
- `eventId` (string, FK)
- `memberId` (string, FK)
- `status` (string: Present, Absent)
- `timestamp` (timestamp)

### 5.4. Payments Collection
- `paymentId` (string, PK)
- `memberId` (string, FK)
- `amount` (number)
- `description` (string)
- `status` (string: Paid, Pending, Overdue)
- `dueDate` (timestamp)
- `paidDate` (timestamp)
- `transactionReference` (string)
