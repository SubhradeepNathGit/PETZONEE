"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Crown, Users, CreditCard, Activity,
    Search, ShieldCheck, ArrowRight, User,
    TrendingUp, Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import { format, subDays, isSameDay, startOfDay } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

type SubscriptionRow = {
    id: string;
    user_id: string;
    plan_name: string;
    price: number;
    period: string;
    status: string;
    start_date: string;
    end_date: string;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
    };
};

export default function AdminSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<'active' | 'payments'>('active');

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("users")
                .select("role, first_name, avatar_url")
                .eq("id", user.id)
                .single();

            setMe({
                name: profile?.first_name || "Admin",
                avatar: profile?.avatar_url || null,
                role: profile?.role || "user"
            });

            if (profile?.role === "admin") {
                const { data: subs } = await supabase
                    .from("user_subscriptions")
                    .select(`
            *,
            user:users (first_name, last_name, email)
          `)
                    .order('created_at', { ascending: false });

                setSubscriptions((subs as any) || []);

                const { data: pays } = await supabase
                    .from("orders")
                    .select(`
                        *,
                        user:users (first_name, last_name, email)
                    `)
                    .eq('is_subscription_purchase', true)
                    .order('created_at', { ascending: false });

                setPayments(pays || []);
            }
            setLoading(false);
        };
        init();
    }, [refreshTrigger]);

    const stats = useMemo(() => {
        const active = subscriptions.filter(s => s.status === 'active');
        const mrr = active.reduce((sum, s) => {
            const monthlyPrice = s.period === 'year' ? s.price / 12 : s.price;
            return sum + monthlyPrice;
        }, 0);

        const distribution = {
            Premium: active.filter(s => s.plan_name === 'Premium Care').length,
            Complete: active.filter(s => s.plan_name === 'Complete Care').length,
            Essential: active.filter(s => s.plan_name === 'Essential Care').length,
        };

        return { totalActive: active.length, mrr, distribution };
    }, [subscriptions]);

    const chartData = useMemo(() => {
        // Last 7 days revenue trend
        const days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
        return days.map(day => {
            const dayStart = startOfDay(day);
            const total = payments
                .filter(p => isSameDay(new Date(p.created_at), dayStart))
                .reduce((sum, p) => sum + (p.total_amount || 0), 0);
            return {
                name: format(day, "dd MMM"),
                revenue: total
            };
        });
    }, [payments]);

    const pieData = useMemo(() => {
        const active = subscriptions.filter(s => s.status === 'active');
        return [
            { name: 'Essential', value: active.filter(s => s.plan_name === 'Essential Care').length, color: '#60A5FA' },
            { name: 'Complete', value: active.filter(s => s.plan_name === 'Complete Care').length, color: '#F87171' },
            { name: 'Premium', value: active.filter(s => s.plan_name === 'Premium Care').length, color: '#FBBF24' },
        ].filter(d => d.value > 0);
    }, [subscriptions]);

    const handleCancelSubscription = async (subId: string) => {
        if (!confirm("Are you sure you want to cancel this subscription? This will stop all benefits for the user.")) return;

        const { error } = await supabase
            .from("user_subscriptions")
            .update({ status: 'cancelled' })
            .eq('id', subId);

        if (error) {
            toast.error("Failed to cancel subscription");
        } else {
            toast.success("Subscription cancelled successfully");
            setRefreshTrigger(p => p + 1);
        }
    };

    const filtered = subscriptions.filter(s =>
        s.plan_name.toLowerCase().includes(search.toLowerCase()) ||
        s.user?.email.toLowerCase().includes(search.toLowerCase()) ||
        s.user?.first_name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me?.name} avatarUrl={me?.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Activity className="w-12 h-12 text-orange-500 animate-pulse mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Loading Memberships...</p>
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            Member Subscriptions
                            <Crown className="text-yellow-500 w-6 h-6" />
                        </h1>
                        <p className="text-white/30 text-xs font-medium uppercase tracking-[0.4em]">Membership Revenue & Lifecycle Control</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by plan, email or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm"
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="Active Plans" value={stats.totalActive} icon={<Users className="text-blue-500" />} color="blue" />
                    <StatCard label="Est. MRR" value={`₹${Math.round(stats.mrr).toLocaleString()}`} icon={<CreditCard className="text-emerald-500" />} color="emerald" />
                    <StatCard label="Total Sub Revenue" value={`₹${payments.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString()}`} icon={<TrendingUp className="text-yellow-500" />} color="orange" />
                    <StatCard label="Active Conversion" value={`${subscriptions.length > 0 ? Math.round((stats.totalActive / subscriptions.length) * 100) : 0}%`} icon={<Activity className="text-cyan-500" />} color="cyan" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-black text-xs uppercase tracking-widest">Revenue Growth (Last 7 Days)</h3>
                            <TrendingUp className="text-orange-500 w-4 h-4" />
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#ffffff20"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#ffffff20"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `₹${v}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRev)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest">Plan Distribution</h3>
                        <div className="h-[250px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        formatter={(v) => <span className="text-[10px] text-white/60 uppercase font-black tracking-widest">{v}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-max">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Active Subscribers
                    </button>
                    <button
                        onClick={() => setViewMode('payments')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'payments' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Payment History
                    </button>
                </div>

                {/* Table */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        {viewMode === 'active' ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Subscriber</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Plan Details</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Validity</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Revenue</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filtered.map((sub) => (
                                        <tr key={sub.id} className="group hover:bg-white/[0.02] transition-all">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold tracking-tight uppercase leading-tight">
                                                            {sub.user?.first_name} {sub.user?.last_name}
                                                        </p>
                                                        <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mt-1">
                                                            {sub.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-white font-bold uppercase tracking-tight">{sub.plan_name}</p>
                                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                                        Billed {sub.period === 'year' ? 'Annually' : 'Monthly'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sub.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-white/60 font-medium text-xs">
                                                    <Calendar size={12} className="text-white/20" />
                                                    Expires {format(new Date(sub.end_date), 'dd MMM yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-white font-black text-lg tracking-tighter">₹{Number(sub.price).toLocaleString()}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {sub.status === 'active' && (
                                                    <button
                                                        onClick={() => handleCancelSubscription(sub.id)}
                                                        className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                        title="Cancel Subscription"
                                                    >
                                                        <Activity size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Customer</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Transaction ID</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Plan Bought</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {payments.map((pay) => (
                                        <tr key={pay.id} className="group hover:bg-white/[0.02] transition-all">
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="text-white font-bold tracking-tight uppercase leading-tight">
                                                        {pay.user?.first_name} {pay.user?.last_name}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mt-1">
                                                        {pay.user?.email}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 font-mono text-[9px] text-white/40 uppercase">
                                                {pay.id}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-white font-bold uppercase tracking-tight text-xs flex items-center gap-2">
                                                    <ShieldCheck size={12} className="text-orange-500" /> Subscription Purchase
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-white/60 font-medium text-xs">
                                                    {format(new Date(pay.created_at), 'dd MMM yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-emerald-400 font-black text-lg tracking-tighter">₹{Number(pay.total_amount).toLocaleString()}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "from-blue-500 to-indigo-600 shadow-blue-500/10",
        orange: "from-orange-500 to-yellow-600 shadow-orange-500/10",
        emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/10",
        cyan: "from-cyan-500 to-blue-500 shadow-cyan-500/10",
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6 group hover:border-white/10 transition-all shadow-2xl relative overflow-hidden"
        >
            <div className="flex items-center justify-between relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">{label}</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
            </div>
            <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br ${colors[color]} blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity`}></div>
        </motion.div>
    );
}
