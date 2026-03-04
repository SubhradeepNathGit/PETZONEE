"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2, XCircle, FileText, Mail, Phone,
    Clock, Search, RefreshCw, ChevronLeft, Stethoscope,
    ShieldCheck, AlertCircle, ExternalLink, Download
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { toast } from "react-toastify";
import Link from "next/link";

type VetProfile = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    kyc_status: string;
    avatar_url: string | null;
    medical_doc_url: string | null;
    created_at: string;
    specialization?: string;
    experience?: string;
};

export default function AdminKycPage() {
    const [loading, setLoading] = useState(true);
    const [vets, setVets] = useState<VetProfile[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("pending");
    const [processing, setProcessing] = useState<string | null>(null);
    const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "Admin", avatar: null });

    const fetchVets = useCallback(async () => {
        try {
            let query = supabase.from('veterinarian').select('*').order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('kyc_status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setVets(data || []);
        } catch (error: any) {
            toast.error("Failed to load applications: " + error.message);
        }
    }, [filter]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('first_name, avatar_url').eq('id', user.id).maybeSingle();
                setMe({ name: profile?.first_name || "Admin", avatar: profile?.avatar_url || null });
            }
            await fetchVets();
            setLoading(false);
        };
        init();
    }, [fetchVets]);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        try {
            setProcessing(id);
            const { error } = await supabase
                .from('veterinarian')
                .update({
                    kyc_status: status,
                    approved_at: status === 'approved' ? new Date().toISOString() : null
                })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Application ${status} successfully`);
            await fetchVets();
        } catch (error: any) {
            toast.error("Action failed: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const filteredVets = vets.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Verifying Credentials...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
            </aside>

            <main className="lg:ml-72 p-6 md:p-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <Link href="/admin" className="inline-flex items-center text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4 gap-2">
                            <ChevronLeft size={14} /> Back to Insights
                        </Link>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            KYC Review Center
                            <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-white/40 font-bold border border-white/5 uppercase tracking-[0.2em]">Compliance</span>
                        </h1>
                        <p className="text-white/30 text-[11px] font-bold uppercase tracking-[0.3em]">Credentials & Licensing Verification Hub</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 shadow-lg backdrop-blur-3xl">
                            {['pending', 'approved', 'rejected', 'all'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 shadow-orange-500/10'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group max-w-2xl bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-all backdrop-blur-xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or document ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none pl-16 pr-8 py-5 text-white text-sm font-medium"
                    />
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredVets.length > 0 ? (
                            filteredVets.map((vet, idx) => (
                                <motion.div
                                    key={vet.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-white/10 transition-all hover:bg-white/[0.02]"
                                >
                                    <div className="p-8 flex flex-col md:flex-row gap-8">
                                        {/* Avatar & Basic Info */}
                                        <div className="flex items-start gap-6 flex-1">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent p-1 shadow-2xl relative z-10 overflow-hidden">
                                                    {vet.avatar_url ? (
                                                        <Image src={vet.avatar_url} alt={vet.name} width={96} height={96} className="w-full h-full object-cover rounded-[1.8rem]" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/10 bg-white/5 rounded-[1.8rem]">
                                                            <Stethoscope size={32} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -inset-4 bg-orange-500/20 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                                        {vet.name}
                                                        {vet.kyc_status === 'approved' && <ShieldCheck size={20} className="text-emerald-500" />}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest"><Mail size={12} className="text-orange-500" /> {vet.email}</span>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest"><Phone size={12} className="text-orange-500" /> {vet.phone || 'No Contact'}</span>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest"><Clock size={12} className="text-orange-500" /> {new Date(vet.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${vet.kyc_status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        vet.kyc_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {vet.kyc_status} status
                                                    </span>
                                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        Veterinary Surgeon
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions & Docs */}
                                        <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-3">
                                            {vet.medical_doc_url ? (
                                                <a
                                                    href={vet.medical_doc_url}
                                                    target="_blank"
                                                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg"
                                                >
                                                    <FileText size={16} /> View Credentials <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <div className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400/60 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                                                    <AlertCircle size={16} /> Documents Missing
                                                </div>
                                            )}

                                            {vet.kyc_status === 'pending' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        disabled={processing === vet.id}
                                                        onClick={() => handleAction(vet.id, 'approved')}
                                                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 text-white hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 disabled:opacity-50"
                                                    >
                                                        {processing === vet.id ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Approve
                                                    </button>
                                                    <button
                                                        disabled={processing === vet.id}
                                                        onClick={() => handleAction(vet.id, 'rejected')}
                                                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {processing === vet.id ? <RefreshCw className="animate-spin" size={16} /> : <XCircle size={16} />} Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-white/[0.03] text-white/10 mb-8 border border-white/5 shadow-2xl">
                                    <Stethoscope size={48} />
                                </div>
                                <h3 className="text-3xl font-black text-white/40 tracking-tighter mb-4 uppercase">No matching applications</h3>
                                <p className="text-white/20 text-xs font-bold uppercase tracking-[0.3em] max-w-sm mx-auto">Try adjusting your filters or search terms for the compliance queue.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
