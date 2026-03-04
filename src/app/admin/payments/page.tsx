"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, CheckCircle, Clock, Search, Filter,
    ArrowRight, ShieldCheck, Stethoscope, IndianRupee,
    Loader2, AlertCircle, User, Activity, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Sidebar from '@/components/sidebar';
import Image from 'next/image';

type PaymentAppointment = {
    id: string;
    created_at: string;
    appointment_time: string;
    fee_at_booking: number;
    paid_to_vet: boolean;
    is_completed: boolean;
    completed_at: string;
    vet_id: string;
    user_id: string;
    is_subscription_benefit: boolean;
    is_free_visit: boolean;
    veterinarian: {
        name: string;
        avatar_url: string | null;
        specialization: string;
    };
    user: {
        first_name: string;
        last_name: string;
    };
};

export default function VetPaymentsPage() {
    const [appointments, setAppointments] = useState<PaymentAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
    const [me, setMe] = useState<any>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
                setMe(profile);
            }

            const { data, error } = await supabase
                .from('appointments')
                .select(`
          id, created_at, appointment_time, fee_at_booking, paid_to_vet, is_completed, completed_at, vet_id, user_id, 
          is_subscription_benefit, is_free_visit,
          veterinarian:veterinarian(name, avatar_url, specialization),
          user:users(first_name, last_name)
        `)
                .or('is_free_visit.eq.true,is_subscription_benefit.eq.true')
                .eq('is_completed', true)
                .order('completed_at', { ascending: false });

            if (error) throw error;
            setAppointments(data as any);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            setProcessingId(id);
            const { error } = await supabase
                .from('appointments')
                .update({ paid_to_vet: true })
                .eq('id', id);

            if (error) throw error;

            setAppointments(prev => prev.map(a => a.id === id ? { ...a, paid_to_vet: true } : a));
        } catch (err) {
            console.error('Update error:', err);
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = appointments.filter(a => {
        const matchesSearch =
            a.veterinarian?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'paid') return matchesSearch && a.paid_to_vet;
        if (filter === 'unpaid') return matchesSearch && !a.paid_to_vet;
        return matchesSearch;
    });

    const totalOwed = appointments
        .filter(a => !a.paid_to_vet)
        .reduce((sum, a) => sum + (a.fee_at_booking || 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me?.first_name || 'Admin'} avatarUrl={me?.avatar_url} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Activity className="w-12 h-12 text-orange-500 animate-pulse mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Calculating Payouts...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                <Sidebar role="admin" name={me?.first_name || 'Admin'} avatarUrl={me?.avatar_url} />
            </aside>

            <main className="lg:ml-72 p-6 md:p-10 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            Vet Compensation
                            <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black border border-emerald-400/30 uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20">Revenue Flow</span>
                        </h1>
                        <p className="text-white/30 text-xs font-medium uppercase tracking-[0.4em]">Tracking Subscription & First-Visit Payouts to Veterinarians</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <IndianRupee size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Outstanding</p>
                                <p className="text-xl font-black text-white tracking-tighter">₹{totalOwed.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Vet or Patient..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all font-medium"
                        />
                    </div>

                    <div className="flex bg-[#0a0a0a] p-1.5 rounded-full border border-white/10">
                        {(['all', 'unpaid', 'paid'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table/List */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Veterinarian / Practice</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Patient / Session</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Compensation</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode='popLayout'>
                                {filtered.map((appt) => (
                                    <motion.tr
                                        key={appt.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="group hover:bg-white/[0.02] transition-all"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black p-0.5 border border-white/5">
                                                    <div className="w-full h-full rounded-[0.6rem] overflow-hidden bg-black flex items-center justify-center">
                                                        {appt.veterinarian?.avatar_url ? (
                                                            <Image src={appt.veterinarian.avatar_url} alt="" width={48} height={48} className="object-cover" />
                                                        ) : (
                                                            <Stethoscope size={20} className="text-white/10" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{appt.veterinarian?.name}</p>
                                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{appt.veterinarian?.specialization || 'Clinical Vet'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-white uppercase tracking-tight">{appt.user?.first_name} {appt.user?.last_name}</p>
                                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={10} className="text-orange-500" />
                                                    {format(new Date(appt.completed_at), 'dd MMM yyyy, HH:mm')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-white font-black text-xl tracking-tighter">
                                                <span className="text-xs text-white/30 font-bold tracking-normal uppercase mr-1">₹</span>
                                                {appt.fee_at_booking.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {appt.paid_to_vet ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                                    <CheckCircle size={10} /> Paid
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-widest">
                                                    <Clock size={10} /> Pending Payout
                                                </div>
                                            )}
                                            {appt.is_subscription_benefit && (
                                                <div className="mt-2 text-[8px] font-black text-blue-500 uppercase tracking-widest block">Subscription Benefit</div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {!appt.paid_to_vet && (
                                                <button
                                                    disabled={processingId === appt.id}
                                                    onClick={() => handleMarkAsPaid(appt.id)}
                                                    className="px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                >
                                                    {processingId === appt.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Settle Payment'}
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center space-y-4">
                            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/10">
                                <AlertCircle size={40} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-black text-xl uppercase tracking-tighter">No Payment Records</p>
                                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Adjust filters or check back later</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
