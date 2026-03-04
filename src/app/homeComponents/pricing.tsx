"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";

const plans = [
  {
    title: "Essential Care",
    price: { monthly: 1199, yearly: 11990 },
    img: "/images/pricing1.jpg",
    features: [
      "1 Free Monthly Consultation",
      "5% Product Discount",
      "Basic Health Tracking",
      "Monthly Pet Care Tips",
      "Community Access",
    ],
  },
  {
    title: "Complete Care",
    price: { monthly: 2999, yearly: 29990 },
    img: "/images/pricing2.jpg",
    features: [
      "4 Free Monthly Consultations",
      "15% Product Discount",
      "Priority Booking",
      "24/7 Dedicated Vet Chat",
      "Seasonal Flea Treatment",
    ],
  },
  {
    title: "Premium Care",
    price: { monthly: 4999, yearly: 49990 },
    img: "/images/pricing3.jpg",
    features: [
      "Unlimited Free Consultations",
      "25% Product Discount",
      "VIP Spa Treatments",
      "Priority Emergency Hotline",
      "Skin Health Analysis",
    ],
  },
];

export default function PricingSection() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    // Initial auth check
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
      if (!session?.user) setCurrentSub(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSelectPlan = (plan: any) => {
    if (!isSignedIn) {
      router.push("/signup?mode=signin");
      return;
    }

    let planPrice = isYearly ? plan.price.yearly : plan.price.monthly;
    let isUpgrade = false;

    if (currentSub && currentSub.plan_name !== plan.title) {
      const now = new Date();
      const start = new Date(currentSub.start_date);
      const end = new Date(currentSub.end_date);
      const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
      const remainingDays = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);

      if (remainingDays > 0) {
        const credit = (remainingDays / totalDays) * currentSub.price;
        planPrice = Math.max(0, Math.round(planPrice - credit));
        isUpgrade = true;
      }
    }

    const planPeriod = isYearly ? "year" : "month";

    // Encode plan details to pass through URL params
    const params = new URLSearchParams({
      plan: plan.title,
      price: planPrice.toString(),
      period: planPeriod,
      img: plan.img,
      isUpgrade: isUpgrade.toString()
    });

    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <section className="w-full bg-gray-50 py-16">
      {/* Top heading */}
      <div className="text-center mb-12">
        <p className="text-[#FF8A65] font-bold ">/PRICING</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-2">
          Choose Your Plan
        </h2>

        {/* Toggle */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-6 py-2 rounded-l-full transition-colors ${!isYearly
              ? "bg-[#FF8A65] text-white"
              : "bg-white border text-gray-800"
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-6 py-2 rounded-r-full transition-colors ${isYearly
              ? "bg-[#FF8A65] text-white"
              : "bg-white border text-gray-800"
              }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-6xl mx-auto px-4 grid gap-8 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            className="relative w-full bg-white rounded-2xl shadow-lg overflow-hidden h-[520px] flex flex-col justify-between cursor-pointer transform-gpu group"
            whileHover={{ scale: 1.05 }}
            initial={{ rotateY: 180, opacity: 0 }}
            whileInView={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            viewport={{ once: true }}
            style={{ perspective: 1000 }}
          >
            {/* Plan Image */}
            <div className="relative w-full h-56">
              <Image
                src={plan.img}
                alt={plan.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 justify-between p-6 transition-colors group-hover:bg-[#FF8A65] group-hover:text-white">
              <div>
                <h3 className="text-xl font-semibold">{plan.title}</h3>
                <p className="mt-3 text-3xl font-bold text-[#FF8A65] group-hover:text-white">
                  Rs.{isYearly ? plan.price.yearly : plan.price.monthly}
                  <span className="text-sm font-medium ml-1">
                    /{isYearly ? "yr" : "mo"}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="mr-2 text-[#FF8A65] group-hover:text-white">
                        •
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Purchase Button */}
              {/* Purchase Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={currentSub?.plan_name === plan.title || (currentSub && ["Essential Care", "Complete Care", "Premium Care"].indexOf(plan.title) <= ["Essential Care", "Complete Care", "Premium Care"].indexOf(currentSub.plan_name))}
                className={`mt-6 w-full py-3 rounded-xl font-semibold 
             transition-transform duration-300 hover:scale-105 active:scale-95 
             ${currentSub?.plan_name === plan.title || (currentSub && ["Essential Care", "Complete Care", "Premium Care"].indexOf(plan.title) <= ["Essential Care", "Complete Care", "Premium Care"].indexOf(currentSub.plan_name))
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#FF8A65] text-white group-hover:bg-white group-hover:text-[#FF8A65]"
                  }`}
              >
                {currentSub?.plan_name === plan.title ? "Current Plan" : "Select Plan"}
              </button>

            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
