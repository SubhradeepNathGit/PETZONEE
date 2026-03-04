'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, X, Minus, Send, Plus,
    Loader2, FileText, PawPrint, CheckCheck, Check,
    Maximize2, Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

type Message = {
    id: string;
    conversation_id: string;
    sender_id: string | null;
    sender_role: 'admin' | 'user' | 'guest';
    content: string;
    created_at: string;
    is_read: boolean;
    attachment_url?: string;
    attachment_type?: string;
    attachment_name?: string;
};

type Conversation = {
    id: string;
    subject: string;
    status: 'active' | 'closed';
    created_at: string;
};

const QUICK_REPLIES = [
    "Hello! I need some assistance.",
    "Checking appointment status",
    "Emergency service inquiry",
    "General pet care question",
    "Thank you, that's all!"
];

export default function GlobalChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);
            const { data } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', user.id)
                .is('vet_id', null)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) setActiveConv(data);
        };
        init();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) setUser(session.user);
            else { setUser(null); setActiveConv(null); setIsOpen(false); }
        });

        const handleOpenChat = () => {
            setIsOpen(true);
            init(); // Re-fetch conversation immediately
        };
        window.addEventListener('open-global-chat', handleOpenChat);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('open-global-chat', handleOpenChat);
        };
    }, []);

    useEffect(() => {
        if (!activeConv || !isOpen) return;
        const fetchMessages = async () => {
            setIsLoading(true);
            // Mark admin messages as read
            await supabase
                .from('conversation_messages')
                .update({ is_read: true })
                .eq('conversation_id', activeConv.id)
                .eq('sender_role', 'admin')
                .eq('is_read', false);

            const { data } = await supabase
                .from('conversation_messages')
                .select('*')
                .eq('conversation_id', activeConv.id)
                .order('created_at', { ascending: true });
            if (data) setMessages(data);
            setIsLoading(false);
            scrollToBottom();
        };
        fetchMessages();
        const channel = supabase.channel(`gcw-${activeConv.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${activeConv.id}` },
                (payload) => { setMessages(prev => [...prev, payload.new as Message]); scrollToBottom(); })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${activeConv.id}` },
                (payload) => { setActiveConv(payload.new as Conversation); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeConv?.id, isOpen]);

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const handleSendMessage = async (e?: React.FormEvent, attachment?: { url: string, type: string, name: string }) => {
        e?.preventDefault();
        if (!activeConv || activeConv.status === 'closed') return;
        if (!newMessage.trim() && !attachment) return;
        const content = newMessage.trim();
        setNewMessage('');
        try {
            await supabase.from('conversation_messages').insert({
                conversation_id: activeConv.id,
                sender_id: user.id,
                sender_role: 'user',
                content: content || (attachment ? `Shared a ${attachment.type}` : ''),
                attachment_url: attachment?.url,
                attachment_type: attachment?.type,
                attachment_name: attachment?.name
            });
        } catch {
            toast.error('Failed to send message');
            if (!attachment) setNewMessage(content);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConv) return;
        if (file.size > 51200) {
            toast.error('File exceeds 50KB limit', { icon: '⚠️' });
            return;
        }
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${activeConv.id}/${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            await handleSendMessage(undefined, { url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'document', name: file.name });
            toast.success('File sent!');
        } catch { toast.error('Upload failed'); }
        finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!user || !activeConv) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            className="fixed bottom-6 right-6 z-[999] font-sans"
            style={{ x: 0, y: 0 }}
        >
            <AnimatePresence mode="wait">
                {isOpen ? (
                    <motion.div
                        key="chat-window"
                        initial={{ opacity: 0, y: 24, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`flex flex-col overflow-hidden shadow-2xl border border-white/10
                            bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-[2rem]
                            transition-all duration-300 ${isMinimized ? 'h-[72px] w-[340px]' : 'h-[580px] w-[380px]'}`}
                    >
                        {/* Glassmorphic Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-black/60 backdrop-blur-[40px] border-b border-white/5 rounded-t-[2rem] shrink-0 relative overflow-hidden z-20">
                            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-orange-500/10 rounded-full blur-[60px] -z-10 animate-pulse" />
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-orange-500/20 flex items-center justify-center text-orange-500 ring-2 ring-orange-500/5 shadow-inner">
                                    <PawPrint size={18} />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-extrabold tracking-tight uppercase italic text-white/90">
                                        PETZONEE SUPPORT
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {activeConv?.status === 'closed' ? (
                                            <div className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[7px] font-black tracking-widest flex items-center gap-1 uppercase">
                                                <div className="w-1 h-1 rounded-full bg-rose-500"></div> closed
                                            </div>
                                        ) : (
                                            <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[7px] font-black tracking-widest flex items-center gap-1 uppercase">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div> online
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                                    {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                                </button>
                                <button onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages Area — Dark theme bg */}
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#050505] relative"
                                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                                    {isLoading ? (
                                        <div className="flex-1 flex items-center justify-center h-full opacity-30">
                                            <Loader2 size={28} className="animate-spin text-orange-500" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                                            <Shield size={32} className="text-orange-500" />
                                            <p className="text-white text-[11px] font-bold uppercase tracking-widest text-center">No messages yet.<br />Start the conversation!</p>
                                        </div>
                                    ) : messages.map((msg) => {
                                        const isMe = msg.sender_role === 'user';
                                        const isSystem = msg.content.includes('PetZonee Support has marked');

                                        if (isSystem) {
                                            return (
                                                <div key={msg.id} className="flex justify-center my-4 px-4 overflow-hidden">
                                                    <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full w-full max-w-[280px]">
                                                        <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.1em] text-center italic leading-relaxed">
                                                            {msg.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`relative max-w-[80%] flex flex-col gap-1`}>
                                                    {/* Bubble */}
                                                    <div className={`relative px-4 py-2.5 text-[13px] leading-[1.6] font-medium shadow-md
                                                        ${isMe
                                                            ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none'
                                                            : 'bg-[#2a2a2a] text-white/90 border border-white/8 rounded-2xl rounded-tl-none'
                                                        }`}
                                                    >
                                                        {isMe ? (
                                                            <span className="absolute -right-[5px] top-0 w-0 h-0 block"
                                                                style={{ borderLeft: '6px solid #f97316', borderBottom: '10px solid transparent' }} />
                                                        ) : (
                                                            <span className="absolute -left-[5px] top-0 w-0 h-0 block"
                                                                style={{ borderRight: '6px solid #2a2a2a', borderBottom: '10px solid transparent' }} />
                                                        )}
                                                        {msg.content && <p>{msg.content}</p>}

                                                        {msg.attachment_url && (
                                                            <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                                                                {msg.attachment_type === 'image' ? (
                                                                    <img src={msg.attachment_url} alt="attachment" className="w-full h-auto object-cover max-h-48" />
                                                                ) : (
                                                                    <a href={msg.attachment_url} target="_blank" className="flex items-center gap-2 p-2 hover:bg-white/5 transition-colors">
                                                                        <FileText size={16} className="text-orange-400 shrink-0" />
                                                                        <span className="text-[10px] font-black uppercase tracking-wide truncate opacity-70">{msg.attachment_name}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <span className="text-[9px] text-white/25 font-medium">
                                                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })} ago
                                                        </span>
                                                        {isMe && (
                                                            msg.is_read ? (
                                                                <CheckCheck size={12} className="text-orange-400" />
                                                            ) : (
                                                                <Check size={12} className="text-white/40" />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Replies Area */}
                                {!activeConv || activeConv.status === 'closed' ? null : (
                                    <div className="px-3 pb-2 pt-1 flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
                                        {QUICK_REPLIES.map((reply, idx) => (
                                            <motion.button
                                                key={idx}
                                                whileHover={{ scale: 1.05, backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setNewMessage(reply);
                                                    // Trigger send in next tick
                                                    setTimeout(() => {
                                                        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
                                                        handleSendMessage(fakeEvent);
                                                    }, 0);
                                                }}
                                                className="shrink-0 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-orange-400 hover:border-orange-500/30 transition-colors whitespace-nowrap italic"
                                            >
                                                {reply}
                                            </motion.button>
                                        ))}
                                    </div>
                                )}

                                {/* Input Area */}
                                <div className="px-3 py-3 bg-[#111]/60 border-t border-white/5 shrink-0 rounded-b-[2rem]">
                                    {activeConv?.status === 'closed' ? (
                                        <div className="p-4 bg-zinc-900/90 backdrop-blur-md border border-white/5 space-y-3">
                                            <div className="flex items-center gap-3 text-rose-400">
                                                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mt-1">
                                                    <X size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black uppercase tracking-widest">Conversation Resolved</p>
                                                    <p className="text-[9px] text-white/30 font-medium leading-relaxed italic">This transmission channel has been securely closed by support protocols.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.open('/contactUs', '_self')}
                                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98]"
                                            >
                                                Start New Transmission
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                                            <button type="button" disabled={isUploading}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-orange-500/20 border border-white/10 text-white/40 hover:text-orange-400 flex items-center justify-center transition-all shrink-0">
                                                {isUploading ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Plus size={18} />}
                                            </button>
                                            <input
                                                type="text"
                                                placeholder="Type a message..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500/40 transition-colors"
                                            />
                                            <button type="submit"
                                                className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all shrink-0 active:scale-95">
                                                <Send size={16} />
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                ) : (
                    /* Glassmorphic Chat Icon */
                    <motion.button
                        key="chat-trigger"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsOpen(true)}
                        className="relative w-[62px] h-[62px] rounded-[20px] flex items-center justify-center
                            bg-orange-500/20 backdrop-blur-xl border border-orange-500/30
                            shadow-[0_8px_32px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]
                            hover:bg-orange-500/30 hover:border-orange-500/50 transition-all duration-300"
                    >
                        {/* Inner glow */}
                        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-orange-400/20 via-transparent to-transparent pointer-events-none" />
                        <MessageSquare size={26} className="text-orange-400 relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                        {/* Unread badge */}
                        {messages.filter(m => m.sender_role === 'admin' && !m.is_read).length > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a] text-white text-[9px] font-black shadow-lg">
                                {messages.filter(m => m.sender_role === 'admin' && !m.is_read).length}
                            </motion.div>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
