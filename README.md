# 🐾 PETZONEE - The Complete Pet Care Ecosystem (2026 Edition)

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![React Query](https://img.shields.io/badge/React_Query-5.0-FF4154?logo=react-query)](https://tanstack.com/query/latest)
[![GSAP](https://img.shields.io/badge/GSAP-Animations-88CE02?logo=greensock)](https://greensock.com/gsap/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-008CDD?logo=stripe)](https://stripe.com/)

> **PETZONEE** is an expansive, enterprise-grade Next.js application designed to be the ultimate digital home for pet owners, veterinarians, and administrators. It transcends standard pet applications by merging a **Social Media Engine** for pets, a high-performance **E-Commerce Store**, a sophisticated **Medical Operating System** for vets, and a **Real-Time Discovery Map** into a single, seamless platform powered by cutting-edge infrastructure.

---

## 📖 Comprehensive Documentation

1. [Core Infrastructure](#1-core-infrastructure)
2. [Project Architecture & File Mapping](#2-project-architecture--file-mapping)
3. [Feature Matrix & Workflows](#3-feature-matrix--workflows)
4. [Advanced Technical Implementations](#4-advanced-technical-implementations)
5. [Installation & Setup Guide](#5-installation--setup-guide)
6. [Database Schema Overview](#6-database-schema-overview)

---

## 1. Core Infrastructure

PETZONEE is built upon an uncompromising, modern technology stack ensuring scalability, security, and blazing-fast performance.

- **Frontend**: Next.js 15 (App Router, Turbopack, React Server Components).
- **Styling & UI**: Tailwind CSS v4, Framer Motion, and GSAP for state-of-the-art animations.
- **State Management**: TanStack React Query (for server state & caching) and Context/Local State for ephemeral UI state.
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Real-Time Channels).
- **Payments**: Stripe Integration.
- **Mapping**: React Leaflet for geolocation services.

---

## 2. Project Architecture & File Mapping

The repository follows a strictly modular, feature-based directory structure inside the `src` folder.

### 📂 `src/app` (Next.js App Router)
The routing engine powering all application pages and API endpoints.
- **`/admin`**: The absolute top-level view of PETZONEE.
  - Submodules: `inventory`, `kyc`, `messages`, `orders`, `payments`, `subscriptions`, `users`, `vets`.
- **`/api`**: Serverless edge routes.
  - `/checkout`: Stripe checkout session initialization.
  - `/webhooks`: Asynchronous event processing for Stripe payments and DB triggers.
- **`/appointments`**: Appointment booking flow with vets.
- **`/cart` & `/checkout`**: Full E-Commerce workflow (Guest cart merging, tax calculation, checkout UI, `processing`, `success`, `plan-success`).
- **`/contactUs`**: Support and outreach form handling.
- **`/dashboard`**: The generalized User Portal for subscription and order tracking.
- **`/delete`**: Account or entity deletion workflows.
- **`/feed`**: The core Social Media Engine feed (infinite scrolling).
- **`/homeComponents`**: Highly modular landing page pieces (`about.tsx`, `banner.tsx`, `faq.tsx`, `mark.tsx`, `marquee.tsx`, `offer.tsx`, `pricing.tsx`, `products.tsx`, `services.tsx`, `stats.tsx`, `team.tsx`, `testimonials.tsx`).
- **`/kyc-pending`**: Regulatory holding page for Vet onboarding.
- **`/map`**: Discovery engine utilizing Leaflet to find nearby clinics or events.
- **`/pets`**: The "Digital Kennel" (`[id]` for viewing, `new` for pet creation).
- **`/products`**: The E-commerce storefront and Product Details Page (PDP, `[id]`).
- **`/reset-password` & `/signup`**: Supabase authentication workflows.
- **`/vet`**: The Vet OS (Patient Management System & EMR).
- **`layout.tsx` & `ClientLayout.tsx`**: Global wrapper injecting providers and global UI elements.
- **`tanstackProvider.tsx`**: React Query client initialization.

### 📂 `src/components` (Reusable UI Elements)
- **`/admin`, `/portal`, `/products`, `/chat`, `/ui`**: Domain-specific UI fragments.
- **`NotificationDrawer.tsx`**: Real-time push notification sliding panel.
- **`navbar.tsx` & `footer.tsx`**: Master navigation layouts with dynamic states (e.g., auth, cart counts).
- **`ScrolltoTop.tsx` & `SpinnerLoader.tsx`**: Utility UX enhancers.

### 📂 `src/lib` (Core Utilities)
- **`supabase.ts` & `supabaseAdmin.ts`**: Client and Service Role initializers for the database.
- **`utils.ts`**: Shared helper functions (class merging, formatting).
- **`chartjs.ts`**: Configuration for analytics dashboards.

### 📂 `src/types`
- **`product.ts`**: TypeScript definitions enforcing strict data contracts across the codebase.

---

## 3. Feature Matrix & Workflows

### 🐕 The Social Media Engine
A full-fledged social networking experience tailored exclusively for pets.
- **Multiple Pet Profiles**: Create distinct profiles per pet with custom avatars, medical stats, and breeds (`src/app/pets`).
- **The Global Feed** (`/feed`): Share status updates, images, and milestones.
- **Engagement Mechanics**: Polymorphic relations allowing "Liking", "Commenting", and "Sharing". Optimistic UI updates powered by React Query ensure instant feedback.

### 🛍️ The E-Commerce Suite
A complete, production-ready shopping workflow designed for pet goods.
- **The Storefront** (`/products`): Advanced filtering, PDPs with high-res galleries, and dynamic reviews.
- **Persistent Cart Engine** (`/cart`): Syncs guest carts with Supabase upon login. If a user logs in on another device, their cart is magically restored.
- **Checkout & Taxes** (`/checkout`): Automatically computes sub-totals, calculating precision SGST/CGST.
- **Subscription Discounts**: Active "Care Plan" holders automatically receive injected percentage discounts on their orders.

### 🏥 The Tri-Portal Dashboards
Authentication routes users dynamically based on their Role (User, Vet, Admin).
- **User Portal** (`/dashboard`): Manage subscriptions, track E-commerce orders, handle appointments, and oversee Pet Profiles.
- **Vet OS** (`/vet`): EMR (Electronic Medical Records), clinical notes, and a scheduling matrix to accept/reschedule appointments. Requires KYC approval.
- **Admin Dashboard** (`/admin`): Oversee GMV (Gross Merchandise Value), moderate the social feed, manage inventory, users, vets, and respond to global support tickets.

### 📍 Discovery Map & Appointments
- **Interactive Map** (`/map`): Geolocation-based discovery of nearby veterinary clinics and services.
- **Booking Engine** (`/appointments`): Conflict-free scheduling system mapping users, pets, and vets.

### 💬 Real-Time Communication Layer
- **Global Chat Widget** (`src/components/chat`): Direct WebSocket-powered communication with Support.
- **Smart Notification Drawer** (`NotificationDrawer.tsx`): Real-time alerts for order shipping, appointment approvals, and social engagement.

---

## 4. Advanced Technical Implementations

- **Real-Time Database Listeners**: Supabase Channels (`postgres_changes`) are actively listening in the `navbar.tsx` to update cart counts and notification badges instantaneously without polling.
- **Animation Orchestration**: 
  - *Framer Motion* handles layout transitions, spring-based modal popups, and list re-ordering.
  - *GSAP (ScrollTrigger)* powers the landing page's massive SVG path animations and parallax marquee banners.
- **Edge API & Webhooks**: Stripe webhooks (`/api/webhooks`) are processed securely on edge functions to update order statuses and activate premium subscriptions securely outside of client scope.
- **Guest-to-User Merging Logic**: Deeply embedded logic ensuring a frictionless transition from anonymous browsing to an authenticated buyer.

---

## 5. Installation & Setup Guide

### Core Prerequisites
- Node.js v20+
- Verified Supabase Project
- Stripe Account (for payments)

### Initialization Sequence

1. **Clone the Repository**
   ```bash
   git clone https://github.com/SubhradeepNathGit/Product-CRUD.git
   cd PETZONEE
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file at the root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Launch Development Server**
   ```bash
   npm run dev
   # The Next.js Turbopack compiler will start on http://localhost:3000
   ```

---

## 6. Database Schema Overview

PETZONEE's PostgreSQL database relies heavily on relational mapping and Row Level Security (RLS) for data integrity.

- **`users`**: Extends standard Auth with Role specifications (admin, vet, user), Stripe Customer IDs, and KYC status.
- **`pets`**: Linked to `owner_id` (foreign key to `users`), containing species, breed, and core metadata.
- **`feed_posts`**: Linked to `pets.id` (Author) and `users.id` (Uploader) for social interactions.
- **`appointments`**: Complex mapping of `user_id` ↔ `vet_id` ↔ `pet_id` with strict timestamp validation.
- **`orders` & `order_items`**: Immutable ledger ensuring past orders retain exact pricing regardless of future catalogue changes.
- **`cart`**: Persistent cart synchronizing session data with registered users.
- **`notifications` & `messages`**: Triggers real-time alerts through Supabase Channels.

---

<p align="center">
  <b>System Engineered & Maintained by <a href="https://github.com/SubhradeepNathGit">Subhradeep Nath</a></b><br/>
  <i>Setting the Industry Standard for Pet Care Ecosystems.</i>
</p>
