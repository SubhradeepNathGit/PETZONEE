🐾 Poshik – Pet Social Media & Services Platform

Poshik is a digital hub for pet lovers — combining social networking, pet services, and e-commerce into one platform.
Users can create pet profiles, connect with other owners, share updates, book vet appointments, shop pet products, and make secure payments — all in one app.

✨ Features
👤 Authentication & User Management

Supabase Auth (Email + Social Login)

User profiles (owner, vet, pet shop)

KYC verification with document uploads

🐶 Pet Profiles

Create & edit pet details (name, breed, age, vaccinations)

Upload pet photos (Supabase Storage)

Link pets with owner profiles

📸 Social Feed

Post updates (text, images)

Like, comment, share

Real-time feed updates with Supabase Realtime

Follow other pets/owners

📍 Discovery (Nearby Pets)

Location-based pet discovery

Map view with Leaflet + OpenStreetMap

Filters by breed, age, pet type

🏥 Veterinary Appointments

Book vet appointments

Calendar scheduling (conflict prevention)

Notifications for upcoming visits

🛒 Marketplace

Browse products & services (food, accessories, grooming, medicines)

Cart & checkout with Stripe

Order tracking

💳 Payments (Stripe)

One-time payments for products & appointments

Store transaction history in Supabase

Stripe Connect for vets & pet shops

🔔 Notifications

In-app realtime notifications (likes, comments, bookings)

Email notifications (appointments, payments)

🛠️ Tech Stack
Frontend

Next.js 15
 (App Router)

Tailwind CSS
 + Shadcn/ui

Framer Motion
 + GSAP
 (animations)

React Hook Form
 (forms & validation)

Redux Toolkit
 (state management)

TanStack Query
 (server state & caching)

Lucide Icons
 / Heroicons

Leaflet.js
 + OpenStreetMap (maps)

Backend

Supabase
 (Auth, DB, Storage, Realtime, Functions)

Stripe
 (Payments & Connect)

📂 Project Structure
poshik/
├── app/                 # Next.js App Router
│   ├── (auth)/          # Auth pages (login, signup, KYC)
│   ├── (dashboard)/     # User dashboard
│   ├── (social)/        # Feed, posts, comments
│   ├── (pets)/          # Pet profiles
│   ├── (marketplace)/   # E-commerce pages
│   ├── (appointments)/  # Vet booking system
│   ├── api/             # Next.js API routes (Stripe, webhooks)
│   └── layout.tsx
│
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/                 # Supabase client, utils, config
├── redux/               # Redux slices & store
├── public/              # Static assets
├── styles/              # Global styles
├── utils/               # Helpers & constants
│
├── .env.local           # Environment variables
├── package.json
└── README.md

⚡ Installation & Setup

Clone Repo

git clone https://github.com/your-username/poshik.git
cd poshik


Install Dependencies

npm install


Environment Variables
Create .env.local with:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key


Run Dev Server

npm run dev

🚀 Deployment

Vercel → Frontend & Next.js API routes

Supabase → Auth, DB, Storage, Realtime

Stripe → Payments & Webhooks

📌 Roadmap

✅ Social feed

✅ Pet profiles

✅ Vet appointments

✅ Marketplace with Stripe

🔜 Wallet / Reward credits

🔜 AI-powered pet health suggestions

🤝 Contributing

Contributions welcome! Fork the repo & submit a PR 🚀

📜 License

MIT License © 2025 [Subhradeep Nath]
