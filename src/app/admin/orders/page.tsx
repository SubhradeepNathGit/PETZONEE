"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag, Search, Filter, Clock, Truck,
    CheckCircle2, XCircle, ChevronRight, Package,
    ArrowUpDown, MoreVertical, MapPin, Phone, Mail,
    RotateCcw, AlertCircle, Loader2, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { toast } from "react-toastify";
import Image from "next/image";

/* Types */
type OrderItem = {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    image_url: string | null;
};

type Order = {
    id: string;
    order_number: string;
    total_amount: number;
    status: 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
    payment_status: 'paid' | 'pending' | 'failed';
    shipping_address: any;
    contact_details: any;
    delivery_type: 'standard' | 'express';
    created_at: string;
    updated_at: string;
    order_items?: OrderItem[];
    user_id?: string;
    user_email?: string;
    payment_method?: string;
    subtotal?: number;
    shipping_cost?: number;
    tax_amount?: number;
    userProfile?: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        avatar_url?: string;
        city?: string;
        state?: string;
        phone?: string;
    };
};

/* Status Config */
const STATUS_BAR = {
    processing: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: Clock, label: 'Processing' },
    shipped: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Truck, label: 'Shipped' },
    delivered: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2, label: 'Delivered' },
    returned: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: RotateCcw, label: 'Returned' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle, label: 'Cancelled' },
};

export default function AdminOrdersPage() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "Admin", avatar: null });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const fetchAllOrders = useCallback(async () => {
        const [ordersRes, usersRes] = await Promise.all([
            supabase
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .order('created_at', { ascending: false }),
            supabase
                .from('users')
                .select('id, first_name, last_name, email, avatar_url, city, state, phone')
        ]);

        if (ordersRes.error) {
            toast.error("Failed to fetch orders");
            return;
        }

        const userMap = new Map((usersRes.data || []).map(u => [u.id, u]));

        const enrichedOrders: Order[] = (ordersRes.data || []).map(o => ({
            ...o,
            userProfile: o.user_id ? userMap.get(o.user_id) : undefined
        }));

        setOrders(enrichedOrders);
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('first_name, avatar_url').eq('id', user.id).maybeSingle();
                setMe({ name: profile?.first_name || "Admin", avatar: profile?.avatar_url || null });
            }
            await fetchAllOrders();
            setLoading(false);
        };
        init();
    }, [fetchAllOrders]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const orderName = o.shipping_address?.name || o.contact_details?.name || o.contact_details?.full_name || "";
            const contactEmail = o.contact_details?.email || "";
            const contactPhone = o.contact_details?.phone || o.shipping_address?.phone || "";
            const userEmail = o.userProfile?.email || o.user_email || "";
            const userName = o.userProfile ? `${o.userProfile.first_name || ''} ${o.userProfile.last_name || ''}`.trim() : "";
            const itemNames = (o.order_items || []).map(it => it.product_name).join(" ");

            const searchLower = search.toLowerCase();
            const matchesSearch = o.order_number.toLowerCase().includes(searchLower) ||
                orderName.toLowerCase().includes(searchLower) ||
                contactEmail.toLowerCase().includes(searchLower) ||
                contactPhone.toLowerCase().includes(searchLower) ||
                userEmail.toLowerCase().includes(searchLower) ||
                userName.toLowerCase().includes(searchLower) ||
                itemNames.toLowerCase().includes(searchLower);
            const matchesStatus = filterStatus === "all" || o.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [orders, search, filterStatus]);

    const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
        const order = orders.find(o => o.id === orderId);
        const updateData: any = { status: newStatus };

        // Auto-refund logic: if cancelled and was paid, mark as refunded
        if (newStatus === 'cancelled' && order?.payment_status === 'paid') {
            updateData.payment_status = 'refunded';
        }

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (error) {
            toast.error("Status update failed");
        } else {
            toast.success(`Order marked as ${newStatus}`);

            // Create notification for user
            if (order?.user_id || order?.user_email) {
                const title = newStatus === 'cancelled' ? 'Order Cancelled' : 'Order Status Updated';
                const message = newStatus === 'cancelled'
                    ? `Your order #${order.order_number} has been cancelled and refund is processing.`
                    : `Your order #${order.order_number} status is now ${newStatus}.`;

                // Fetch user_id if we only have email
                let targetUserId = order.user_id;
                if (!targetUserId && order.user_email) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id')
                        .eq('email', order.user_email)
                        .single();
                    targetUserId = userData?.id;
                }

                if (targetUserId) {
                    await supabase.from('notifications').insert({
                        user_id: targetUserId,
                        title,
                        message,
                        type: newStatus === 'cancelled' ? 'warning' : 'info',
                        link: `/orders/${orderId}`
                    });
                }
            }

            fetchAllOrders();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Accessing Secure Vault...</p>
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
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Order Management</h1>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em]">Full E-commerce Life-cycle Control</p>
                    </div>

                    <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1">
                        {['all', 'processing', 'shipped', 'delivered'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all
                                    ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-white' },
                        { label: 'Pending', value: orders.filter(o => o.status === 'processing').length, icon: Clock, color: 'text-amber-400' },
                        { label: 'Live Shipments', value: orders.filter(o => o.status === 'shipped').length, icon: Truck, color: 'text-blue-400' },
                        { label: 'Revenue', value: `₹${orders.reduce((s, o) => s + Number(o.total_amount), 0).toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-400' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] backdrop-blur-3xl hover:border-white/20 transition-all">
                            <stat.icon size={20} className={`${stat.color} mb-4`} />
                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Search & Tool Bar */}
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 p-2 rounded-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Order ID or Customer Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent border-none outline-none pl-12 pr-6 py-3 text-white text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Orders Table */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Order Info</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Customer</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Payment</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Tracking</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                <AnimatePresence mode="popLayout">
                                    {filteredOrders.map((o) => {
                                        const cfg = STATUS_BAR[o.status];
                                        const StatusIcon = cfg.icon;

                                        const orderName = o.shipping_address?.name || o.contact_details?.name || o.contact_details?.full_name;
                                        const orderEmail = o.contact_details?.email;
                                        const profileName = o.userProfile ? `${o.userProfile.first_name || ''} ${o.userProfile.last_name || ''}`.trim() : "";
                                        const profileEmail = o.userProfile?.email || o.user_email;

                                        const displayName = orderName || profileName || orderEmail || profileEmail || "Customer";
                                        const displayEmail = orderEmail || profileEmail || "";
                                        const city = o.shipping_address?.city || o.userProfile?.city || "N/A";
                                        const avatarUrl = o.userProfile?.avatar_url;
                                        const initial = (displayName?.[0] || displayEmail?.[0] || "U").toUpperCase();

                                        const hasDifferentRecipient = orderName && profileName && orderName.toLowerCase() !== profileName.toLowerCase();

                                        return (
                                            <motion.tr
                                                layout
                                                key={o.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                                onClick={() => setSelectedOrder(o)}
                                            >
                                                <td className="px-8 py-6">
                                                    <p className="text-white font-bold text-sm mb-1">#{o.order_number}</p>
                                                    <p className="text-[10px] text-white/30 font-bold uppercase">{new Date(o.created_at).toLocaleString()}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-xs border border-orange-500/20 overflow-hidden relative flex-shrink-0">
                                                            {avatarUrl ? (
                                                                <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                                                            ) : (
                                                                initial
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-white font-bold text-xs truncate max-w-[160px]" title={displayName}>
                                                                {displayName}
                                                            </p>
                                                            <p className="text-[9px] text-white/30 font-bold uppercase truncate max-w-[160px]">
                                                                {hasDifferentRecipient ? (
                                                                    <span className="text-orange-400/80">By: {profileName} • {city}</span>
                                                                ) : (
                                                                    displayEmail ? `${displayEmail} • ${city}` : city
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold text-[10px] uppercase tracking-wider">{o.payment_method || 'UPI/Card'}</span>
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${o.payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                            {o.payment_status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border}`}>
                                                        <StatusIcon size={12} className={cfg.color} />
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-bold text-white">
                                                    ₹{Number(o.total_amount).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {o.status === 'processing' && (
                                                            <button
                                                                onClick={() => updateOrderStatus(o.id, 'shipped')}
                                                                className="px-4 py-2 bg-blue-500 text-white text-[9px] font-bold uppercase rounded-xl hover:bg-blue-600 transition-all"
                                                            >
                                                                Dispatch
                                                            </button>
                                                        )}
                                                        {o.status === 'shipped' && (
                                                            <button
                                                                onClick={() => updateOrderStatus(o.id, 'delivered')}
                                                                className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-bold uppercase rounded-xl hover:bg-emerald-600 transition-all"
                                                            >
                                                                Deliver
                                                            </button>
                                                        )}
                                                        {o.status !== 'cancelled' && o.status !== 'returned' && (
                                                            <button
                                                                onClick={() => updateOrderStatus(o.id, 'cancelled')}
                                                                className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-bold uppercase rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                            >
                                                                Void
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => setSelectedOrder(o)}
                                                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white border border-white/10"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                    {filteredOrders.length === 0 && (
                        <div className="p-20 text-center">
                            <ShoppingBag className="w-16 h-16 text-white/10 mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-white/40">No orders matching your filters</h3>
                        </div>
                    )}
                </div>
            </main>

            {/* Slide-over Drawer for Order Details */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-end"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            className="relative w-full max-w-2xl h-screen bg-[#0a0a0a] border-l border-white/10 p-8 md:p-12 shadow-2xl overflow-y-auto custom-scrollbar space-y-8"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-black text-white tracking-tight">Order #{selectedOrder.order_number}</h2>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_BAR[selectedOrder.status].bg} ${STATUS_BAR[selectedOrder.status].color} ${STATUS_BAR[selectedOrder.status].border} border`}>
                                            {STATUS_BAR[selectedOrder.status].label}
                                        </span>
                                    </div>
                                    <p className="text-white/40 text-xs font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {/* Status Actions */}
                            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl space-y-4">
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Update Order Status</p>
                                <div className="flex flex-wrap gap-2">
                                    {(['processing', 'shipped', 'delivered', 'cancelled'] as const).map((st) => (
                                        <button
                                            key={st}
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, st);
                                                setSelectedOrder(prev => prev ? { ...prev, status: st } : null);
                                            }}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                selectedOrder.status === st
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                                                    : 'bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Customer & Shipping Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl space-y-3">
                                    <div className="flex items-center gap-2 text-orange-500 mb-1">
                                        <User size={16} />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Order Placer (Account)</h3>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-bold uppercase">Account Name</p>
                                        <p className="text-white font-bold text-sm">
                                            {selectedOrder.userProfile ? `${selectedOrder.userProfile.first_name || ''} ${selectedOrder.userProfile.last_name || ''}`.trim() : (selectedOrder.contact_details?.name || "Guest User")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-bold uppercase">Account Email</p>
                                        <p className="text-white font-medium text-xs break-all">{selectedOrder.userProfile?.email || selectedOrder.contact_details?.email || selectedOrder.user_email || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-bold uppercase">Phone</p>
                                        <p className="text-white font-medium text-xs">{selectedOrder.userProfile?.phone || selectedOrder.contact_details?.phone || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl space-y-3">
                                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                                        <MapPin size={16} />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Delivery & Recipient</h3>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-bold uppercase">Recipient Name</p>
                                        <p className="text-white font-bold text-sm">
                                            {selectedOrder.shipping_address?.name || selectedOrder.contact_details?.name || (selectedOrder.userProfile ? `${selectedOrder.userProfile.first_name || ''} ${selectedOrder.userProfile.last_name || ''}`.trim() : "") || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-bold uppercase">Delivery Address</p>
                                        <p className="text-white/80 text-xs leading-relaxed">
                                            {selectedOrder.shipping_address?.line1 || "No street address"}
                                            {selectedOrder.shipping_address?.line2 ? `, ${selectedOrder.shipping_address.line2}` : ""}
                                        </p>
                                        <p className="text-white/80 text-xs font-medium">
                                            {selectedOrder.shipping_address?.city || selectedOrder.userProfile?.city || "N/A"}
                                            {selectedOrder.shipping_address?.state ? `, ${selectedOrder.shipping_address.state}` : ""}
                                            {selectedOrder.shipping_address?.pincode ? ` - ${selectedOrder.shipping_address.pincode}` : ""}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                                    <Package size={16} className="text-orange-500" />
                                    Order Items ({selectedOrder.order_items?.length || 0})
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.order_items?.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0">
                                                    {item.image_url ? (
                                                        <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20"><Package size={20} /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{item.product_name}</p>
                                                    <p className="text-white/40 text-[10px] uppercase font-medium">Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-white font-bold text-base">₹{(item.quantity * item.unit_price).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Payment Summary</h3>
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>Payment Method</span>
                                    <span className="font-bold text-white uppercase">{selectedOrder.payment_method || 'Card / UPI'}</span>
                                </div>
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>Payment Status</span>
                                    <span className={`font-bold uppercase ${selectedOrder.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedOrder.payment_status}</span>
                                </div>
                                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                    <span className="text-white font-bold text-sm">Total Paid</span>
                                    <span className="text-2xl font-black text-white">₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
