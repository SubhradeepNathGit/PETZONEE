# 🐾 PETZONEE - The Complete Pet Care Ecosystem (2026 Edition)

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Redux](https://img.shields.io/badge/Redux-Toolkit-764ABC?logo=redux)](https://redux.js.org/)
[![GSAP](https://img.shields.io/badge/GSAP-Animations-88CE02?logo=greensock)](https://greensock.com/gsap/)

> **PETZONEE** is an expansive, enterprise-grade Next.js application designed to be the ultimate digital home for pet owners, veterinarians, and administrators. It transcends standard pet applications by merging a **Social Media Engine** for pets, a high-performance **E-Commerce Store**, and a sophisticated **Medical Operating System** for vets into a single, seamless platform powered by real-time infrastructure.

---

## 📖 The Vast Architecture Manual (Table of Contents)

1.  [The Core Infrastructure](#1-the-core-infrastructure)
2.  [Feature Matrix: The Social Media Engine](#2-feature-matrix-the-social-media-engine)
3.  [Feature Matrix: The E-Commerce Suite](#3-feature-matrix-the-e-commerce-suite)
4.  [Feature Matrix: The Tri-Portal Dashboards (User, Vet, Admin)](#4-feature-matrix-the-tri-portal-dashboards-user-vet-admin)
5.  [Real-Time Communication Layer](#5-real-time-communication-layer)
6.  [Advanced UI & Animation Engineering](#6-advanced-ui--animation-engineering)
7.  [Installation & 2026 Testing Guide](#7-installation--2026-testing-guide)
8.  [Database Schema & Edge Logic](#8-database-schema--edge-logic)

---

## 1. The Core Infrastructure

PETZONEE is built upon an uncompromising, modern technology stack:

- **Next.js 15 (App Router & Turbopack)**: Utilizes React Server Components (RSC) heavily for data fetching that doesn't bloat the client bundle. The hybrid rendering approach allows the social feeds to be dynamic while the marketing pages remain static and blazing fast.
- **Tailwind CSS 4**: Implemented for complex, utility-first styling. We leverage the new v4 engine for minimal CSS payload and maximum design token flexibility (e.g., custom glassmorphism, precise blur utilities).
- **Supabase (PostgreSQL Backend)**: Acts as the absolute source of truth. It handles OAuth/Email authentication, Row Level Security (RLS), and complex relational data (users -> pets -> posts -> orders -> medical records).
- **State Symphony**: 
  - **Redux Toolkit**: Manages synchronous, ephemeral client state (e.g., Cart UI state, active modal windows).
  - **TanStack React Query**: Handles the heavy lifting of server-state synchronization (e.g., fetching products, caching feed posts, optimistically updating likes).

---

## 2. Feature Matrix: The Social Media Engine

PETZONEE provides a full-fledged social networking experience tailored exclusively for pets.

### 🐕 Multiple Pet Profiles ("The Digital Kennel")
Users are not limited to a single entity. Using the **Pet Creation Wizard** (`src/app/pets/new`), users can spawn multiple, distinct profiles for each of their pets. 
- **Data Model**: Each pet has an avatar, breed data, age, weight, and specific medical identifiers.
- **Switching Context**: The UI allows users to dynamically switch which pet they are currently "acting as" before posting to the global feed or booking an appointment.

### 📸 The Global Feed (`src/app/feed`)
A highly optimized, infinitely scrolling social feed where pets are the stars.
- **Post Construction**: Users can share status updates, images, and milestones.
- **Engagement Mechanics**: Includes polymorphic relations in the database to allow "Liking", "Commenting", and "Sharing" posts.
- **Optimistic Updates**: Powered by React Query, when a user likes a post, the UI updates instantly without waiting for the Supabase network round-trip, falling back gracefully if the server request fails.

---

## 3. Feature Matrix: The E-Commerce Suite

A complete, production-ready shopping workflow designed to sell premium pet food, accessories, and grooming kits.

### 🛍️ The Storefront
- **Advanced Filtering**: The catalog (`src/app/products`) uses complex URL search parameter state to filter by category, price, and relevance.
- **Product Details Page (PDP)**: Features high-res image galleries, rich text descriptions, and dynamically calculated review aggregates.

### 🛒 The Cart & Checkout Engine
- **Persistent Cart Engine**: The cart state is managed via Redux but synchronized with Supabase. If a user logs out and logs in on another device, their cart is magically restored.
- **Dynamic Tax Engine**: The Checkout (`src/app/checkout`) automatically computes dynamic sub-totals, calculating precision SGST (9%) and CGST (9%) on physical goods.
- **Subscription Modifiers**: If a user holds an active **Care Plan Subscription**, the checkout engine detects it and automatically injects a percentage discount (e.g., 25% for Premium Care) across the entire order logic.
- **Omni-Payment Gateway**: Integrates logic for Credit Cards, UPI (with popular App quick-selects), NetBanking, and Wallet simulations.

---

## 4. Feature Matrix: The Tri-Portal Dashboards (User, Vet, Admin)

Authentication routes users dynamically to highly specialized control centers based on their exact role in the Supra-system.

### 🧑‍💻 The User Portal (`src/components/portal/UserDashboard.tsx`)
- **Subscription Management**: Tracks active "Complete Care" or "Premium Care" plans, displaying days until expiration and automated renewal paths.
- **Unified Actions**: Allows the user to spawn into the E-commerce Orders View to track shipping, dive into the Appointments view to see upcoming clinic visits, or manage their Pet Profiles from one command center.

### 🩺 The Vet OS (`src/components/portal/VetDashboard.tsx`)
This is a massive, highly complex (80KB+) interface designed for real medical professionals.
- **Patient Management System**: Vets can pull up specific pets via their ID.
- **EMR (Electronic Medical Records)**: Vets can write permanent prescriptions, document vaccination histories, and update clinical notes.
- **Schedule Matrix**: A customized calendar view handling incoming appointment requests, allowing vets to Accept, Reschedule, or Deny based on clinic capacity.

### 👑 The Admin Dashboard (`src/components/portal/AdminDashboard.tsx`)
The absolute top-level view of the PETZONEE ecosystem.
- **System Telemetry**: Tracks total active users, Gross Merchandise Value (GMV) of products sold, and active veterinary professionals.
- **Content Moderation**: Allows admins to oversee the Social Feed and ban/restrict abusive user accounts.
- **Vendor & Inventory Management**: Directly hooks into the `products` table, allowing rapid price adjustments and stock management.

---

## 5. Real-Time Communication Layer

Under the hood, PETZONEE utilizes **Supabase Channels** (WebSockets) to ensure the platform feels "alive."

- **The Global Chat Widget (`src/components/chat/GlobalChatWidget.tsx`)**: An interactive, floating orb available on all pages. 
  - Allows direct communication between users and the Admin/Support team.
  - Supports image/document uploads via Supabase Storage.
  - Generates instant notifications using PostgreSQL Triggers when a support ticket status changes.
- **Smart Notification Drawer (`src/components/NotificationDrawer.tsx`)**: Real-time push notifications alert users when their order ships, a Vet approves their appointment, or someone likes their pet's feed post.

---

## 6. Advanced UI & Animation Engineering

A project of this scale requires a premium aesthetic, achieved through two specific libraries:

- **Framer Motion**: Used across the Dashboards and Checkout flow for layout animations. When lists re-order (e.g., dragging items, deleting a cart item), Framer Motion ensures the DOM transitions with smooth, spring-based physics.
- **GSAP (GreenSock)**: The engine behind the spectacular Landing Page (`src/app/page.tsx`). We utilize `ScrollTrigger` to orchestrate massive SVG path animations, fading text reveal operations, and parallax marquee banners to ensure an unforgettable first impression.

---

## 7. Installation & 2026 Testing Guide

### Core Prerequisites
- Node.js LTS (v20+)
- Verified Supabase Account
- PostgreSQL GUI (optional, for direct data viewing)

### Technical Initialization
1.  **Clone the Construct**
    ```bash
    git clone https://github.com/SubhradeepNathGit/Product-CRUD.git
    cd PETZONEE
    ```
2.  **Pull Dependencies**
    ```bash
    npm install
    ```
3.  **Environment Integration**
    Create a `.env.local` file at the root level.
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_project_anon_key
    ```
4.  **Initiate Development Sequence**
    ```bash
    npm run dev
    # Runs the Next.js Turbopack compiler
    ```

### The "Deep Test" Walkthrough for Recruiters
To truly evaluate this system, please perform the following sequence:

1.  **User Genesis**: Sign up using a fresh email.
2.  **Pet Creation**: Navigate to the Dashboard -> Manage Pets -> "Add Pet". Create a profile.
3.  **Social Connectivity**: Go to the Global Feed and write a post as your new pet.
4.  **The Commerce Flow**: Navigate to Products -> Add to Cart -> Proceed to Checkout -> Observe the GST Tax Logic.
5.  **Role Escalation (Optional)**: If testing Vet/Admin features, manually alter your user row in Supabase (`auth.users` -> `role`) to "admin" or "vet" to unlock the specialized Dashboards upon refresh!

---

## 8. Database Schema & Edge Logic

The PostgreSQL database relies heavily on relational mapping and Row Level Security (RLS). 

*Core Tables:*
- `users`: Extending `auth.users` with KYC data, Stripe IDs, and specific Site Roles.
- `pets`: Linked directly to `owner_id` (foreign key to `users`), containing species, breed, medical hashes.
- `feed_posts`: Poly-linked to `pets.id` (Author) and `users.id` (Uploader).
- `appointments`: Mapping `user_id` <--> `vet_id` <--> `pet_id` governed by timestamp limits.
- `orders` & `order_items`: A classic snapshot architecture ensuring past orders retain exact pricing even if master product prices change.

---

<p align="center">
  System Engineered by <a href="https://github.com/SubhradeepNathGit">Subhradeep Nath</a>
</p>
