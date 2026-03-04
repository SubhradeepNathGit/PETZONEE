"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Search, User, Mail, Phone, MapPin,
    Calendar, ShoppingCart, TrendingUp, ChevronRight,
    Search as SearchIcon, Filter, ArrowUpRight, Loader2,
    Clock, Package, CheckCircle2, XCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { toast } from "react-toastify";
import Image from "next/image";

/* Types */
type UserProfile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    created_at: string;
};

type OrderSummary = {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
};

type UserWithStats = UserProfile & {
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string | null;
    recentOrders: OrderSummary[];
};

export default function AdminUsersPage() {
    const [loading, setLoading] = useState(true);
    const [usersWithStats, setUsersWithStats] = useState<UserWithStats[]>([]);
    const [search, setSearch] = useState("");
    const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "Admin", avatar: null });
    const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);

    const fetchUsersData = useCallback(async () => {
        try {
            const [usersRes, ordersRes] = await Promise.all([
                supabase.from('users').select('*').order('created_at', { ascending: false }),
                supabase.from('orders').select('id, user_id, total_amount, status, created_at, order_number').order('created_at', { ascending: false })
            ]);

            if (usersRes.error) throw usersRes.error;
            if (ordersRes.error) throw ordersRes.error;

            const users = usersRes.data as UserProfile[];
            const orders = ordersRes.data || [];

            const stats = users.map(u => {
                const userOrders = orders.filter(o => o.user_id === u.id || o.user_id === (u as any).user_id);
                const successfulOrders = userOrders.filter(o => o.status !== 'cancelled' && o.status !== 'returned');

                return {
                    ...u,
                    orderCount: userOrders.length,
                    totalSpent: successfulOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
                    lastOrderDate: userOrders[0]?.created_at || null,
                    recentOrders: userOrders.slice(0, 5) as OrderSummary[]
                };
            });

            setUsersWithStats(stats);
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
            await fetchUsersData();
            setLoading(false);
        };
        init();
    }, [fetchUsersData]);

    const filteredUsers = useMemo(() => {
        return usersWithStats.filter(u =>
            u.first_name.toLowerCase().includes(search.toLowerCase()) ||
            u.last_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
    }, [usersWithStats, search]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Indexing Users...</p>
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
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">User Directory</h1>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em]">Lifecycle & Retention Analytics</p>
                    </div>

                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 px-8 py-5 rounded-[2rem]">
                        <div>
                            <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1 text-right">Active Reach</p>
                            <p className="text-2xl font-bold text-white text-right">{usersWithStats.length}</p>
                        </div>
                        <div className="w-[1px] h-10 bg-white/10"></div>
                        <Users className="text-blue-500" size={32} />
                    </div>
                </div>

                {/* Search */}
                <div className="relative group bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-all">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={20} />
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
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">User Identity</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Engagement</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">LTV (Revenue)</th>
                                    <th className="px-8 py-6 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10 overflow-hidden shadow-lg">
                                                    {u.avatar_url ? (
                                                        <Image src={u.avatar_url} alt={u.first_name} width={48} height={48} className="object-cover" />
                                                    ) : (
                                                        <User size={20} className="text-blue-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{u.first_name} {u.last_name}</p>
                                                    <p className="text-white/30 text-[10px] font-bold">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                                <ShoppingCart size={12} className="text-blue-400" />
                                                <span className="text-[10px] font-bold text-white/80">{u.orderCount} Orders</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-white font-bold text-lg">₹{u.totalSpent.toLocaleString()}</p>
                                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest tracking-widest">Growth +{Math.round(u.totalSpent / 500)}%</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => setSelectedUser(u)}
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

            {/* Sidebar View for User Details */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-end"
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedUser(null)} />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            className="relative w-full max-w-xl h-screen bg-[#0a0a0a] border-l border-white/10 p-8 md:p-12 shadow-2xl overflow-y-auto custom-scrollbar"
                        >
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="mb-10 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                            >
                                <XCircle size={24} />
                            </button>

                            <div className="flex items-center gap-8 mb-12">
                                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-2xl overflow-hidden">
                                    {selectedUser.avatar_url ? (
                                        <Image src={selectedUser.avatar_url} alt={selectedUser.first_name} width={96} height={96} className="w-full h-full object-cover rounded-[1.8rem]" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20"><User size={40} /></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">{selectedUser.first_name} {selectedUser.last_name}</h2>
                                    <p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Corporate Profile Verified</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-12">
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Mail className="text-blue-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Electronic Mail</p>
                                    <p className="text-xs font-bold text-white truncate">{selectedUser.email}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Phone className="text-emerald-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Secure Line</p>
                                    <p className="text-xs font-bold text-white whitespace-nowrap">{selectedUser.phone || 'Not Shared'}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <Calendar className="text-orange-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Joined Network</p>
                                    <p className="text-xs font-bold text-white">{new Date(selectedUser.created_at).toDateString()}</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                                    <TrendingUp className="text-purple-500 mb-4" size={20} />
                                    <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mb-1">Network LTV</p>
                                    <p className="text-xs font-bold text-white">₹{selectedUser.totalSpent.toLocaleString()}</p>
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
                                        <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Authority Level</p>
                                        <div className="flex gap-2">
                                            {['user', 'vet', 'admin'].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('users').update({ role: r }).eq('id', selectedUser.id);
                                                        if (error) toast.error(error.message);
                                                        else {
                                                            toast.success(`Role updated to ${r}`);
                                                            fetchUsersData();
                                                            setSelectedUser({ ...selectedUser, role: r });
                                                        }
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedUser.role === r
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'
                                                        }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Account Lifecycle Status</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    const newStatus = (selectedUser as any).status === 'suspended' ? 'active' : 'suspended';
                                                    const { error } = await supabase.from('users').update({ status: newStatus } as any).eq('id', selectedUser.id);
                                                    if (error) toast.error("Ensure SQL schema is applied: " + error.message);
                                                    else {
                                                        toast.success(`User ${newStatus === 'suspended' ? 'Suspended' : 'Activated'}`);
                                                        fetchUsersData();
                                                        setSelectedUser({ ...selectedUser, status: newStatus } as any);
                                                    }
                                                }}
                                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(selectedUser as any).status === 'suspended'
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                    : 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                                                    }`}
                                            >
                                                {(selectedUser as any).status === 'suspended' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                {(selectedUser as any).status === 'suspended' ? 'Reactivate Account' : 'Suspend Access'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-bold uppercase text-white/30 tracking-[0.4em] mb-6 flex items-center gap-4">
                                    Recent Purchase History
                                    <div className="flex-1 h-[1px] bg-white/5"></div>
                                </h3>

                                <div className="space-y-4">
                                    {selectedUser.recentOrders.length > 0 ? selectedUser.recentOrders.map(o => (
                                        <div key={o.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-xs">#{o.order_number}</p>
                                                    <p className="text-[9px] text-white/30 font-bold uppercase">{new Date(o.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold text-sm">₹{o.total_amount.toLocaleString()}</p>
                                                <p className={`text-[8px] font-bold uppercase tracking-widest
                                                    ${o.status === 'delivered' ? 'text-emerald-500' : 'text-orange-500'}
                                                `}>{o.status}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem]">
                                            <Clock className="mx-auto text-white/10 mb-4" size={32} />
                                            <p className="text-white/20 text-[10px] font-bold uppercase">No active purchase records</p>
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

