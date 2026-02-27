// /app/delete/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Loader2,
  User,
  Shield,
  ExternalLink,
  Check,
  ChevronRight,
  Search,
  ShieldAlert,
  X
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://irjyhbnwelupvsxulrzm.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyanloYm53ZWx1cHZzeHVscnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzE4NjQsImV4cCI6MjA3MjU0Nzg2NH0.vM9_Yp8kArDviCGQ5NHff_frGBh6F0tYj4SO7XWFc1w"
);

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface RelatedData {
  pets: number;
}

export default function DeleteUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingRelated, setCheckingRelated] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [deleteRelated, setDeleteRelated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const formatError = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "An unexpected error occurred";
  };

  const checkRelatedData = async (): Promise<void> => {
    setCheckingRelated(true);
    setErr(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw new Error(`Authentication error: ${userErr.message}`);
      if (!user) throw new Error("Not logged in");

      const { data: prof, error: findErr } = await supabase
        .from("users")
        .select("id, user_id, email, first_name, last_name")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .limit(1)
        .maybeSingle();

      if (findErr) throw new Error(`Profile lookup failed: ${findErr.message}`);
      if (!prof?.id) throw new Error("No profile found for this account");

      const validatedProfile: UserProfile = {
        id: prof.id,
        user_id: prof.user_id,
        email: prof.email,
        first_name: prof.first_name,
        last_name: prof.last_name,
      };

      setUserProfile(validatedProfile);

      const { count: petsCount, error: petsErr } = await supabase
        .from("pets")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", prof.id);

      if (petsErr) throw new Error(`Failed to check pets: ${petsErr.message}`);

      setRelatedData({ pets: petsCount || 0 });
    } catch (error: unknown) {
      setErr(formatError(error));
    } finally {
      setCheckingRelated(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!userProfile || !relatedData) {
      setErr("Please check your account data first");
      return;
    }

    setErr(null);
    setStatus(null);
    setLoading(true);

    try {
      if (relatedData.pets > 0 && deleteRelated) {
        setStatus("Wiping pet records...");
        const { error: petsDeleteErr } = await supabase
          .from("pets")
          .delete()
          .eq("owner_id", userProfile.id);
        if (petsDeleteErr)
          throw new Error(`Failed to delete pets: ${petsDeleteErr.message}`);
      }

      setStatus("Purging account identity...");
      const { error: delErr } = await supabase
        .from("users")
        .delete()
        .eq("id", userProfile.id);
      if (delErr) throw new Error(`Profile deletion failed: ${delErr.message}`);

      setStatus("Account successfully terminated. Farewell.");

      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          router.replace("/");
        } catch {
          router.replace("/");
        }
      }, 2500);
    } catch (error: unknown) {
      setErr(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const canDelete = confirmed && (!relatedData?.pets || deleteRelated);

  return (
    <div className="h-[100dvh] bg-black text-white selection:bg-red-500/30 font-inter relative flex flex-col overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:32px_32px]" />
      </div>

      <main className="relative z-10 max-w-xl mx-auto w-full px-4 lg:px-0 py-8 md:py-16 flex flex-col h-full overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 shrink-0"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
                <ShieldAlert size={12} /> Critical Action
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.2em]"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span>Return to Safety</span>
              </button>
            </div>
            <h1 className="mt-2 text-[26px] md:text-4xl lg:text-5xl font-black tracking-tighter leading-tight mb-3">
              Terminate Account
            </h1>
            <p className="text-white/40 text-xs md:text-sm font-medium leading-relaxed max-w-md">
              Once confirmed, your entire digital footprint including pet records will be <span className="text-white font-bold">permanently erased</span> from the ecosystem.
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Status / Error Messages */}
            <AnimatePresence mode="wait">
              {err && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                >
                  {err}
                </motion.div>
              )}
              {status && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-[#5F97C9]/10 border border-[#5F97C9]/20 text-[#5F97C9] text-xs font-bold"
                >
                  {status}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis Card */}
            <div className="relative group overflow-hidden bg-white/[0.03] border border-white/10 rounded-xl p-8 backdrop-blur-3xl transition-all duration-500 hover:bg-white/[0.05] hover:border-white/20">
              {!relatedData && !checkingRelated ? (
                <div className="flex flex-col items-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6 border border-white/5">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2 uppercase">Account Audit</h3>
                  <p className="text-white/40 text-xs font-medium mb-8 text-center max-w-[240px]">We need to scan your data before termination to ensure clean removal.</p>
                  <button
                    onClick={checkRelatedData}
                    className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                  >
                    Run System Audit
                  </button>
                </div>
              ) : checkingRelated ? (
                <div className="flex flex-col items-center py-12">
                  <div className="relative">
                    <Loader2 className="animate-spin text-[#5F97C9]" size={48} />
                    <div className="absolute inset-0 bg-[#5F97C9]/20 blur-xl rounded-full" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mt-8">Verifying Encrypted Records...</p>
                </div>
              ) : relatedData && userProfile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  {/* Profile Summary */}
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white/60">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Authenticated Identity</p>
                      <h4 className="text-xl font-black tracking-tight uppercase">
                        {[userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "Valued Member"}
                      </h4>
                      <p className="text-white/40 text-[10px] font-bold mt-0.5">{userProfile.email}</p>
                    </div>
                  </div>

                  {/* Pet Data Control */}
                  <div className={`p-6 rounded-xl border transition-all duration-500 ${relatedData.pets > 0 ? "bg-red-500/5 border-red-500/10" : "bg-emerald-500/5 border-emerald-500/10"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${relatedData.pets > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {relatedData.pets} Linked Entity Record{relatedData.pets !== 1 ? 's' : ''}
                        </h5>
                        <p className="text-white/40 text-[10px] font-medium mt-1">Found in Petzonee Registry</p>
                      </div>

                      {relatedData.pets > 0 && (
                        <button
                          onClick={() => setDeleteRelated(!deleteRelated)}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${deleteRelated ? "bg-red-500 text-white" : "bg-white/5 text-white border border-white/10"}`}
                        >
                          {deleteRelated ? "Wiping Pets" : "Leave Pets"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Checkbox */}
                  <label className="group flex items-center gap-4 cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-all">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${confirmed ? "bg-white border-white text-black" : "border-white/10"}`}>
                      {confirmed && <Check size={14} strokeWidth={4} />}
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Final Confirmation</p>
                      <p className="text-[10px] text-white/40 font-bold">I acknowledge this action is irreversible.</p>
                    </div>
                  </label>

                  {/* Terminate Button */}
                  <button
                    onClick={handleDelete}
                    disabled={!canDelete || loading}
                    className={`w-full py-5 rounded-xl font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 ${!canDelete || loading
                      ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                      : "bg-[#FF3D00] text-white shadow-[0_0_40px_rgba(255,61,0,0.2)] hover:shadow-[0_0_60px_rgba(255,61,0,0.4)] hover:scale-[1.01] active:scale-[0.98]"
                      }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        De-Registering...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} /> Terminate System Access
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>

            {/* Footer Help */}
            <div className="mt-auto pt-10 border-t border-white/5 flex items-center justify-between">
              <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">Secure Termination Protocol</p>
              <button
                onClick={() => router.push("/contactUs")}
                className="flex items-center gap-2 text-white/40 hover:text-[#5F97C9] transition-all text-[9px] font-black uppercase tracking-widest"
              >
                Contact Support <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
