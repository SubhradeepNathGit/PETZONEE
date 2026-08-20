# PETZONEE

> A comprehensive, enterprise-grade Pet Care Ecosystem offering advanced Telemedicine, eCommerce, Social Networking, and Multi-Role Management with Real-Time Capabilities.

## Overview
PETZONEE is a highly sophisticated, multi-tenant platform designed to revolutionize the pet care industry. Built with a robust **Next.js 14 App Router** architecture and backed by a powerful **PostgreSQL** database with Edge Functions, it seamlessly integrates Veterinary Telemedicine, an e-commerce Pet Shop, an interactive Pet Social Feed, and a Subscription Membership model. The system provides three distinct, specialized portals for **Users (Pet Owners)**, **Veterinarians**, and **Administrators**, all woven together with real-time bidirectional communication, rich analytics, and a premium user interface powered by Framer Motion and Tailwind CSS.

---

## Exhaustive Feature List & Workflows

### 1. Multi-Role Dashboard Ecosystem
The platform utilizes an intelligent routing and role-based access control (RBAC) mechanism. Upon login, the system evaluates the user's role and dynamically serves one of three vastly different, highly-specialized environments.

#### A. The User (Pet Owner) Portal
A premium, personalized gateway for pet owners to manage every aspect of their pet's life.
- **Dynamic Welcome & Avatar Picker:** Personalized greetings and avatar uploads stored securely in scalable cloud storage buckets.
- **Membership & Subscription Management:** 
  - Real-time display of active membership plans (e.g., *Premium Care*, *Complete Care*).
  - Tracks and enforces benefits like "Unlimited Consults," "4 Free Consults," or "1+1 Free".
  - Calculates and applies global discounts (5% to 25% Off) across the shop based on tier.
  - Automated expiration warnings and renewal prompts via pulse notifications.
- **My Pets (Deep Pet Profiles & Gallery):**
  - **Pet Bios & Physical Stats:** Create and manage profiles with detailed information like Weight, Age, Breed, and Medical Notes.
  - **Interactive Lightbox Gallery:** Upload daily snapshots to a pet's gallery, featuring a cinematic Lightbox UI with next/previous navigation.
  - **Timeline Chips:** Automatically track "Joined Date" and "Birthday" markers.
  - **Custom Cover & Avatars:** Dynamic overlapping UI mimicking modern social networks.
- **Appointment Hub & Booking Workflow:**
  - **Booking Interface:** An intuitive 4-step wizard with an interactive Calendar, Time Slot Picker, and hoverable Doctor Cards revealing Professional Bios and Experience.
  - **Automated Free Logic:** Displays pulsing "FREE FIRST VISIT" tags or "MEMBERSHIP CREDIT" tags depending on user history.
  - **Management Console:** Complete history of *Active Consultations* and *Past Records*. Actionable buttons to reschedule, complete, or terminate/cancel slots with a secure warning modal.
- **eCommerce & Orders Console (Shipment Tracking):**
  - Track live logistics statuses (Processing, Shipped, Delivered, Returned) through animated progress bars.
  - Return window logic (auto-disabled after 7 days post-delivery).
  - Dynamic **Printable Invoices** (A4 format) featuring automated 18% GST calculation, shipping fees, and granular order breakdowns.
  - **Loyalty Program:** Earn 10 PETZ points on every purchase above ₹500, displayed in a dynamic rewards widget.

#### B. The Veterinarian (Vet OS) Dashboard
A comprehensive Practice Management System (PMS) tailored for modern veterinarians.
- **Automated KYC & Onboarding Pipeline:**
  - Secure document uploads (Medical License, Identity Proof).
  - Real-time approval status tracking (Pending Review, Approved, Rejected).
  - System gating: Vets cannot access core features until KYC is approved by an Admin.
- **Financial & Revenue Tracking:**
  - Real-time earnings dashboard with localized currency formatting (INR).
  - Historical payout tracking and balance ledgers.
- **Electronic Medical Records (EMR) & Patient Management:**
  - Digital prescription generation with PDF export capabilities.
  - Patient history tracking, consultation notes, and diagnosis input.
- **Appointment & Schedule Matrix:**
  - Accept, decline, or reschedule incoming user appointments.
  - Set custom consultation fees and dynamic availability slots.

#### C. The Administrator Command Center
A centralized control panel for platform administrators to monitor, manage, and scale the ecosystem.
- **Real-time Analytics Engine:**
  - Powered by Recharts for visual data representation.
  - Live revenue metrics, conversion rates, and active user counts.
- **Vet KYC Verification Console:**
  - Admins can view submitted documents, verify licenses, and approve/reject vet accounts in real-time.
- **Inventory & E-commerce Management:**
  - Full CRUD operations for pet shop products.
  - Stock level alerts, category management, and pricing control.
- **Order Fulfillment & Logistics:**
  - Advance order states (Processing -> Shipped -> Delivered).
  - Manage user returns and initiate refunds.
- **Global User Management:**
  - Monitor all registered users, reset passwords, and manage subscription statuses.

---

### 2. Daily News Feed (Social Component)
A highly interactive social network for pets, enabling users to engage with community activity in real-time.
- **Activity Tracking Engine:** Automatically logs events such as `pet.created`, `pet.media_added`, and `user.avatar_updated`.
- **Engagement Mechanics:**
  - Like system (`activity_likes`) with dynamic counters.
  - Nested threaded comments (`activity_comments`) allowing users to reply, edit, and delete their thoughts.
- **Infinite Scrolling:** Powered by the `IntersectionObserver` API for buttery-smooth pagination.
- **Live Feed Rendering:** WebSocket connections instantly push new posts and likes to the feed without manual refreshes.

---

### 3. Real-Time Communication Layer
The platform is equipped with an incredibly fast, highly interactive messaging system bridging all three roles.
- **Global Chat Widget (Support Chat):**
  - A glassmorphic, floating widget accessible globally on the site.
  - **User-to-Admin Communication:** Users can request help, and admins can reply instantly.
  - Real-time database listeners ensure instant message delivery without polling.
  - **Quick Replies:** Context-aware quick actions ("Checking appointment status", "Emergency service inquiry").
- **Dedicated User ↔ Vet Chat (Consultation Chat):**
  - A full-screen, split-pane chat interface similar to WhatsApp Web.
  - Secure file sharing (Images, PDFs, Docs) up to 50KB limit, utilizing scalable cloud storage.
  - Read receipts (Single tick, Double tick colored).
  - **Conversation Lifecycle:** Vets or Admins can mark a conversation as "Resolved/Closed", which locks the chat and displays a distinct "Transmission Closed" UI to the user.
  - Archive and Purge features for Vets to manage their inbox.

---

### 4. Advanced E-Commerce & Checkout
A high-conversion shop built for pet supplies.
- **Guest to Authenticated Cart Merging:** If a user shops as a guest and logs in, their cart automatically merges using local storage syncing.
- **Dynamic Tax & Shipping Calculations:** 
  - Standard Delivery (Free) vs. Express Delivery (₹99).
  - 18% GST calculation applied dynamically at checkout.
- **Membership Discounts:** Instantly deducts percentage totals if a user possesses an active subscription.
- **Stripe Payment Gateway:** Fully integrated with Stripe Webhooks (`/api/checkout/stripe`) for secure credit card and local payment processing.

---

### 5. Discover Feature (Geolocation & Map Integration)
An interactive community discovery tool located at `/map` allowing users to find nearby pets and owners.
- **How it works:** 
  - **Map Engine:** Powered by **React Leaflet** with premium dark-mode tiles from **CARTO** layered over OpenStreetMap.
  - **Relational Data Mapping:** Performs complex database joins between the `pets` and `users` tables to simultaneously fetch pet avatars, breeds, and owner coordinates.
  - **Geolocation API:** Uses the browser's native `navigator.geolocation` API for the "Locate Me" feature, smoothly flying the map to the user's real-time physical coordinates.
  - **Dynamic Markers & UI:** Generates custom CSS-based map markers for each pet, with interactive glassmorphic popups styled with Tailwind CSS and Framer Motion.

---

## Frontend System Design Deep Dive

### Real-Time Chat Architecture
The bidirectional messaging infrastructure relies on an event-driven architecture using PostgreSQL and WebSockets:
- **Database Schema:** Chat data is normalized into two core tables: `conversations` (managing metadata, participants, and lifecycle states like 'active' vs 'resolved') and `conversation_messages` (storing the actual payload, timestamps, and sender IDs).
- **WebSocket Subscriptions:** The frontend utilizes `postgres_changes` event listeners to subscribe to `INSERT` and `UPDATE` events on the messages table. When a payload is pushed to the database, the edge function immediately broadcasts the delta over the active WebSocket channel to the client, triggering an optimistic UI update without costly HTTP polling.
- **State Synchronization:** Global state is managed dynamically. When a Vet resolves a chat, the state change updates the `conversations` table, which triggers a real-time broadcast to lock the user's input field and render a "Transmission Closed" state instantly.

### Multi-Pet Profile Management
The ecosystem handles an arbitrary N:1 relationship between pets and users efficiently:
- **Relational Integrity:** The `pets` table holds a foreign key `owner_id` mapped strictly to the `users` table. This allows users to hold multiple, distinct pet profiles simultaneously.
- **Media Segregation:** Each pet profile is tied to a one-to-many `pet_media` table via a `pet_id` foreign key. This ensures that the lightbox gallery specifically queries photos belonging to the target pet rather than mingling all user media in a single bucket.
- **Row Level Security (RLS):** Database policies are constructed utilizing `auth.uid() = owner_id`. This strict gateway ensures that a user can `SELECT`, `UPDATE`, or `DELETE` only their associated pet records and related media rows. Attempting to fetch another user's pet profile forcefully yields zero rows at the database level.

---

## Technical Architecture & Stack

### Frontend Architecture
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict typing for robust state management)
- **Styling:** Tailwind CSS + Vanilla CSS Modules for extreme customization.
- **Animations:** Framer Motion (Page transitions, micro-interactions, modal popups, dragging widgets).
- **Icons:** Lucide React
- **Toast Notifications:** React Hot Toast / React Toastify for transient success/error states.

### Backend & Database Infrastructure
- **Database:** PostgreSQL accessed via robust Edge Functions.
- **Authentication:** Secure Email/Password, OAuth, and Role-based JWT authentication.
- **Real-time:** WebSocket connections for Chat, Social Feed updates, and Live Order Tracking.
- **Storage:** Secure Cloud Storage buckets (`chat-attachments`, `avatars`, `pet-media`, `product-images`, `kyc-documents`).
- **Database Schema:** Complex relational mapping (Users, Veterinarians, Orders, Order Items, Appointments, Conversations, Activities, Activity Likes, Activity Comments).

### API & Webhooks
- **Stripe API:** Handles payment intents and subscription lifecycle webhooks.

---

## UI/UX Design Philosophy
PETZONEE breaks away from standard, boring dashboard templates. It employs:
- **Glassmorphism & Backdrop Blurs:** Deeply integrated translucent panels mimicking frosted glass.
- **Dark Mode First with Vibrant Accents:** Jet black backgrounds with striking Orange (#f97316), Emerald, and Blue accent gradients.
- **Micro-Animations:** Hover lifts, pulsing online indicators, typing indicators, and animated progress bars for shipping tracking.
- **Print-Specific Styling:** CSS media queries (`@media print`) explicitly designed to strip dark mode and render crisp, professional, white-background A4 invoices.

---

## Setup & Installation

### Prerequisites
- Node.js 18.x or higher
- A PostgreSQL database instance with Edge Functions and WebSocket support enabled
- A Stripe Account

### Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=your_backend_api_url
NEXT_PUBLIC_ANON_KEY=your_backend_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Installation Steps
1. **Clone the repository**
   ```bash
   git clone https://github.com/SubhradeepNath/PETZONEE.git
   cd PETZONEE
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run the development server**
   ```bash
   npm run dev
   ```
4. **Build for production**
   ```bash
   npm run build
   ```

---

## Security & Privacy
- **Row Level Security (RLS):** Enforced at the PostgreSQL database layer. Users can only read/write their own chat messages, orders, and pets. Vets can only access their patients. Admins have global access.
- **Input Validation:** Strict TypeScript interfaces preventing malformed data injection.
- **Secure File Uploads:** Storage limits (50KB for chat) and MIME type validation to prevent malicious payload uploads.

---

Developed by Subhradeep Nath from scratch to production.
