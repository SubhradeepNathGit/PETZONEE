'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Bell, CheckCircle2, AlertCircle, Info,
    Trash2, ExternalLink, Calendar, Package
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    is_read: boolean;
    link: string | null;
    created_at: string;
};

export default function NotificationDrawer({
    isOpen,
    onClose,
    userId
}: {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!userId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error) setNotifications(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchNotifications();

            // Realtime subscription
            const channel = supabase.channel(`notifications-${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, userId]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const markAllRead = async () => {
        if (!userId) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-emerald-400" size={18} />;
            case 'warning': return <AlertCircle className="text-amber-400" size={18} />;
            case 'error': return <X className="text-rose-400" size={18} />;
            default: return <Info className="text-blue-400" size={18} />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-black/60 backdrop-blur-3xl border-l border-white/10 z-[70] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Notifications
                                    <span className="h-5 w-5 rounded-full bg-orange-500 text-[10px] flex items-center justify-center">
                                        {notifications.filter(n => !n.is_read).length}
                                    </span>
                                </h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Updates and Activity</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={markAllRead}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                    title="Mark all as read"
                                >
                                    <CheckCircle2 size={20} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-24 w-full bg-white/5 rounded-2xl animate-pulse" />
                                ))
                            ) : notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-4 border border-white/5">
                                        <Bell size={32} />
                                    </div>
                                    <h3 className="text-white font-bold tracking-tight">All caught up!</h3>
                                    <p className="text-white/40 text-xs mt-1">No new notifications to show right now.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <motion.div
                                        key={n.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => markAsRead(n.id)}
                                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden
                                            ${n.is_read
                                                ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                                : 'bg-white/[0.05] border-white/20 hover:bg-white/[0.07] ring-1 ring-orange-500/20 shadow-lg shadow-orange-500/5'
                                            }
                                        `}
                                    >
                                        {!n.is_read && (
                                            <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                        )}

                                        <div className="flex gap-4">
                                            <div className={`h-10 w-10 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold text-white mb-1 ${!n.is_read ? 'pr-4' : ''}`}>{n.title}</h4>
                                                <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{n.message}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                    </span>
                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {n.link && (
                                                            <Link
                                                                href={n.link}
                                                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                                                className="text-orange-500 flex items-center gap-1 text-[10px] font-bold uppercase"
                                                            >
                                                                View <ExternalLink size={10} />
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={(e) => deleteNotification(n.id, e)}
                                                            className="text-white/20 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-white/[0.01]">
                            <p className="text-center text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">PETZONEE Smart Notification OS 2026</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
