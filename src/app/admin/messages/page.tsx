'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Send, User, MessageSquare,
    MoreVertical, Paperclip, Smile, Shield,
    CheckCheck, Check, ChevronLeft, Trash2, Archive,
    Star, Hash, PawPrint, Download, FileText,
    Image as ImageIcon, Loader2, Plus, X,
    ArrowLeft, ArchiveX, Bookmark
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

const ADMIN_QUICK_REPLIES = [
    "Hello! How can we assist you today?",
    "We are looking into your request right now.",
    "Your appointment has been confirmed.",
    "Is there anything else I can help with?",
    "This transmission will be closed shortly."
];

type Conversation = {
    id: string;
    user_id: string | null;
    guest_name: string | null;
    guest_email: string | null;
    subject: string;
    status: 'active' | 'closed';
    created_at: string;
    is_starred: boolean;
    is_archived: boolean;
    is_deleted: boolean;
    users?: {
        first_name: string;
        last_name: string;
        avatar_url: string;
    };
    last_message?: Message;
};

export default function AdminMessagingHub() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [adminUser, setAdminUser] = useState<any>(null);
    const [filter, setFilter] = useState<'active' | 'starred' | 'archived'>('active');
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
    const [targetResolveId, setTargetResolveId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConv = conversations.find(c => c.id === selectedId);

    const init = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setAdminUser(user);

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    users:user_id ( first_name, last_name, avatar_url )
                `)
                .eq('is_deleted', false)
                .is('vet_id', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const convsWithLastMsg = await Promise.all((data || []).map(async (conv) => {
                const { data: msgData } = await supabase
                    .from('conversation_messages')
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return { ...conv, last_message: msgData };
            }));

            setConversations(convsWithLastMsg);
        } catch (err) {
            console.error('Init error:', err);
            toast.error('Failed to load transmissions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        init();
        const convChannel = supabase.channel('admin-convs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                init();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, () => {
                init();
            })
            .subscribe();
        return () => { supabase.removeChannel(convChannel); };
    }, []);

    // Fetch messages for selected conversation
    useEffect(() => {
        if (!selectedId) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            // Mark user/guest messages as read
            await supabase
                .from('conversation_messages')
                .update({ is_read: true })
                .eq('conversation_id', selectedId)
                .neq('sender_role', 'admin')
                .eq('is_read', false);

            const { data, error } = await supabase
                .from('conversation_messages')
                .select('*')
                .eq('conversation_id', selectedId)
                .order('created_at', { ascending: true });

            if (error) console.error(error);
            else setMessages(data || []);
            scrollToBottom();
        };

        fetchMessages();

        const msgChannel = supabase.channel(`msgs-${selectedId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'conversation_messages',
                filter: `conversation_id=eq.${selectedId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
                scrollToBottom();
            })
            .subscribe();

        return () => { supabase.removeChannel(msgChannel); };
    }, [selectedId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e?: React.FormEvent, attachment?: { url: string, type: string, name: string }) => {
        e?.preventDefault();
        if (!newMessage.trim() && !attachment && !selectedId && !adminUser) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('conversation_messages')
                .insert({
                    conversation_id: selectedId,
                    sender_id: adminUser.id,
                    sender_role: 'admin',
                    content: content || (attachment ? `Shared a ${attachment.type}` : ''),
                    attachment_url: attachment?.url,
                    attachment_type: attachment?.type,
                    attachment_name: attachment?.name
                });

            if (error) throw error;
        } catch (err) {
            console.error(err);
            toast.error('Failed to send transmission');
            if (!attachment) setNewMessage(content);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedId) return;

        // 50KB Limit
        if (file.size > 51200) {
            toast.error('Payload too large for secure transmission (Max 50KB)', { icon: '⚠️' });
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `admin/${selectedId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            const fileType = file.type.startsWith('image/') ? 'image' : 'document';

            await handleSendMessage(undefined, {
                url: publicUrl,
                type: fileType,
                name: file.name
            });

            toast.success('Transmission link secured');
        } catch (err: any) {
            toast.error('Upload dropped: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const updateConvStatus = async (convId: string, updates: Partial<Conversation>) => {
        try {
            // Check if this is a delete operation
            if (updates.is_deleted) {
                const { error } = await supabase
                    .from('conversations')
                    .delete()
                    .eq('id', convId);

                if (error) throw error;

                setConversations(prev => prev.filter(c => c.id !== convId));
                if (selectedId === convId) setSelectedId(null);
                toast.success('Frequency Purged from Database');
                return;
            }

            const { error } = await supabase
                .from('conversations')
                .update(updates)
                .eq('id', convId);

            if (error) throw error;

            // If resolving, send a system message
            if (updates.status === 'closed') {
                await supabase.from('conversation_messages').insert({
                    conversation_id: convId,
                    sender_id: adminUser?.id,
                    sender_role: 'admin',
                    content: 'PetZonee Support has marked this conversation as resolved.',
                    is_read: false
                });
            }

            setConversations(prev => prev.map(c => c.id === convId ? { ...c, ...updates } : c));
            toast.success(updates.status === 'closed' ? 'Conversation Resolved' : 'Frequency recalibrated');
        } catch (err) {
            console.error(err);
            toast.error('Sync failure');
        }
    };

    const filteredConversations = conversations.filter(c => {
        const name = c.users ? `${c.users.first_name} ${c.users.last_name}` : (c.guest_name || 'Guest');
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.subject.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'active') return matchesSearch && !c.is_archived;
        if (filter === 'starred') return matchesSearch && c.is_starred && !c.is_archived;
        if (filter === 'archived') return matchesSearch && c.is_archived;

        return matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="relative">
                    {/* Decorative background glow */}
                    <div className="absolute inset-0 bg-orange-500/10 blur-[100px] rounded-full scale-150" />

                    <div className="relative text-center">
                        <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 border-t-2 border-r-2 border-orange-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <MessageSquare size={32} className="text-orange-500 animate-pulse" />
                            </div>
                        </div>
                        <h2 className="text-white font-bold text-xs uppercase tracking-[0.5em] mb-3">Initializing</h2>
                        <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">Synchronizing Support Frequencies...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#050505] text-white flex overflow-hidden font-sans selection:bg-orange-500/30">
            {/* Background Grain/Noise */}
            <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.03] z-50"></div>

            {/* === Left Panel: Conversations List === */}
            <div className="w-[420px] shrink-0 border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-[50px] relative z-10 overflow-hidden">
                {/* WhatsApp-style Header */}
                <div className="px-8 py-7 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                            <PawPrint size={24} className="text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-widest flex items-center gap-3" style={{ letterSpacing: '0.2em' }}>
                                <span className="text-white">PETZONEE</span>
                                <span className="text-orange-500">SUPPORT</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.3em]">V1.0.0</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pb-4">
                    <div className="relative group mb-6">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Scan frequencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-14 pr-4 py-3 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-orange-500/30 transition-all placeholder:text-white/10"
                        />
                    </div>

                    <div className="flex items-center gap-2 mb-4 p-1 bg-white/[0.02] border border-white/5 rounded-lg">
                        {(['active', 'starred', 'archived'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all
                                        ${filter === f
                                        ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/10'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {filteredConversations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-10">
                            <ArchiveX size={48} className="mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No active transmissions detected</p>
                        </div>
                    ) : filteredConversations.map((conv) => (
                        <motion.button
                            key={conv.id}
                            onClick={() => setSelectedId(conv.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full p-6 rounded-lg text-left border transition-all flex items-center gap-5 relative overflow-hidden group
                                    ${selectedId === conv.id
                                    ? 'bg-gradient-to-r from-orange-500/20 to-transparent border-orange-500/30 shadow-2xl'
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                }`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 overflow-hidden ring-2 ring-transparent group-hover:ring-orange-500/30 transition-all shadow-inner">
                                    <img
                                        src={conv.users?.avatar_url || `https://ui-avatars.com/api/?name=${conv.guest_name || 'G'}&background=f97316&color=000&bold=true`}
                                        alt="User"
                                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    />
                                </div>
                                {conv.status === 'active' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-[#050505] bg-emerald-500 animate-pulse"></div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-black text-[11px] truncate uppercase tracking-tighter text-white">
                                        {conv.users ? `${conv.users.first_name} ${conv.users.last_name}` : (conv.guest_name || 'Guest User')}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {conv.is_starred && <Star size={10} className="fill-orange-500 text-orange-500" />}
                                        <span className="text-[10px] font-bold text-white/20 tabular-nums">
                                            {conv.last_message ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false }) : 'NEW'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-tight truncate mb-2">
                                    {conv.subject}
                                </p>
                                {conv.last_message && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-px bg-orange-500/30" />
                                        <p className="text-[11px] text-orange-500/70 truncate italic font-medium">
                                            {conv.last_message.sender_role === 'admin' ? 'YOU: ' : ''}{conv.last_message.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* === Right Panel: Chat Window === */}
            <div className="flex-1 flex flex-col relative bg-[#050505] min-w-0">
                <AnimatePresence mode="wait">
                    {selectedId && activeConv ? (
                        <motion.div
                            key={selectedId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col relative overflow-hidden"
                        >
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[150px] -z-10 animate-pulse" />

                            {/* Chat Header */}
                            <div className="pt-6 pb-6 px-12 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-[40px] z-20">
                                <div className="flex items-center mt-5 gap-6">
                                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-orange-500/20 overflow-hidden ring-4 ring-orange-500/5 p-1 transition-transform shadow-2xl">
                                        <img
                                            src={activeConv?.users?.avatar_url || `https://ui-avatars.com/api/?name=${activeConv?.guest_name || 'G'}&background=f97316&color=000&bold=true`}
                                            alt="User"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-[20px] font-extrabold tracking-tight uppercase italic text-white/90">
                                                {activeConv?.users ? `${activeConv.users.first_name} ${activeConv.users.last_name}` : (activeConv?.guest_name || 'Secure Guest')}
                                            </h2>
                                            <div className="px-3 py-1 text-emerald-400 text-[9px] font-black tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-lg bg-emerald-500 animate-pulse"></div>
                                                SECURE
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                                            Frequency: <span className="text-white/40 italic">{activeConv?.subject}</span>
                                            {activeConv?.guest_email && (
                                                <>
                                                    <span className="h-1 w-1 rounded-lg bg-white/10" />
                                                    ID: <span className="text-orange-500/50">{activeConv.guest_email}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center mt-5 gap-3">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (activeConv?.status === 'active') {
                                                    setTargetResolveId(activeConv.id);
                                                    setIsResolveModalOpen(true);
                                                } else if (activeConv) {
                                                    updateConvStatus(activeConv.id, { status: 'active' });
                                                }
                                            }}
                                            className={`p-3.5 rounded-xl border transition-all ${activeConv?.status === 'closed' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 text-white/20 hover:text-white'}`}
                                        >
                                            <CheckCheck size={18} />
                                        </motion.button>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">{activeConv?.status === 'active' ? 'Resolve' : 'Open'}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => activeConv && updateConvStatus(activeConv.id, { is_starred: !activeConv.is_starred })}
                                            className={`p-3.5 rounded-xl border transition-all ${activeConv?.is_starred ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' : 'bg-white/5 border-white/5 text-white/20 hover:text-white'}`}
                                        >
                                            <Star size={18} className={activeConv?.is_starred ? 'fill-orange-500' : ''} />
                                        </motion.button>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">Star</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => activeConv && updateConvStatus(activeConv.id, { is_archived: !activeConv.is_archived })}
                                            className={`p-3.5 rounded-xl border transition-all ${activeConv?.is_archived ? 'bg-blue-500/20 border-blue-500/50 text-blue-500' : 'bg-white/5 border-white/5 text-white/20 hover:text-white'}`}
                                        >
                                            <Archive size={18} />
                                        </motion.button>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">Archive</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5">
                                        <motion.button
                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (activeConv) {
                                                    setTargetDeleteId(activeConv.id);
                                                    setIsDeleteModalOpen(true);
                                                }
                                            }}
                                            className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </motion.button>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-rose-500/30">Purge</span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-12 px-16 custom-scrollbar space-y-10 relative">
                                {messages.map((msg) => {
                                    const isAdmin = msg.sender_role === 'admin';
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex flex-col max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} relative group/msg`}>
                                                <div className={`relative px-5 py-3.5 text-[13px] font-medium leading-[1.6] shadow-md
                                                            ${isAdmin
                                                        ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none'
                                                        : 'bg-[#252525] text-white/90 border border-white/8 rounded-2xl rounded-tl-none'
                                                    }`}
                                                >
                                                    {isAdmin ? (
                                                        <span className="absolute -right-[5px] top-0 w-0 h-0 block"
                                                            style={{ borderLeft: '6px solid #f97316', borderBottom: '10px solid transparent' }} />
                                                    ) : (
                                                        <span className="absolute -left-[5px] top-0 w-0 h-0 block"
                                                            style={{ borderRight: '6px solid #252525', borderBottom: '10px solid transparent' }} />
                                                    )}

                                                    {msg.content && <p className="relative z-10">{msg.content}</p>}

                                                    {msg.attachment_url && (
                                                        <div className="mt-4">
                                                            {msg.attachment_type === 'image' ? (
                                                                <div className="group relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/20">
                                                                    <img
                                                                        src={msg.attachment_url}
                                                                        alt="Attachment"
                                                                        className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                                        <a href={msg.attachment_url} download target="_blank" className="p-4 rounded-full bg-white/20 text-white hover:bg-orange-500 transition-colors">
                                                                            <Download size={20} />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <a href={msg.attachment_url} target="_blank" className="flex items-center gap-3 p-4 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-all group">
                                                                    <div className="w-11 h-11 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-[11px] text-white truncate">{msg.attachment_name || 'Document'}</p>
                                                                        <p className="text-[9px] text-white/30">Tap to download</p>
                                                                    </div>
                                                                    <Download size={16} className="text-white/30 group-hover:text-orange-400 transition-colors" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-2 mt-2 px-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] text-white/25 font-medium">
                                                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })} ago
                                                    </span>
                                                    {isAdmin && (
                                                        msg.is_read ? (
                                                            <CheckCheck size={12} className="text-orange-400" />
                                                        ) : (
                                                            <Check size={12} className="text-white/40" />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/20 shrink-0">
                                {ADMIN_QUICK_REPLIES.map((reply, idx) => (
                                    <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setNewMessage(reply)}
                                        className="shrink-0 px-4 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-orange-500 hover:border-orange-500/20 transition-all italic shadow-inner whitespace-nowrap"
                                    >
                                        {reply}
                                    </motion.button>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-[#111]/50 border-t border-white/5 shrink-0">
                                {activeConv.status === 'closed' ? (
                                    <div className="flex items-center justify-between py-3 px-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 italic">Transmission Resolved — Protocols Terminated</p>
                                        <button
                                            onClick={() => updateConvStatus(activeConv.id, { status: 'active' })}
                                            className="text-[9px] font-black uppercase tracking-widest text-emerald-500 border-b border-emerald-500/20 hover:border-emerald-500 transition-all"
                                        >
                                            Restart Protocol
                                        </button>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="flex items-center gap-3 w-full"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*,.pdf,.doc,.docx"
                                        />
                                        <button
                                            type="button"
                                            disabled={isUploading}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-11 h-11 rounded-full bg-white/5 hover:bg-orange-500/20 border border-white/10 text-white/40 hover:text-orange-400 flex items-center justify-center transition-all shrink-0"
                                        >
                                            {isUploading ? <Loader2 size={18} className="animate-spin text-orange-500" /> : <Plus size={20} />}
                                        </button>
                                        <input
                                            type="text"
                                            placeholder="Reply to this conversation..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500/40 transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all shrink-0 active:scale-95"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-24 text-center relative overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-lg blur-[180px] -z-10 animate-pulse" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-orange-500/20 mb-10 shadow-inner group-hover:text-orange-500/40 transition-all"
                            >
                                <MessageSquare size={40} />
                            </motion.div>
                            <h2 className="text-4xl font-extrabold uppercase italic tracking-tighter mb-4 text-white/90">Frequency <span className="text-orange-500 not-italic">Silent</span></h2>
                            <p className="text-white/20 font-bold text-[10px] uppercase tracking-[0.4em] leading-loose italic max-w-sm">
                                Secure transmission bridge awaiting initiation protocols.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Delete Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-zinc-900/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-[0_0_100px_rgba(244,63,94,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Frequency <span className="text-rose-500 not-italic">Purge</span></h3>
                                    <p className="text-[9px] text-rose-500/60 font-black uppercase tracking-[0.2em]">Irreversible Protocol</p>
                                </div>
                            </div>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-loose mb-8 italic">
                                Are you sure you want to terminate this transmission protocol? This action will result in a permanent frequency purge and <span className="text-rose-500">cannot be undone</span>.
                            </p>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-4 rounded-lg border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={() => {
                                        if (targetDeleteId) updateConvStatus(targetDeleteId, { is_deleted: true });
                                        setIsDeleteModalOpen(false);
                                    }}
                                    className="flex-1 py-4 rounded-lg bg-rose-500 text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
                                >
                                    Confirm Purge
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {isResolveModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-zinc-900/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-[0_0_100px_rgba(16,185,129,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
                                    <CheckCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Frequency <span className="text-emerald-500 not-italic">Resolved</span></h3>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase tracking-[0.2em]">Secure Finalization</p>
                                </div>
                            </div>
                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-loose mb-8 italic">
                                Are you sure you want to mark this transmission as <span className="text-emerald-500">resolved</span>? This will close the secure frequency and notify the user.
                            </p>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsResolveModalOpen(false)}
                                    className="flex-1 py-4 rounded-lg border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={() => {
                                        if (targetResolveId) updateConvStatus(targetResolveId, { status: 'closed' });
                                        setIsResolveModalOpen(false);
                                    }}
                                    className="flex-1 py-4 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
