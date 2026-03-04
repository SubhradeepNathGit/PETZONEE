'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Truck, CheckCircle2, XCircle, RotateCcw,
    ChevronRight, Clock, MapPin, CreditCard, ShoppingBag,
    Loader2, AlertCircle, Calendar, Info, Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

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
    payment_method?: string;
    delivery_type: 'standard' | 'express';
    created_at: string;
    updated_at: string;
    order_items?: OrderItem[];
};

/* Helpers */
function fmtDate(iso: string): string {
    try {
        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium', timeZone: 'Asia/Kolkata',
        }).format(new Date(iso));
    } catch { return iso; }
}

function formatINR(v: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(v);
}

function prettyPayMode(mode: string | undefined) {
    const modes: Record<string, string> = { card: "Credit/Debit Card", upi: "UPI Payment", netbanking: "Net Banking", wallet: "Digital Wallet" };
    return modes[mode || "card"] || "Online Payment";
}

/* Status Config */
const STATUS_CONFIG = {
    processing: {
        pill: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        dot: 'bg-amber-500',
        label: 'Processing',
        icon: Clock,
        step: 0,
    },
    shipped: {
        pill: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        dot: 'bg-blue-500',
        label: 'In Transit',
        icon: Truck,
        step: 1,
    },
    delivered: {
        pill: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        dot: 'bg-emerald-500',
        label: 'Delivered',
        icon: CheckCircle2,
        step: 2,
    },
    returned: {
        pill: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        dot: 'bg-purple-500',
        label: 'Returned',
        icon: RotateCcw,
        step: -1,
    },
    cancelled: {
        pill: 'bg-red-500/20 text-red-400 border border-red-500/30',
        dot: 'bg-red-500',
        label: 'Cancelled',
        icon: XCircle,
        step: -1,
    },
};

/* Components */
function TrackingBar({ status }: { status: Order['status'] }) {
    const cfg = STATUS_CONFIG[status];
    if (cfg.step === -1) return null;

    const steps = ['Processing', 'Shipped', 'Delivered'];

    return (
        <div className="mt-6 mb-2">
            <div className="flex justify-between mb-2">
                {steps.map((label, i) => (
                    <span key={label} className={`text-[9px] font-bold uppercase tracking-widest ${i <= cfg.step ? 'text-white' : 'text-white/20'}`}>
                        {label}
                    </span>
                ))}
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((cfg.step + 1) / steps.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                />
            </div>
        </div>
    );
}

function PrintInvoice({ order }: { order: Order | null }) {
    if (!order) return null;

    const tax = order.total_amount * 0.18;

    return (
        <div className="hidden print:block font-serif text-black p-8 max-w-[210mm] mx-auto bg-white h-full overflow-visible print-force-white">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">INVOICE</h1>
                    <p className="text-sm text-gray-600 mt-1 uppercase tracking-widest">Original Receipt</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-orange-600">PETZONEE</h2>
                    <p className="text-sm text-gray-600 mt-1">Premium Pet Care & Accessories</p>
                    <p className="text-xs text-gray-500 mt-1">GST: 07AABCP0123A1Z5</p>
                </div>
            </div>

            {/* Meta & Addresses */}
            <div className="flex justify-between items-start mb-10">
                <div className="w-1/2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                    <p className="font-bold text-gray-900 text-lg">{order.shipping_address.name || 'Customer'}</p>
                    <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                        <p>{order.shipping_address.line1}</p>
                        {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                        <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</p>
                        <div className="mt-2 text-xs space-y-0.5">
                            <p>Ph: {order.contact_details.phone}</p>
                            <p className="break-all text-[10px] text-gray-500">{order.contact_details.email}</p>
                        </div>
                    </div>
                </div>

                <div className="w-1/3 text-right">
                    <div className="space-y-1">
                        <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-sm text-gray-500">Invoice No:</span>
                            <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-sm text-gray-500">Date:</span>
                            <span className="text-sm font-bold text-gray-900">{fmtDate(order.created_at)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-sm text-gray-500">Method:</span>
                            <span className="text-sm font-bold text-gray-900">{prettyPayMode(order.payment_method)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-left py-2 font-bold text-gray-900 uppercase tracking-wider w-1/2">Item Description</th>
                            <th className="text-center py-2 font-bold text-gray-900 uppercase tracking-wider">Qty</th>
                            <th className="text-right py-2 font-bold text-gray-900 uppercase tracking-wider">Price</th>
                            <th className="text-right py-2 font-bold text-gray-900 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {order.order_items?.map((item) => (
                            <tr key={item.id}>
                                <td className="py-3 text-gray-800 font-medium">{item.product_name}</td>
                                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                                <td className="py-3 text-right text-gray-600">₹{item.unit_price.toLocaleString()}</td>
                                <td className="py-3 text-right font-bold text-gray-900">₹{(item.unit_price * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 space-y-2">
                    <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-600">Tax (18%) Included</span>
                        <span className="font-medium text-gray-900">₹{Math.round(tax).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-600">Delivery</span>
                        <span className="font-medium text-gray-900">{order.delivery_type === 'express' ? '₹99' : 'Free'}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t-2 border-gray-800 pt-3 mt-2">
                        <span className="text-gray-900">Total Paid</span>
                        <span className="text-gray-900">₹{order.total_amount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
                <p className="font-bold text-gray-900 mb-1">Thank you for your business!</p>
                <p>For any queries, contact support@petzonee.com or call +91 98765 43210</p>
                <p className="mt-4 italic">This is a computer generated invoice and does not require a physical signature.</p>
                <div className="mt-4 text-[10px] text-gray-400">
                    Page 1 of 1 • Printed on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}

function OrderCard({ order, onReturn, onViewInvoice }: {
    order: Order;
    onReturn?: (id: string) => void;
    onViewInvoice: (order: Order) => void;
}) {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
    const StatusIcon = cfg.icon;

    const deliveredDate = order.status === 'delivered' ? new Date(order.updated_at) : null;
    const canReturn = deliveredDate &&
        ((new Date().getTime() - deliveredDate.getTime()) / (1000 * 3600 * 24)) <= 7 &&
        order.status === 'delivered';

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white/[0.03] backdrop-blur-3xl rounded-2xl border border-white/10 overflow-hidden hover:border-orange-500/30 transition-all duration-500"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">Order #{order.order_number}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${cfg.pill}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={10} /> Placed on {fmtDate(order.created_at)}
                        </p>
                    </div>
                    <div className="text-right sm:text-right w-full sm:w-auto">
                        <p className="text-2xl font-bold text-white">{formatINR(order.total_amount)}</p>
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Total Amount Paid</p>
                    </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-3 mb-6">
                    {order.order_items?.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="relative h-12 w-12 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                    <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/20"><Package size={20} /></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{item.product_name}</h4>
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Qty: {item.quantity} × {formatINR(item.unit_price)}</p>
                            </div>
                        </div>
                    ))}
                    {(order.order_items?.length || 0) > 2 && (
                        <p className="text-center text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] py-1">
                            + {order.order_items!.length - 2} more items
                        </p>
                    )}
                </div>

                {/* Tracking */}
                <TrackingBar status={order.status} />

                {/* Footer Actions */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-4 text-white/40">
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-orange-500/50" />
                            <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[150px]">
                                {order.shipping_address.city}, {order.shipping_address.state}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard size={12} className="text-orange-500/50" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{order.delivery_type === 'express' ? 'Fast Exp' : 'Std Del'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {canReturn && (
                            <button
                                onClick={() => onReturn?.(order.id)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-all"
                            >
                                <RotateCcw size={14} />
                                Request Return
                            </button>
                        )}
                        <button
                            onClick={() => onViewInvoice(order)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                        >
                            View Invoice
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="text-center py-20 rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.02] backdrop-blur-3xl">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/10 border border-white/5 shadow-2xl">
            <ShoppingBag size={36} />
        </div>
        <h3 className="text-white text-2xl font-bold tracking-tight mb-2">{title}</h3>
        <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">{subtitle}</p>
    </div>
);

export default function UserOrdersView({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const handleViewInvoice = (order: Order) => {
        setSelectedOrder(order);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const fetchOrders = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to load orders: ' + error.message);
            return;
        }
        setOrders(data || []);
    }, []);

    useEffect(() => {
        if (!userId) return;
        (async () => {
            setLoading(true);
            await fetchOrders(userId);
            setLoading(false);

            // Real-time updates
            const channel = supabase
                .channel(`orders-user-${userId}`)
                .on('postgres_changes', {
                    event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}`
                }, () => fetchOrders(userId))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        })();
    }, [userId, fetchOrders]);

    const handleReturn = async (orderId: string) => {
        if (!confirm('Are you sure you want to request a return for this order?')) return;

        const { error } = await supabase
            .from('orders')
            .update({ status: 'returned' })
            .eq('id', orderId);

        if (error) {
            toast.error('Failed to process return: ' + error.message);
        } else {
            toast.success('Return requested successfully');
            fetchOrders(userId);
        }
    };

    const { active, history } = useMemo(() => {
        const act: Order[] = [], hist: Order[] = [];
        for (const o of orders) {
            if (o.status === 'delivered' || o.status === 'returned' || o.status === 'cancelled') hist.push(o);
            else act.push(o);
        }
        return { active: act, history: hist };
    }, [orders]);

    if (loading) {
        return (
            <div className="py-20 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-6" />
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.5em]">Synchronizing Shipments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Start: Web UI (Hidden on Print) */}
            <div className="space-y-12 print:hidden">
                {/* Main Header Card */}
                <div className="relative group overflow-hidden bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-10 md:p-14 backdrop-blur-3xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-24 -mb-24 blur-3xl opacity-30" />

                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                        <div className="flex gap-8 items-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-2xl shadow-orange-500/20 transform group-hover:scale-110 transition-transform duration-500">
                                <ShoppingBag size={36} />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-2">My Shipments</h1>
                                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em]">Purchase Tracking Console</p>
                            </div>
                        </div>

                        <div className="flex gap-10">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white leading-none mb-3">{active.length}</p>
                                <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[8px] font-bold uppercase tracking-widest border border-orange-500/20">Active</span>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white/40 leading-none mb-3">{history.length}</p>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-white/30 text-[8px] font-bold uppercase tracking-widest border border-white/10">History</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-12">
                    <div className="space-y-14">
                        {/* Active Tracking */}
                        <section>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">Live Tracking</h2>
                                    <p className="text-[9px] font-bold text-orange-500/50 uppercase tracking-[0.2em]">Real-time logistics status</p>
                                </div>
                            </div>

                            {active.length === 0 ? (
                                <EmptyState title="No active shipments" subtitle="Start shopping to fill your trackings" />
                            ) : (
                                <div className="grid gap-6">
                                    {active.map(o => <OrderCard key={o.id} order={o} onViewInvoice={handleViewInvoice} />)}
                                </div>
                            )}
                        </section>

                        {/* Order History */}
                        <section>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white/60 tracking-tight leading-none mb-1 text-white/40">Complete History</h2>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Resolved purchase records</p>
                                </div>
                            </div>

                            {history.length === 0 ? (
                                <div className="py-10 text-center text-white/20 text-[10px] font-bold uppercase tracking-[0.5em] border border-dashed border-white/5 rounded-3xl">
                                    Archive is empty
                                </div>
                            ) : (
                                <div className="grid gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                    {history.map(o => <OrderCard key={o.id} order={o} onReturn={handleReturn} onViewInvoice={handleViewInvoice} />)}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-8 print:hidden">
                        <div className="p-8 rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-3xl">
                            <h4 className="flex items-center gap-3 text-white text-[10px] font-bold uppercase tracking-[0.4em] mb-8">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                                Policy Hub
                            </h4>
                            <div className="space-y-10">
                                {[
                                    { title: 'Return Window', desc: 'Return products within 7 days of delivery for a full refund.', icon: <RotateCcw size={16} /> },
                                    { title: 'Tracking Alerts', desc: 'SMS notifications for shipped & out for delivery status.', icon: <Info size={16} /> },
                                    { title: 'Refund Flow', desc: 'Credits appear in source account within 5-7 business days.', icon: <CreditCard size={16} /> }
                                ].map(p => (
                                    <div key={p.title} className="group/p cursor-default">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="text-orange-500/50 group-hover/p:text-orange-500 transition-colors">{p.icon}</div>
                                            <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">{p.title}</p>
                                        </div>
                                        <p className="text-white/40 text-xs font-medium leading-relaxed group-hover/p:text-white/60 transition-colors tracking-tight">
                                            {p.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 group">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-black mb-6 shadow-xl shadow-white/10 transform group-hover:rotate-12 transition-transform">
                                    <ShoppingBag size={24} />
                                </div>
                                <h4 className="text-white font-bold text-lg mb-3">Loyalty Program</h4>
                                <p className="text-white/40 text-[11px] font-bold leading-relaxed mb-6 uppercase tracking-wider">Earn 10 PETZ points on every purchase above ₹500.</p>
                                <button className="w-full py-3.5 rounded-xl bg-white/[0.08] border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-orange-500 transition-all">
                                    Redeem Points
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* End: Web UI */}

            {/* Start: Print UI (Visible only on Print) */}
            <div className="print-invoice-container">
                <PrintInvoice order={selectedOrder} />
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: A4;
                    }
                    /* Force white background on the browser's print context */
                    html, body {
                        background-color: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide specific layout elements that might interfere */
                    .print\:hidden, nav, aside, header, footer, [role="navigation"], .sidebar {
                        display: none !important;
                    }

                    /* Aggressive shadow/filter neutralization for ancestors */
                    * {
                        box-shadow: none !important;
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                        text-shadow: none !important;
                    }

                    /* Force the invoice to be on top of everything and pure white */
                    .print-invoice-container {
                        display: block !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        background: white !important;
                        z-index: 2147483647 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Force children to be white/black */
                    .print-force-white, .print-force-white * {
                        background-color: white !important;
                        color: black !important;
                        border-color: #000 !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                    
                    /* Specificity boost for the orange logo */
                    .text-orange-600 {
                        color: #ea580c !important;
                    }
                }
            `}</style>
        </div>
    );
}
