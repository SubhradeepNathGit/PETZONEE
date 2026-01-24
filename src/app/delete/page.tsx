// /app/delete/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Loader2,
  User,
  Heart,
  Shield,
  ExternalLink,
  Check,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    if (error && typeof error === "object" && "message" in error)
      return String((error as { message: string }).message);
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
        setStatus("Deleting related pets...");
        const { error: petsDeleteErr } = await supabase
          .from("pets")
          .delete()
          .eq("owner_id", userProfile.id);
        if (petsDeleteErr)
          throw new Error(`Failed to delete pets: ${petsDeleteErr.message}`);
      }

      setStatus("Deleting user profile...");
      const { error: delErr } = await supabase
        .from("users")
        .delete()
        .eq("id", userProfile.id);
      if (delErr) throw new Error(`Profile deletion failed: ${delErr.message}`);

      const userName =
        [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") ||
        userProfile.email;

      setStatus(`Successfully deleted profile for ${userName}.`);

      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          router.replace("/");
        } catch {
          router.replace("/");
        }
      }, 2000);
    } catch (error: unknown) {
      setErr(formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const canDelete = confirmed && (!relatedData?.pets || deleteRelated);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Safety</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
            <AlertTriangle className="text-red-400" size={36} />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Delete Account</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Once you confirm, <span className="text-red-400 font-semibold">everything will be permanently deleted.</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-8">
          {/* Analyze Button */}
          {!relatedData && !checkingRelated && (
            <div className="mb-8 text-center">
              <button
                onClick={checkRelatedData}
                className="px-6 py-3 text-sm bg-blue-500/20 border border-blue-500/30 rounded-xl text-white font-semibold hover:scale-105 transition"
              >
                <User size={18} className="inline-block mr-2" /> Analyze My Account Data
              </button>
            </div>
          )}

          {/* Loading */}
          {checkingRelated && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="animate-spin text-blue-400" size={36} />
              <p className="text-gray-300 mt-3">Scanning your account...</p>
            </div>
          )}

          {/* Account Data */}
          {relatedData && userProfile && (
            <div className="mb-8 space-y-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <User size={18} /> Profile Summary
                </h3>
                <p className="text-white">
                  {[userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || userProfile.email}
                </p>
                <p className="text-gray-400 text-sm">{userProfile.email}</p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  relatedData.pets > 0
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-green-500/10 border-green-500/20"
                }`}
              >
                <h4
                  className={`font-semibold mb-1 ${
                    relatedData.pets > 0 ? "text-orange-400" : "text-green-400"
                  }`}
                >
                  {relatedData.pets} Pet{relatedData.pets === 1 ? "" : "s"}
                </h4>
                {relatedData.pets > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteRelated}
                      onChange={(e) => setDeleteRelated(e.target.checked)}
                      className="accent-orange-500"
                    />
                    Also delete all my pets
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Final Confirmation */}
          {relatedData && (
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    confirmed ? "bg-red-500 border-red-500" : "border-gray-400"
                  }`}
                >
                  {confirmed && <Check size={14} className="text-white" />}
                </div>
                <span className="text-gray-300 text-sm">
                  I understand and permanently delete my account
                </span>
              </label>
            </div>
          )}

          {/* Errors / Status */}
          {err && <p className="text-red-400 mb-4 text-sm">{err}</p>}
          {status && <p className="text-green-400 mb-4 text-sm">{status}</p>}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={!canDelete || loading}
              className={`flex-1 px-6 py-3 text-sm font-semibold rounded-xl transition ${
                !canDelete || loading
                  ? "bg-gray-600/50 text-gray-400"
                  : "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:scale-105"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin inline-block mr-2" size={16} />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="inline-block mr-2" /> Delete Forever
                </>
              )}
            </button>
            <button
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-3 text-sm rounded-xl bg-white/5 text-white border border-white/20 hover:bg-white/10"
            >
              Keep Account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/contactUs")}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            Contact Support <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
