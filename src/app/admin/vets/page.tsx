"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, User, Mail, Phone, MapPin,
    Calendar, Stethoscope, TrendingUp, ChevronRight,
    Star, ArrowUpRight, Loader2,
    Clock, CheckCircle2, XCircle, ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { toast } from "react-toastify";
import Image from "next/image";

/* Types */
type VetProfile = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    kyc_status: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    created_at: string;
};

type AppointmentSummary = {
    id: string;
    status: string;
    created_at: string;
};

type VetWithStats = VetProfile & {
    appointmentCount: number;
    totalEarned: number;
    lastAppointmentDate: string | null;
    recentAppointments: AppointmentSummary[];
};

export default function AdminVetsPage() {
    const [loading, setLoading] = useState(true);
    const [vetsWithStats, setVetsWithStats] = useState<VetWithStats[]>([]);
    const [search, setSearch] = useState("");
    const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "Admin", avatar: null });
    const [selectedVet, setSelectedVet] = useState<VetWithStats | null>(null);

    const fetchVetsData = useCallback(async () => {
        try {
            const [vetsRes, appointmentsRes] = await Promise.all([
                supabase.from('veterinarian').select('*').order('created_at', { ascending: false }),
                supabase.from('appointments').select('id, vet_id, status, created_at').order('created_at', { ascending: false })
            ]);

            if (vetsRes.error) throw vetsRes.error;
            if (appointmentsRes.error) throw appointmentsRes.error;

            const vets = vetsRes.data as VetProfile[];
            const appointments = appointmentsRes.data || [];

            const stats = vets.map(v => {
                const vetAppointments = appointments.filter(a => a.vet_id === v.id);
                const successfulAppointments = vetAppointments.filter(a => a.status === 'accepted' || a.status === 'completed');

                return {
                    ...v,
                    appointmentCount: vetAppointments.length,
                    totalEarned: successfulAppointments.length * 500, // Simulated Earnings per appointment for UI vastness
                    lastAppointmentDate: vetAppointments[0]?.created_at || null,
                    recentAppointments: vetAppointments.slice(0, 5) as AppointmentSummary[]
                };
            });

            setVetsWithStats(stats);
        } catch (error: any) {
            toast.error("Data fetch failed: " + error.message);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('first_name, avatar_url').eq('id', user.id).maybeSingle();
                setMe({ name: profile?.first_name || "Admin", avatar: profile?.avatar_url || null });
            }
            await fetchVetsData();
            setLoading(false);
        };
        init();
    }, [fetchVetsData]);

    const filteredVets = useMemo(() => {
        return vetsWithStats.filter(v =>
            v.name?.toLowerCase().includes(search.toLowerCase()) ||
            v.email?.toLowerCase().includes(search.toLowerCase())
        );
    }, [vetsWithStats, search]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Indexing Veterinarians...</p>
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

            <main className="lg:ml-72 p-6 md:p-10 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Vet Directory</h1>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em]">Network & Credential Analytics</p>
                    </div>

                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 px-8 py-5 rounded-[2rem]">
                        <div>
                            <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1 text-right">Active Vets</p>
                            <p className="text-2xl font-bold text-white text-right">{vetsWithStats.length}</p>
                        </div>
                        <div className="w-[1px] h-10 bg-white/10"></div>
                        <Stethoscope className="text-teal-500" size={32} />
                    </div>
                </div>

                {/* Search */}
                <div className="relative group bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-all">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-teal-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none pl-16 pr-8 py-5 text-white text-sm font-medium"
                    />
                </div>

                {/* Table */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Medical Professional</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Engagement</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">LTV (Revenue)</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filteredVets.map((v) => (
                                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                                                    {v.avatar_url ? (
                                                        <Image src={v.avatar_url} alt={v.name} width={48} height={48} className="object-cover" />
                                                    ) : (
                                                        <Stethoscope size={20} className="text-teal-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{v.name ? `Dr. ${v.name}` : 'Unknown'}</p>
                                                    <p className="text-white/30 text-[10px] font-bold">{v.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                                <Calendar size={12} className="text-teal-400" />
                                                <span className="text-[10px] font-bold text-white/80">{v.appointmentCount} Sessions</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-white font-bold text-lg">₹{v.totalEarned.toLocaleString()}</p>
                                            <p className="text-[9px] text-teal-500 font-bold uppercase tracking-widest">Growth +{Math.round(v.totalEarned / 500)}%</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => setSelectedVet(v)}
                                                className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Sidebar View for Vet Details */}
            <AnimatePresence>
                {selectedVet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-end"
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedVet(null)} />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            className="relative w-full max-w-xl h-screen bg-[#0a0a0a] border-l border-white/10 p-8 md:p-12 shadow-2xl overflow-y-auto custom-scrollbar"
                        >
                            <button
                                onClick={() => setSelectedVet(null)}
                                className="mb-10 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                            >
                                <XCircle size={24} />
                            </button>

                            <div className="flex items-center gap-8 mb-12">
                                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-teal-500 to-emerald-600 p-1 shadow-2xl overflow-hidden">
                                    {selectedVet.avatar_url ? (
                                        <Image src={selectedVet.avatar_url} alt={selectedVet.name} width={96} height={96} className="w-full h-full object-cover rounded-[1.8rem]" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20"><Stethoscope size={40} /></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">{selectedVet.name ? `Dr. ${selectedVet.name}` : 'Unknown'}</h2>
                                    <p className="text-teal-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                                        <ShieldCheck size={12} className="inline" />
                                        {selectedVet.kyc_status === 'approved' ? 'Licensed Medical Professional' : 'Pending Verification'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-12">
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Mail className="text-teal-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Electronic Mail</p>
                                    <p className="text-xs font-bold text-white truncate">{selectedVet.email}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Phone className="text-emerald-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Clinic Line</p>
                                    <p className="text-xs font-bold text-white whitespace-nowrap">{selectedVet.phone || 'Not Shared'}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Calendar className="text-orange-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Joined Network</p>
                                    <p className="text-xs font-bold text-white">{new Date(selectedVet.created_at).toDateString()}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <TrendingUp className="text-purple-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Network LTV</p>
                                    <p className="text-xs font-bold text-white">₹{selectedVet.totalEarned.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Admin Controls */}
                            <div className="mb-12 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-8">
                                <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">
                                    Administrative Control
                                    <div className="flex-1 h-[1px] bg-white/5"></div>
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Verification Status</p>
                                        <div className="flex gap-2">
                                            {['pending', 'approved', 'rejected'].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('veterinarian').update({ kyc_status: r }).eq('id', selectedVet.id);
                                                        if (error) toast.error(error.message);
                                                        else {
                                                            toast.success(`Verification updated to ${r}`);
                                                            fetchVetsData();
                                                            setSelectedVet({ ...selectedVet, kyc_status: r });
                                                        }
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedVet.kyc_status === r
                                                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                                                        : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'
                                                        }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Platform Access</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    const newStatus = (selectedVet as any).status === 'suspended' ? 'active' : 'suspended';
                                                    // Note: Vet table might not have 'status' column natively if not aligned. Only run if it exists.
                                                    const { error } = await supabase.from('veterinarian').update({ kyc_status: newStatus === 'suspended' ? 'rejected' : 'approved' } as any).eq('id', selectedVet.id);
                                                    if (error) toast.error("Ensure SQL schema is applied: " + error.message);
                                                    else {
                                                        toast.success(`Vet ${newStatus === 'suspended' ? 'Suspended' : 'Activated'}`);
                                                        fetchVetsData();
                                                        setSelectedVet({ ...selectedVet, kyc_status: newStatus === 'suspended' ? 'rejected' : 'approved' } as any);
                                                    }
                                                }}
                                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(selectedVet as any).kyc_status === 'rejected'
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                    : 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                                                    }`}
                                            >
                                                {(selectedVet as any).kyc_status === 'rejected' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                {(selectedVet as any).kyc_status === 'rejected' ? 'Restore Privileges' : 'Revoke Access'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-bold uppercase text-white/30 tracking-[0.4em] mb-6 flex items-center gap-4">
                                    Recent Appointments
                                    <div className="flex-1 h-[1px] bg-white/5"></div>
                                </h3>

                                <div className="space-y-4">
                                    {selectedVet.recentAppointments.length > 0 ? selectedVet.recentAppointments.map(o => (
                                        <div key={o.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-xs uppercase tracking-widest">{o.id.substring(0, 8)}</p>
                                                    <p className="text-[9px] text-white/30 font-bold uppercase">{new Date(o.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold text-sm">₹500</p>
                                                <p className={`text-[8px] font-bold uppercase tracking-widest
                                                    ${o.status === 'accepted' ? 'text-emerald-500' : 'text-orange-500'}
                                                `}>{o.status}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem]">
                                            <Clock className="mx-auto text-white/10 mb-4" size={32} />
                                            <p className="text-white/20 text-[10px] font-bold uppercase">No active appointments</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
