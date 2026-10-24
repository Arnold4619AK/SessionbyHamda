# Hamda Zubair — Multi-Page Clinical Portfolio & 3-Step Consultation Booking

Transform the platform into **four dedicated pages** (**Portfolio & Sessions**, **Book Consultation**, **Manage Appointments**, and **Calendar & Reminders**), introduce a structured **3-Step Book Consultation Wizard** with QR Code, UPI ID, and Bank Transfer verification, fix mobile alignment in the hero card, showcase **Hamda Zubair's profile photo**, and enrich the layout with soothing warm beige botanical and linen sanctuary visuals.

### User Review & Critical Decisions

> [!IMPORTANT]
> All core workflow and design preferences have been confirmed in our clarification step and will be implemented directly upon approval.

- **Confirmed Decision 1 — 4 Separate Pages**: **Portfolio & Sessions**, **Book Consultation**, **Manage Appointments**, and **Calendar & Reminders** will each render as independent, dedicated pages with clean top-bar and mobile navigation switching.
- **Confirmed Decision 2 — 3-Step Book Consultation Flow & Payment Confirmation**:
  - **Step 1 (Choose the Session)**: Select from Hamda Zubair's clinical offerings (50-min Individual Neuropsychology & Behavioral Consultation, 60-min Neuromodulation & Biofeedback Assessment, 45-min JPMR & Somatic Stress Regulation, or 60-min Academic & Career Mentorship) and consultation mode (Video or Audio).
  - **Step 2 (Client Details, Confirmation & Reminder Recording)**: Capture Full Name, Email Address, WhatsApp / Phone Number for automated reminders, Preferred Calendar Date & Time Slot, and Primary Clinical Focus / Notes for recording data.
  - **Step 3 (Payment Session — QR Code, UPI ID & Bank Transfer Details)**: Display a scannable UPI QR Code, copyable UPI ID (`hamdazubair@okaxis`), and full Bank Transfer (NEFT / IMPS) details alongside a **UTR / Transaction Reference** input field to confirm and record the booking.
- **Confirmed Decision 3 — Mobile Alignment & Profile Photo**: Stack and left-align the hero CTA buttons (`Book a Session with Hamda` and `Explore Session Details`) and contact handles (`hamda.connect@gmail.com` and `@hamda.zubair`) cleanly on mobile screens (`flex-col items-stretch sm:flex-row sm:items-center`) so nothing shifts awkwardly to the right, and feature Hamda Zubair's portrait photo prominently with an option to upload/update the photo file directly in the browser.
- **Confirmed Decision 4 — Soothing Beige Sanctuary Imagery**: Integrate soft organic linen, warm botanical, and sunlit beige sanctuary imagery across the Portfolio, Booking Wizard, Appointments, and Calendar pages.

---

### 1. Overview & Core Concept

- **What It Does**: Provides a calm, multi-page digital practice for **Hamda Zubair** (Neuropsychologist, Behavioral Therapist & Psychology Content Creator in Hyderabad, India) where clients can explore her clinical portfolio and session offerings on Page 1, complete a guided 3-step consultation booking with QR/UPI/Bank payment on Page 2, manage upcoming video consultations and encrypted personal notes on Page 3, and configure calendar availability slots and automated reminder templates on Page 4.
- **Target Audience / Persona**: Clients seeking neuropsychology, behavioral therapy, or mentorship sessions with Hamda Zubair, as well as Hamda managing her appointment schedule, availability calendar, and automated reminder templates.
- **Key Value**: Eliminates single-page scrolling clutter by dedicating focused pages to each workflow, streamlines payment via direct QR/UPI/Bank transfer with UTR recording, and ensures responsive mobile alignment across all screen sizes.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Page 1 — Portfolio & Sessions**: Visitors land on the hero split featuring Hamda Zubair's profile photo card and properly aligned mobile/desktop CTAs and contact details (`hamda.connect@gmail.com` · `@hamda.zubair`). Below, a soothing warm beige botanical banner leads into her 4-pillar clinical highlights, her Mind & Brain Hospital experience (rTMS, tDCS, Neurofeedback, JPMR), FEEL 2026 thought leadership, `@hamda.zubair` digital advocacy, and detailed cards for each session offering. Clicking **Choose This Session** or **Book a Session with Hamda** pre-selects that session and navigates directly to the **Book Consultation** page.
  2. **Page 2 — Book Consultation (3-Step Wizard)**:
     - **Step 1: Choose the Session**: Interactive cards to pick the session type, duration, fee (`₹1,000`–`₹1,800`), and modality (`Video` or `Audio`), then proceed to Step 2.
     - **Step 2: Details for Confirmation, Reminder Sending & Recording Data**: Clean form capturing Full Name, Email Address, WhatsApp / Phone Number for reminders, Calendar Date, Time Slot (synced with Hamda's published availability), and Concern Focus / Session Notes, with a live preview of the confirmation & reminder schedule.
     - **Step 3: Payment Session (QR Code, UPI & Bank Details)**: Displays an interactive payment studio with tabs/cards for **Scan UPI QR Code**, **UPI ID (`hamdazubair@okaxis` with one-click copy)**, and **Bank Account Transfer Details (Account Name, Account Number, IFSC, Bank Branch)**, plus a **UTR / Payment Reference Number** input to confirm the booking, trigger automated confirmation/24h/1h reminder dispatches, and offer `.ics` calendar download or instant Video Consultation launch.
  3. **Page 3 — Manage Appointments**: Dedicated workspace with a Customer / Doctor (Admin) view switcher, upcoming and past appointments list, live WebRTC Video Consultation room launcher (with 4-7-8 breathing pacer and background-encrypted notes), reschedule/cancel controls, dispatched reminder message log, and personal session notes.
  4. **Page 4 — Calendar & Reminders**: Dedicated workspace to customize the 3 automated message templates (Instant Confirmation, 24-Hour Reminder, 1-Hour Room Link Reminder), toggle Email and WhatsApp/SMS channels, and publish or remove custom consultation slots on Hamda's calendar.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm, unhurried clinical sanctuary combining organic linen textures, sunlit botanical illustrations, and editorial typography.
  - *Color Palette & Mood*:
    - Dominant Neutral Canvas (60%): Warm Alabaster & Soft Linen (`#F8F6F1`, `#F4EFE6`)
    - Structural Surfaces (30%): Crisp Ivory Cards (`#FFFFFF`) and Warm Sand/Beige Accent Panels (`#EFE9DE`, `#E8E0D2`) with subtle hairline borders (`#E2DDD3`)
    - Primary Accent (10%): Deep Botanical Pine (`#234E3E`) and Muted Plum/Sage highlights (`#4A3B52`) harmonizing with Hamda's portrait
  - *Typography & Hierarchy*: `Cormorant Garamond` for editorial headings (`clamp(2.25rem, 4vw, 3.5rem)` with `text-wrap: balance`), `Plus Jakarta Sans` for crisp body copy and controls, and `JetBrains Mono` (`tabular-nums`) for fees, dates, room codes, UPI IDs, and UTR references.
  - *Mobile Alignment & Layout*: In the Hero section and Portfolio card, action buttons and contact items (`hamda.connect@gmail.com` and `@hamda.zubair`) use `flex-col items-start sm:flex-row sm:items-center` with full-width mobile buttons (`w-full sm:w-auto justify-center`) so nothing gets pushed or clipped to the right on narrow viewports.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dedicated 4-Page Navigation Architecture**
  - *Chosen Approach*: Split `activePage` into four distinct top-level routes/views (`portfolio`, `book`, `appointments`, `calendar`) with automatic scroll-to-top on page transition.
  - *Why*: Gives each core task—reading Hamda's portfolio, completing the 3-step booking wizard, managing appointments, and configuring calendar/reminders—a focused, spacious canvas without overwhelming the user.
- **Decision 2: Direct QR Code, UPI ID & Bank Transfer Step with UTR Recording**
  - *Chosen Approach*: Step 3 of the booking wizard displays a high-contrast UPI QR code (encoded with standard `upi://pay` parameters for exact session fee and payee), copyable UPI ID, and full bank transfer details alongside a UTR / Reference input field.
  - *Why*: Matches Indian clinical practice workflows where clients pay directly via GPay/PhonePe/Paytm QR or NEFT/IMPS and enter their 12-digit UTR or transaction reference for instant confirmation and record keeping.
- **Decision 3: Profile Photo Integration & Custom Photo Uploader**
  - *Chosen Approach*: Render Hamda Zubair's portrait prominently in the Hero Profile Card (referencing her lavender hijab and deep plum graduation attire portrait aesthetic, plus allowing the user/admin to pick or drop their local `images (1).jpeg` file to persist in `localStorage` for exact pixel-perfect display across refreshes).
  - *Why*: Ensures the portrait always displays with zero broken images while letting the user lock in the exact uploaded JPEG file if desired.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌────────────────────────────────────────────────────────────────────────────┐
│                   Top Navigation Bar (3-Zone Contract)                     │
│  [Hamda Zubair]  ──  [Portfolio & Sessions | Book Consultation |           │
│                       Manage Appointments | Calendar & Reminders]  ── CTA  │
└───────────────────┬──────────────────┬──────────────────┬──────────────────┘
                    │                  │                  │
      ┌─────────────▼────┐   ┌─────────▼────────┐   ┌─────▼────────────┐
      │ Page 1:          │   │ Page 2:          │   │ Pages 3 & 4:     │
      │ Portfolio &      │   │ Book Consultation│   │ Appointments &   │
      │ Sessions         │   │ (3-Step Wizard)  │   │ Calendar Studio  │
      ├──────────────────┤   ├──────────────────┤   ├──────────────────┤
      │ • Hero Split +   │   │ • Step 1: Choose │   │ • Customer/Admin │
      │   Mobile-Aligned │   │   Session & Mode │   │   Appointments   │
      │   CTAs & Contact │   │ • Step 2: Client │   │ • WebRTC Video   │
      │ • Hamda Portrait │   │   Details, Date, │   │   Consultation   │
      │   Photo Card     │   │   Time & Notes   │   │ • Background AES │
      │ • Soothing Beige │   │ • Step 3: QR,    │   │   Session Notes  │
      │   Sanctuary Art  │   │   UPI, Bank &    │   │ • Calendar Slots │
      │ • Session Cards  │──►│   UTR Reference  │──►│   & Reminder     │
      │   (Jump to Book) │   │   Confirmation   │   │   Message Setups │
      └──────────────────┘   └──────────────────┘   └──────────────────┘
```

- **Data Model & State**:
  - `activePage`: `'portfolio' | 'book' | 'appointments' | 'calendar'`
  - `bookingStep`: `1 | 2 | 3` inside the **Book Consultation** page, with step validation before advancing and a confirmation summary view upon completing Step 3.
  - `AppointmentRecord`: Stores `appointmentId`, `clientId`, `clientName`, `clientEmail`, `clientPhone`, `sessionDate`, `sessionTime`, `sessionType`, `durationMinutes`, `amountInr`, `paymentMethod` (`'qr_upi' | 'upi_id' | 'bank_transfer'`), `paymentReference` (UTR / reference number), `concernFocus`, `clientNotes`, `meetingRoomCode`, and reminder status.
- **Interactive Component & State Mapping**:
  - Selecting any session card on **Portfolio & Sessions** sets `selectedOfferingId`, resets `bookingStep` to `1` (or `2` if continuing directly), and switches `activePage` to `'book'`.
  - Advancing from Step 1 → Step 2 → Step 3 preserves all chosen session and client reminder parameters, and submitting Step 3 creates the `AppointmentRecord` and three automated `EmailDispatchDoc` entries (Instant Confirmation, 24h Reminder, 1h Reminder) using the configured templates.
