"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, ShieldCheck, Star } from "lucide-react";
import SpinnerLoader from "@/components/SpinnerLoader";

export default function PlanSuccessPage() {
  return (
    <Suspense fallback={<SpinnerLoader text="Loading subscription details..." />}>
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
        // If there's neither session_id nor fallback order params, we can't verify
        setError(true);
        setLoading(false);
      } else {
        // Fallback for old success URLs if they somehow hit this
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

    verifySession();
  }, [sessionId]);

  if (loading) {
    return <SpinnerLoader text="Activating your subscription..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6">We could not verify your subscription details.</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-900 text-white rounded-lg">Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-20 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-[#FF8A65] rounded-b-[50px] -z-10 shadow-lg" />
      
      <div className="max-w-2xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-[32px] p-8 md:p-12 shadow-2xl border border-gray-100 text-center relative overflow-hidden"
        >
          {/* Confetti / Sparkles (visual only) */}
          <div className="absolute top-10 left-10 text-[#FF8A65] opacity-20">
            <Star className="w-8 h-8 animate-pulse" />
          </div>
          <div className="absolute top-16 right-12 text-yellow-400 opacity-30">
            <Star className="w-6 h-6 animate-pulse delay-150" />
          </div>

          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"
          >
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Subscription Activated!
          </h1>
          
          <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
            Welcome to the family. You now have access to exclusive perks, premium support, and better pet care.
          </p>

          {/* Plan Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-orange-50 to-[#fff3ed] rounded-3xl p-6 border border-orange-100 mb-10 shadow-sm relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 text-orange-200 opacity-50">
              <Star className="w-32 h-32 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-6 h-6 text-[#FF8A65]" />
                <span className="text-[#FF8A65] font-bold tracking-widest text-sm uppercase">Your Current Plan</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">{planDetails.planName}</h2>
              <div className="inline-block bg-white px-4 py-1.5 rounded-full text-sm font-semibold text-gray-700 shadow-sm border border-gray-100 mt-2">
                Billed {planDetails.planPeriod}
              </div>
            </div>
            
            {planDetails.orderNumber && (
              <div className="mt-6 pt-4 border-t border-orange-200/50 flex justify-between items-center text-sm relative z-10">
                <span className="text-gray-500 font-medium">Order Reference</span>
                <span className="font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded">{planDetails.orderNumber}</span>
              </div>
            )}
          </motion.div>

          {/* Next Steps List */}
          <div className="text-left space-y-4 mb-10 pl-2">
            <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">What's Next?</h3>
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0 mt-1">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Enjoy your benefits</p>
                <p className="text-gray-500 text-sm">Discounts and perks are applied automatically at checkout.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push("/dashboard?view=profile")}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2"
            >
              View My Plan <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => router.push("/shop")}
              className="flex-1 bg-white hover:bg-orange-50 text-[#FF8A65] border-2 border-[#FF8A65] font-bold py-4 px-8 rounded-2xl transition-all flex items-center justify-center"
            >
              Start Shopping
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
