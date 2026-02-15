"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle2, Lock, CreditCard, Wallet, Landmark, Smartphone } from "lucide-react";

export default function ProcessingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    // Animation sequences simulating real payment gateways (PhonePe, GPay, Paytm)
    useEffect(() => {
        // Step 0: Initializing (0ms) -> Step 1: Verifying (1.5s) -> Step 2: Processing (3s) -> Step 3: Success (4.5s)
        const timers = [
            setTimeout(() => setStep(1), 1500),
            setTimeout(() => setStep(2), 3000),
            setTimeout(() => {
                setStep(3);
                // Redirect to success page after showing success state
                setTimeout(() => router.push("/checkout/success"), 800);
            }, 4500),
        ];

        return () => timers.forEach((t) => clearTimeout(t));
    }, [router]);

    // Dynamic icon based on step
    const getIcon = () => {
        switch (step) {
            case 0:
                return <Lock className="h-12 w-12 text-blue-500 animate-pulse" />;
            case 1:
                return <Shield className="h-12 w-12 text-orange-500 animate-bounce" />;
            case 2:
                return <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin" />;
            case 3:
                return <CheckCircle2 className="h-16 w-16 text-green-500 scale-110" />;
            default:
                return <Shield className="h-12 w-12 text-gray-400" />;
        }
    };

    // Status text based on step
    const getStatus = () => {
        switch (step) {
            case 0:
                return { title: "Securely connecting...", sub: "Establishing encrypted connection" };
            case 1:
                return { title: "Verifying credentials...", sub: "Checking payment details" };
            case 2:
                return { title: "Processing payment...", sub: "Do not close this window" };
            case 3:
                return { title: "Payment Successful!", sub: "Redirecting to order confirmation..." };
            default:
                return { title: "Processing...", sub: "Please wait" };
        }
    };

    const status = getStatus();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
            >
                {/* Header - Brand feel */}
                <div className="bg-[#FF8A65] p-8 text-center">
                    <h2 className="text-white font-bold text-2xl tracking-wide">SECURE PAYMENT</h2>
                    <p className="text-orange-100 text-sm mt-1">256-bit SSL Encrypted</p>
                </div>

                {/* content */}
                <div className="p-10 flex flex-col items-center text-center space-y-8">

                    {/* Main animated icon area */}
                    <div className="relative h-32 w-32 flex items-center justify-center">
                        {/* Ripples for active state */}
                        {step < 3 && (
                            <>
                                <motion.div
                                    animate={{ scale: [1, 1.5, 2], opacity: [0.3, 0.1, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-full bg-orange-100"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1.6], opacity: [0.3, 0.1, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                    className="absolute inset-0 rounded-full bg-orange-50"
                                />
                            </>
                        )}

                        <div className="relative z-10 bg-white p-4 rounded-full shadow-sm border border-gray-100">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {getIcon()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-gray-800">{status.title}</h3>
                        <p className="text-gray-500 font-medium">{status.sub}</p>
                    </div>

                    {/* Progress Indicators */}
                    <div className="w-full space-y-4 pt-4">
                        {/* Step 1: Secure Check */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-500 ${step >= 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {step >= 1 ? <Shield className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </div>
                                <span className={`text-sm font-medium transition-colors duration-300 ${step >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>
                                    Security Check
                                </span>
                            </div>
                            {step >= 1 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        </div>

                        {/* Step 2: Bank Handshake */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-500 ${step >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Landmark className="h-4 w-4" />
                                </div>
                                <span className={`text-sm font-medium transition-colors duration-300 ${step >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>
                                    Bank Authorization
                                </span>
                            </div>
                            {step >= 2 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        </div>

                        {/* Step 3: Final Confirmation */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-500 ${step >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Wallet className="h-4 w-4" />
                                </div>
                                <span className={`text-sm font-medium transition-colors duration-300 ${step >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>
                                    Payment Confirmation
                                </span>
                            </div>
                            {step >= 3 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <div className="flex items-center justify-center gap-4 opacity-50 grayscale">
                        {/* Trust badges visuals (simulated with text for icons) */}
                        <div className="flex items-center gap-1"><Smartphone className="h-3 w-3" /><span className="text-[10px] font-bold">UPI</span></div>
                        <div className="h-3 w-[1px] bg-gray-300"></div>
                        <div className="flex items-center gap-1"><CreditCard className="h-3 w-3" /><span className="text-[10px] font-bold">CARDS</span></div>
                        <div className="h-3 w-[1px] bg-gray-300"></div>
                        <div className="flex items-center gap-1"><Landmark className="h-3 w-3" /><span className="text-[10px] font-bold">NETBANKING</span></div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
