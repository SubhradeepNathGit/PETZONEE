// pages/vetpage.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, UserCheck, ShieldCheck, CheckCircle2, Star, HeartPulse, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ---------- Data ---------- */
interface ServiceCard {
  id: number;
  title: string;
  description: string;
  image: string;
  alt: string;
}

const services: ServiceCard[] = [
  { id: 1, title: "Dog Checkup", description: "Comprehensive health examinations to ensure your dog stays strong, happy, and healthy throughout their life.", image: "/images/vet1.jpg", alt: "Vet examining dog" },
  { id: 2, title: "Cat Wellness", description: "Gentle, thorough health inspections tailored for your beloved feline companion's unique needs.", image: "/images/vet2.jpg", alt: "Vet examining cat" },
  { id: 3, title: "Advanced Diagnostics", description: "State-of-the-art imaging and diagnostic services to accurately assess and monitor your pet's health.", image: "/images/vet3.jpg", alt: "Vet with X-ray" },
  { id: 4, title: "Dental Care", description: "Professional oral health examinations and treatments to prevent dental issues and improve overall wellness.", image: "/images/vet4.jpg", alt: "Dog dental care" },
  { id: 5, title: "Nutritional Guidance", description: "Expert diet and nutrition plans precisely tailored to your pet's unique lifestyle and health needs.", image: "/images/vet5.jpg", alt: "Vet holding dog" },
  { id: 6, title: "Behavioral Support", description: "Professional training and behavioral support to help pets and owners build stronger, happier bonds.", image: "/images/vet6.jpg", alt: "Vet holding cat" },
];

const plans = [
  {
    title: "Essential Care",
    subtitle: "Perfect for puppies & new pet parents",
    price: { monthly: 1199, yearly: 11990 },
    img: "/images/pricing1.jpg",
    features: ["1 + 1 Free Monthly Consultation", "5% Product Discount", "Basic Health Tracking", "Monthly Pet Care Tips & Guides", "Community Access"],
    popular: false,
    badge: "Starter",
  },
  {
    title: "Complete Care",
    subtitle: "Comprehensive care for active pets",
    price: { monthly: 2999, yearly: 29990 },
    img: "/images/pricing2.jpg",
    features: ["4 Free Monthly Consultations", "15% Product Discount", "Priority Booking", "24/7 Dedicated Vet Chat", "Seasonal Flea & Tick Treatment"],
    popular: true,
    badge: "Most Popular",
  },
  {
    title: "Premium Care",
    subtitle: "Ultimate care for cherished companions",
    price: { monthly: 4999, yearly: 49990 },
    img: "/images/pricing3.jpg",
    features: ["Unlimited Free Consultations", "25% Product Discount", "VIP Spa Treatments", "Priority Emergency Hotline", "Skin Health Analysis"],
    popular: false,
    badge: "Best Value",
  },
];

/* ---------- Animated Counter ---------- */
const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const duration = 2000;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) { setCount(end); clearInterval(timer); }
        else { setCount(Math.floor(start)); }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ---------- Marquee Service Cards ---------- */
const ServiceMarquee = () => {
  // Triplicate for seamless infinite loop
  const allCards = [...services, ...services, ...services];

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-5"
        style={{
          animation: "marquee-scroll 30s linear infinite",
          width: "max-content",
        }}
      >
        {allCards.map((service, index) => (
          <div
            key={`${service.id}-${index}`}
            className="group relative h-[280px] w-[280px] flex-shrink-0 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500"
          >
            {/* Full card image */}
            <Image
              src={service.image}
              alt={service.alt}
              fill
              priority={index < 6}
              sizes="(max-width: 768px) 280px, 300px"
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />

            {/* Always-on subtle dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            {/* Blue tint on hover */}
            <div className="absolute inset-0 bg-[#5F97C9]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

            {/* Text overlay — slides up on hover, premium glass */}
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.22,1,0.36,1] z-20">
              <div className="bg-white/10 backdrop-blur-3xl rounded-3xl border border-white/20 p-5">
                <h3 className="text-white font-bold text-lg leading-tight mb-2 tracking-tight">{service.title}</h3>
                <p className="text-white/90 text-[11px] leading-relaxed font-semibold tracking-wide">{service.description}</p>
              </div>
            </div>

            {/* Always-visible title at bottom (before hover) */}
            <div className="absolute bottom-8 left-8 right-8 group-hover:opacity-0 transition-all duration-300 transform group-hover:-translate-y-2">
              <h3 className="text-white font-bold text-lg tracking-tight">{service.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
      `}</style>
    </div>
  );
};

/* ---------- Flip Pricing Card ---------- */
const FlipPricingCard = ({ plan, index, isYearly, onSelect, currentSub, loadingPlan }: {
  plan: typeof plans[0];
  index: number;
  isYearly: boolean;
  onSelect: () => void;
  currentSub: any;
  loadingPlan: string | null;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const isCurrentPlan = currentSub?.plan_name === plan.title;
  const isHigherTier = useMemo(() => {
    if (!currentSub) return true;
    const tiers = ["Essential Care", "Complete Care", "Premium Care"];
    return tiers.indexOf(plan.title) > tiers.indexOf(currentSub.plan_name);
  }, [currentSub, plan.title]);

  const proratedPrice = useMemo(() => {
    if (!currentSub || isCurrentPlan || !isHigherTier) return null;

    const fullPrice = isYearly ? plan.price.yearly : plan.price.monthly;
    const currentPrice = currentSub.period === 'year' ? currentSub.price : currentSub.price; // Simplified for display

    // Proration logic: (Remaining Days / Total Days) * Original PricePaid
    const now = new Date();
    const start = new Date(currentSub.start_date);
    const end = new Date(currentSub.end_date);
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const remainingDays = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (remainingDays <= 0) return null;

    const credit = Math.max(0, (remainingDays / totalDays) * currentSub.price);
    const finalPrice = Math.max(0, fullPrice - credit);

    return Math.round(finalPrice);
  }, [currentSub, plan, isYearly, isCurrentPlan, isHigherTier]);

  const displayPrice = proratedPrice !== null ? proratedPrice : (isYearly ? plan.price.yearly : plan.price.monthly);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, rotateY: -90 }}
      animate={isInView ? { opacity: 1, rotateY: 0 } : {}}
      transition={{ duration: 1.2, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -12, scale: 1.02, transition: { duration: 0.35, ease: "easeOut" } }}
      className={`relative min-h-[500px] rounded-3xl flex flex-col cursor-pointer ${plan.popular
        ? "bg-gradient-to-b from-[#5F97C9] to-[#3a79b3]"
        : "bg-white/[0.03] border border-white/10 backdrop-blur-xl"
        }`}
    >
      {/* Badge */}
      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.15em] ${plan.popular
        ? "bg-white/20 border-white/30 text-white"
        : "bg-[#5F97C9]/8 border-[#5F97C9]/20 text-[#5F97C9]"
        }`}>
        {plan.badge}
      </div>

      <div className={`p-7 flex-1 flex flex-col ${plan.popular ? "text-white" : "text-white"}`}>
        {/* Title & Subtitle in one line */}
        <div className="mb-6 mt-2 pr-14 flex items-center gap-2 overflow-hidden">
          <h3 className="text-lg font-bold whitespace-nowrap">{plan.title}</h3>
          <span className="text-gray-300">•</span>
          <p className={`text-[9px] font-bold uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${plan.popular ? "text-blue-100/70" : "text-white/40"}`}>
            {plan.subtitle}
          </p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-1.5  mb-1">
            <span className={`text-5xl font-bold tracking-tighter ${plan.popular ? "text-white" : "text-white"}`}>
              ₹{displayPrice.toLocaleString()}
            </span>
            <span className={`text-xs font-bold uppercase tracking-widest ${plan.popular ? "text-blue-200" : "text-gray-400"}`}>
              /{isYearly ? "yr" : "mo"}
            </span>
          </div>
          {proratedPrice !== null && (
            <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${plan.popular ? "bg-white/20 text-white" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"}`}>
              <Star className="w-3 h-3" /> Upgrade Price (Prorated)
            </div>
          )}
          {isYearly && !proratedPrice && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${plan.popular ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
              }`}>
              Save ₹{((plan.price.monthly * 12) - plan.price.yearly).toLocaleString()} yearly
            </span>
          )}
        </div>

        {/* Divider */}
        <div className={`w-full h-px mb-7 ${plan.popular ? "bg-white/15" : "bg-white/5"}`} />

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? "bg-white/20" : "bg-[#5F97C9]/10"
                }`}>
                <CheckCircle2 className={`w-2.5 h-2.5 ${plan.popular ? "text-white" : "text-[#5F97C9]"}`} />
              </div>
              <span className={`text-sm leading-relaxed ${plan.popular ? "text-white/90" : "text-white/60"}`}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onSelect}
          disabled={loadingPlan !== null || isCurrentPlan || !isHigherTier}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 active:scale-96 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCurrentPlan
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : !isHigherTier && currentSub
              ? "bg-white/5 text-white/20 cursor-not-allowed"
              : plan.popular
                ? "bg-white text-[#5F97C9] hover:bg-blue-50 focus:ring-white/40"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10 focus:ring-white/20"
            }`}
        >
          {loadingPlan === plan.title ? "Redirecting..." : isCurrentPlan ? "Current Plan" : proratedPrice !== null ? "Upgrade Now" : "Get Started"}
        </button>
      </div>
    </motion.div>
  );
};

/* ---------- Pricing Section ---------- */
const PricingSection = () => {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsSignedIn(!!user);
      if (user) {
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();
        setCurrentSub(sub);
      }
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
      if (!session?.user) setCurrentSub(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (!isSignedIn) { router.push("/signup?mode=signin"); return; }

    // Calculate final price (full or prorated)
    let finalPrice = isYearly ? plan.price.yearly : plan.price.monthly;
    let isUpgrade = false;

    if (currentSub && currentSub.plan_name !== plan.title) {
      // Simple logic mirroring FlipPricingCard's display logic
      const now = new Date();
      const start = new Date(currentSub.start_date);
      const end = new Date(currentSub.end_date);
      const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
      const remainingDays = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);

      if (remainingDays > 0) {
        const credit = (remainingDays / totalDays) * currentSub.price;
        finalPrice = Math.max(0, Math.round(finalPrice - credit));
        isUpgrade = true;
      }
    }

    const planPeriod = isYearly ? "year" : "month";

    setLoadingPlan(plan.title);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("User session not found. Please log in again.");
      }

      const payload = {
        userId,
        items: [],
        total: finalPrice,
        subtotal: finalPrice,
        contact: {},
        addr: {},
        delivery: "standard",
        payMode: "stripe",
        isPlanCheckout: true,
        planDetails: {
          name: plan.title,
          price: finalPrice,
          period: planPeriod
        },
        deliveryFee: 0,
        totalTax: 0,
        promoDiscount: 0,
        subDiscount: 0,
        promoCode: null
      };

      const response = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server.");
      }
    } catch (err: any) {
      console.error("Plan checkout error:", err);
      alert(err.message || "An error occurred during checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="relative w-full bg-black py-24 overflow-hidden border-t border-white/5">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] bg-[#5F97C9]/6 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] bg-blue-200/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#5F97C9]/10 border border-[#5F97C9]/20 text-[#5F97C9] text-[10px] font-bold uppercase tracking-[0.2em] mb-5">
            / Pricing Plans
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5F97C9] to-blue-400">Pet&apos;s Future</span>
          </h2>
          <p className="text-white/50 text-sm md:text-base max-w-2xl mx-auto font-medium">
            Select the perfect care package tailored for your beloved companion&apos;s unique lifestyle.
          </p>

          {/* Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="p-1 bg-white/5 border border-white/10 rounded-full flex gap-1 backdrop-blur-md">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${!isYearly ? "bg-[#5F97C9] text-white" : "text-white/40 hover:text-[#5F97C9]"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${isYearly ? "bg-[#5F97C9] text-white" : "text-white/40 hover:text-[#5F97C9]"}`}
              >
                Yearly
                <span className="ml-1.5 inline-block px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full leading-tight">-17%</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Flip Cards */}
        <div className="grid gap-6 md:grid-cols-3" style={{ perspective: "1200px" }}>
          {plans.map((plan, i) => (
            <FlipPricingCard
              key={i}
              plan={plan}
              index={i}
              isYearly={isYearly}
              onSelect={() => handleSelectPlan(plan)}
              currentSub={currentSub}
              loadingPlan={loadingPlan}
            />
          ))}
        </div>

        {/* Footer note */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.5 }} viewport={{ once: true }} className="text-center mt-10 space-y-2">
          <p className="text-white/20 text-xs">
            All plans include free consultations | Cancel anytime | No setup fees
          </p>
          <p className="text-xs">
            <span className="text-white/20">Have questions?</span>{" "}
            <button onClick={() => router.push("/contactUs")} className="text-[#5F97C9] font-semibold hover:underline">Talk to our care team</button>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

/* ============================== MAIN PAGE ============================== */
const VeterinaryServices: React.FC = () => {
  const router = useRouter();

  const statItems = [
    { value: 20, suffix: "+", label: "Specialists" },
    { value: 24, suffix: "/7", label: "Emergency" },
    { value: 5000, suffix: "+", label: "Pets Treated" },
    { value: 99, suffix: "%", label: "Satisfaction" },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-[var(--font-inter)] selection:bg-[#FF8A70]/30">

      {/* === Hero Section (Standardized) === */}
      <section className="relative h-[45vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Hero Image */}

        <Image
          src="/images/statbg9.jpg"
          alt="Veterinary Support"
          fill
          priority
          className="object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl md:text-4xl font-sans font-extrabold tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent uppercase">
              Veterinary <span className="text-[#5F97C9]">Support</span>
            </h1>
            <p className="text-white/40 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
              Expert medical care for every stage of their lives
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 overflow-hidden">
            <button
              onClick={() => router.push('/')}
              className="text-white/40 hover:text-white transition-colors duration-200 font-bold text-xs sm:text-sm uppercase tracking-widest"
            >
              Home
            </button>
            <span className="text-white/20 text-xs">/</span>
            <p className="text-xs sm:text-sm text-[#5F97C9] font-bold uppercase tracking-widest">Health</p>
          </div>
        </motion.div>
      </section>

      {/* -------- MISSION / ABOUT SECTION -------- */}
      <section className="relative py-20 px-4 overflow-hidden bg-black border-t border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5F97C9]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <span className="inline-block px-3 py-1 rounded-full bg-[#5F97C9]/10 border border-[#5F97C9]/20 text-[#5F97C9] text-[10px] font-bold uppercase tracking-[0.2em] mb-5">
                / Our Mission
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                Nurturing Animal Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5F97C9] to-blue-400">with Expert Care</span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-10 max-w-lg">
                We are dedicated to providing exceptional veterinary services that support the health, happiness, and well-being of your beloved companions through every stage of their lives.
              </p>

              {/* Stat counters */}
              <div className="grid grid-cols-4 gap-2">
                {statItems.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl"
                  >
                    <p className="text-2xl font-bold text-[#5F97C9]">
                      <AnimatedCounter value={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/appointments/new")}
                className="mt-10 inline-flex items-center gap-2 bg-[#5F97C9] text-white font-bold px-7 py-3.5 rounded-2xl text-sm transition-all duration-300"
              >
                Book a Consultation <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Right image */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="relative">
              <div className="relative w-full h-[420px] rounded-[2.5rem] overflow-hidden group">
                <Image
                  src="/images/vet5.jpg"
                  alt="Veterinarian with pet"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#5F97C9]/30 to-transparent" />
              </div>
              {/* Glass badge */}
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                className="absolute -bottom-6 left-8 bg-white/[0.08] backdrop-blur-3xl px-6 py-4 rounded-3xl border border-white/20 flex items-center gap-4 z-20"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-[#5F97C9] flex items-center justify-center border border-[#5F97C9]/50">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <Globe className="w-3 h-3 text-[#5F97C9]" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white text-sm tracking-tight">Trusted Globally</p>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Excellence in every visit</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------- SERVICES MARQUEE SECTION -------- */}
      <section className="relative py-24 bg-black overflow-hidden border-t border-white/5">
        <div className="absolute top-10 right-10 w-64 h-64 bg-[#5F97C9]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-blue-200/20 rounded-full blur-[60px] pointer-events-none" />

        {/* Heading — with proper max-w padding */}
        <div className="max-w-6xl mx-auto px-4 mb-12">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#5F97C9]/10 border border-[#5F97C9]/20 text-[#5F97C9] text-[10px] font-bold uppercase tracking-[0.2em] mb-5">
              / Serving Pet Needs
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">Our Vet Services</h2>
            <p className="text-white/40 text-sm md:text-base font-medium max-w-2xl mx-auto">
              A complete range of veterinary and wellness services for your beloved pets.
            </p>
          </motion.div>
        </div>

        {/* Marquee — edge-to-edge within the padded section */}
        <ServiceMarquee />
      </section>

      {/* -------- CTA BANNER SECTION -------- */}
      <section className="relative w-full h-[440px] md:h-[480px] flex items-center overflow-hidden">
        <Image src="/images/statbg1.jpg" alt="Care they deserve" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 w-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
            viewport={{ once: true }}
            className="text-center max-w-5xl mx-auto px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Professional Excellence
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Give Your Pet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Care They Deserve</span>
            </h2>
            <p className="text-blue-100/80 text-base mb-10 max-w-xl mx-auto font-medium leading-relaxed">
              Schedule your first consultation today — <span className="text-white font-bold">100% Free</span>, covered by Petverse. Experience why thousands of pet parents trust us.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/appointments/new")}
              className="inline-flex items-center gap-2 bg-white text-[#5F97C9] font-bold py-4 px-10 rounded-2xl text-base transition-all duration-300"
            >
              Schedule Consultation <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* -------- PRICING SECTION -------- */}
      <PricingSection />

    </div>
  );
};

export default VeterinaryServices;
