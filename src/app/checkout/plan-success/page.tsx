"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, ShieldCheck, Check } from "lucide-react";
import SpinnerLoader from "@/components/SpinnerLoader";

const PLAN_BENEFITS: Record<string, string[]> = {
  "Essential Care": [
    "1 Free Monthly Consultation",
    "5% Product Discount",
    "Basic Health Tracking",
    "Monthly Pet Care Tips",
    "Community Access",
  ],
  "Complete Care": [
    "4 Free Monthly Consultations",
    "15% Product Discount",
    "Priority Booking",
    "24/7 Dedicated Vet Chat",
    "Seasonal Flea Treatment",
  ],
  "Premium Care": [
    "Unlimited Free Consultations",
    "25% Product Discount",
    "VIP Spa Treatments",
    "Priority Emergency Hotline",
    "Skin Health Analysis",
  ]
};

export default function PlanSuccessPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#FF8A65]/10" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-[#FF8A65] border-r-[#FF8A65]/40 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#FF8A65]/20 to-orange-500/20 animate-pulse" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-white font-bold tracking-tight text-lg">Loading subscription details...</p>
          <p className="text-[#FF8A65] text-xs font-semibold uppercase tracking-[0.2em] animate-pulse">Please wait</p>
        </div>
      </div>
    }>
      <PlanSuccessContent />
    </Suspense>
  );
}

function PlanSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [planDetails, setPlanDetails] = useState({
    planName: searchParams.get('planName') || "Premium Plan",
    planPeriod: searchParams.get('planPeriod') === 'year' ? 'Yearly' : 'Monthly',
    orderNumber: searchParams.get('order') || null
  });

  useEffect(() => {
    if (!sessionId) {
      if (!planDetails.orderNumber) {
        setError(true);
        setLoading(false);
      } else {
        setLoading(false);
      }
      return;
    }

    const verifySession = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/checkout/verify-session', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await res.json();
        
        if (data.success && data.planDetails) {
          setPlanDetails({
            planName: data.planDetails.planName || "Premium Plan",
            planPeriod: data.planDetails.planPeriod === 'year' ? 'Yearly' : 'Monthly',
            orderNumber: data.planDetails.orderNumber
          });
        } else if (!data.success) {
          console.error("Verification error:", data.error);
        }
      } catch (err) {
        console.error("Failed to verify session", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      verifySession();
    }, 800); // Small delay to allow webhook completion

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#FF8A65]/10" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-[#FF8A65] border-r-[#FF8A65]/40 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#FF8A65]/20 to-orange-500/20 animate-pulse" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-white font-bold tracking-tight text-lg">Activating your subscription...</p>
          <p className="text-[#FF8A65] text-xs font-semibold uppercase tracking-[0.2em] animate-pulse">Setting up your perks</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-6">We could not verify your subscription details.</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors">Dashboard</button>
      </div>
    );
  }

  const benefits = PLAN_BENEFITS[planDetails.planName] || PLAN_BENEFITS["Premium Care"];

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF8A65]/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8A65]/5 blur-[120px] rounded-full" />
      </div>
      
      <div className="max-w-4xl w-full h-full lg:h-auto flex flex-col lg:flex-row items-stretch justify-center gap-6 overflow-y-auto lg:overflow-visible py-12 lg:py-0">
        
        {/* Left Side: Activation Status */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1 bg-[#121212] rounded-[32px] p-8 shadow-2xl border border-white/10 text-center relative flex flex-col justify-center min-h-[400px]"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] border border-green-500/30"
          >
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Subscription Active!
          </h1>
          
          <p className="text-gray-400 text-base mb-8 max-w-sm mx-auto">
            Welcome to the family. Your account has been upgraded and your premium perks are now unlocked.
          </p>

          {/* Plan Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl p-5 border border-[#FF8A65]/30 mb-8 shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#FF8A65] font-bold tracking-widest text-xs uppercase">Your Plan</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-1">{planDetails.planName}</h2>
              <div className="inline-block bg-white/5 px-3 py-1 rounded-full text-xs font-semibold text-gray-300 shadow-sm border border-white/10 mt-1">
                Billed {planDetails.planPeriod}
              </div>
            </div>
            
            {planDetails.orderNumber && (
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs relative z-10">
                <span className="text-gray-400 font-medium">Order Ref</span>
                <span className="font-mono text-gray-300 bg-black/50 px-2 py-0.5 rounded">{planDetails.orderNumber}</span>
              </div>
            )}
          </motion.div>

          <div className="w-full max-w-sm mx-auto">
            <button 
              onClick={() => router.push("/dashboard?view=profile")}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3.5 px-6 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </motion.div>

        {/* Right Side: Benefits */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="flex-1 bg-gradient-to-br from-[#FF8A65]/10 to-transparent rounded-[32px] p-8 border border-[#FF8A65]/20 relative flex flex-col justify-center min-h-[400px]"
        >
           <div className="mb-6 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#FF8A65]/20 flex items-center justify-center text-[#FF8A65]">
               <ShieldCheck className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white">Your Benefits</h3>
               <p className="text-sm text-[#FF8A65]">Available immediately</p>
             </div>
           </div>

           <div className="space-y-4">
             {benefits.map((benefit, index) => (
               <motion.div 
                 key={index}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4 + (index * 0.1) }}
                 className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group"
               >
                 <div className="w-6 h-6 rounded-full bg-[#FF8A65]/20 flex items-center justify-center text-[#FF8A65] group-hover:scale-110 transition-transform">
                   <Check className="w-3.5 h-3.5" />
                 </div>
                 <span className="text-gray-200 font-medium">{benefit}</span>
               </motion.div>
             ))}
           </div>
           
           <div className="mt-8 p-4 bg-[#FF8A65]/10 rounded-xl border border-[#FF8A65]/20 flex items-start gap-3">
             <ShieldCheck className="w-5 h-5 text-[#FF8A65] shrink-0 mt-0.5" />
             <p className="text-xs text-gray-300 leading-relaxed">
               All perks are applied automatically. You can view your remaining benefits and manage your subscription anytime from your dashboard.
             </p>
           </div>
        </motion.div>
      </div>
    </div>
  );
}

