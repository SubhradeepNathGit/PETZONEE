'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Send, MessageSquare, PawPrint, CheckCheck, Check,
    ArrowLeft, FileText, Download, Loader2, Plus, X,
    Archive, Trash2, CheckCircle, User
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
    last_message?: Message | null;
    is_archived?: boolean;
    is_deleted?: boolean;
    // New fields for participant details
    users?: {
        first_name: string;
        last_name?: string;
        avatar_url?: string;
    } | null;
    veterinarian?: {
        name: string;
        avatar_url?: string;
    } | null;
};

const QUICK_REPLIES = [
    "Hello! I need some assistance.",
    "Checking appointment status",
    "Emergency service inquiry",
    "General pet care question",
    "Thank you, that's all!"
];

export default function UserMessages({ userId, role = 'user', messageType = 'support' }: { userId: string, role?: 'user' | 'vet' | 'admin', messageType?: 'support' | 'vet' }) {
    const isVetChat = role === 'vet' || messageType === 'vet';
    const convTable = isVetChat ? 'vet_conversations' : 'conversations';
    const msgTable = isVetChat ? 'vet_conversation_messages' : 'conversation_messages';

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConv = conversations.find(c => c.id === selectedId);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const query = supabase
                .from(convTable)
                .select(`
                    *,
                    users:user_id(first_name, last_name, avatar_url),
                    veterinarian:vet_id(name, avatar_url)
                `);

            if (role === 'vet') {
                query.eq('vet_id', userId);
            } else {
                query.eq('user_id', userId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const convsWithLastMsg = await Promise.all((data || []).map(async (conv) => {
                const { data: msgData } = await supabase
                    .from(msgTable)
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return { ...conv, last_message: msgData };
            }));

            setConversations(convsWithLastMsg);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
        const filter = role === 'vet' ? `vet_id=eq.${userId}` : `user_id=eq.${userId}`;
        const channel = supabase.channel(`user-convs-${userId}-${messageType}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: convTable, filter }, () => {
                loadConversations();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, messageType]);

    useEffect(() => {
        if (!selectedId) return;
        const fetchMessages = async () => {
            // Mark other party's messages as read
            const otherRole = role === 'user' ? ['admin', 'vet'] : ['user'];
            await supabase
                .from(msgTable)
                .update({ is_read: true })
                .eq('conversation_id', selectedId)
                .in('sender_role', otherRole)
                .eq('is_read', false);

            const { data, error } = await supabase
                .from(msgTable)
                .select('*')
                .eq('conversation_id', selectedId)
                .order('created_at', { ascending: true });

            if (error) console.error(error);
            else setMessages(data || []);
            scrollToBottom();
        };
        fetchMessages();
        const msgChannel = supabase.channel(`user-msgs-${selectedId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: msgTable,
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

    const updateConvStatus = async (convId: string, updates: Partial<Conversation>) => {
        try {
            if (updates.is_deleted) {
                const { error } = await supabase.from(convTable).delete().eq('id', convId);
                if (error) throw error;
                setConversations(prev => prev.filter(c => c.id !== convId));
                if (selectedId === convId) setSelectedId(null);
                toast.success('Chat Purged');
                return;
            }

            const { error } = await supabase.from(convTable).update(updates).eq('id', convId);
            if (error) throw error;

            if (updates.status === 'closed') {
                await supabase.from(msgTable).insert({
                    conversation_id: convId,
                    sender_id: userId,
                    sender_role: role,
                    content: role === 'vet' ? 'Doctor has marked this conversation as resolved.' : 'PetZonee Support has marked this conversation as resolved.',
                    is_read: false
                });
            }

            setConversations(prev => prev.map(c => c.id === convId ? { ...c, ...updates } : c));
            toast.success(updates.status === 'closed' ? 'Conversation Resolved' : 'Status updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update chat');
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, attachment?: { url: string; type: string; name: string }) => {
        e?.preventDefault();
        if (!newMessage.trim() && !attachment && !selectedId) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from(msgTable)
                .insert({
                    conversation_id: selectedId,
                    sender_id: userId,
                    sender_role: role,
                    content: content || (attachment ? `Shared a ${attachment.type}` : ''),
                    attachment_url: attachment?.url,
                    attachment_type: attachment?.type,
                    attachment_name: attachment?.name
                });

            if (error) throw error;
        } catch (err) {
            console.error(err);
            toast.error('Failed to send message');
            if (!attachment) setNewMessage(content);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedId) return;

        if (file.size > 51200) {
            toast.error('File exceeds 50KB limit.', { icon: '⚠️' });
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${selectedId}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            const fileType = file.type.startsWith('image/') ? 'image' : 'document';

            await handleSendMessage(undefined, { url: publicUrl, type: fileType, name: file.name });
            toast.success('File sent!');
        } catch (err: any) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (isLoading && conversations.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 w-full bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="h-full flex overflow-hidden font-sans bg-[#050505] text-white selection:bg-orange-500/30">
            {/* Background Grain/Noise */}
            <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.03] z-50"></div>

            {/* Left: Conversations List */}
            <div className={`flex flex-col ${selectedId ? 'hidden lg:flex w-[380px]' : 'w-full'} border-r border-white/5 bg-black/40 backdrop-blur-[50px] relative z-10 shrink-0`}>
                {/* WhatsApp-style Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                            <PawPrint size={24} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-extrabold flex items-center gap-2 uppercase tracking-widest" style={{ letterSpacing: '0.2em' }}>
                                <span className="text-white">PETZONEE</span>
                                <span className="text-orange-500">
                                    {role === 'vet' ? 'PATIENTS' : messageType === 'vet' ? 'VETS' : 'SUPPORT'}
                                </span>
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                <p className="text-[9px] text-white/20 font-bold tracking-[0.3em] uppercase">Transmission Hub</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {conversations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-10">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No active transmissions</p>
                        </div>
                    ) : conversations.map((conv) => {
                        const opponent = role === 'vet'
                            ? { name: `${conv.users?.first_name || 'Patient'} ${conv.users?.last_name || ''}`.trim(), avatar: conv.users?.avatar_url }
                            : { name: conv.veterinarian?.name ? `Dr. ${conv.veterinarian.name}` : 'Veterinarian', avatar: conv.veterinarian?.avatar_url };

                        return (
                            <motion.button
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full p-6 text-left flex items-center gap-5 rounded-lg border transition-all overflow-hidden relative group
                                    ${selectedId === conv.id
                                        ? 'bg-gradient-to-r from-orange-500/20 to-transparent border-orange-500/30 shadow-2xl'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shadow-inner flex items-center justify-center transition-colors">
                                        {opponent.avatar ? (
                                            <img src={opponent.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-zinc-400">
                                                <User size={24} />
                                            </div>
                                        )}
                                    </div>
                                    {conv.status === 'active' && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-[#050505] bg-emerald-500 animate-pulse"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-black text-[11px] uppercase tracking-tighter text-white truncate">{opponent.name}</p>
                                        <span className="text-[10px] text-white/20 font-bold tabular-nums shrink-0 ml-2">
                                            {conv.last_message ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false }) : 'NEW'}
                                        </span>
                                    </div>
                                    {conv.last_message && (
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-px bg-orange-500/30" />
                                            <p className="text-[11px] text-orange-500/70 truncate italic font-medium">
                                                {conv.last_message.sender_role !== role ? (role === 'vet' ? 'Patient: ' : 'Dr: ') : 'You: '}
                                                {conv.last_message.content || '📎 Attachment'}
                                            </p>
                                        </div>
                                    )}
                                    {conv.status === 'closed' && (
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-500 uppercase tracking-widest">Closed</span>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Right: Chat Window */}
            {selectedId ? (
                <div className="flex-1 flex flex-col relative bg-[#050505]">
                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />

                    {/* Admin/User style Header */}
                    <div className="p-6 px-10 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-[40px] z-20 shrink-0">
                        <button
                            onClick={() => setSelectedId(null)}
                            className="lg:hidden p-3 rounded-full bg-white/5 border border-white/5 text-white/50 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-orange-500/20 overflow-hidden flex items-center justify-center ring-4 ring-orange-500/5 shadow-2xl">
                            {(() => {
                                const opponent = role === 'vet'
                                    ? { name: `${activeConv?.users?.first_name || 'Patient'} ${activeConv?.users?.last_name || ''}`.trim(), avatar: activeConv?.users?.avatar_url }
                                    : { name: activeConv?.veterinarian?.name ? `Dr. ${activeConv.veterinarian.name}` : 'Veterinarian', avatar: activeConv?.veterinarian?.avatar_url };

                                return opponent.avatar ? (
                                    <img src={opponent.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-zinc-400">
                                        <User size={24} />
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <h2 className="text-[18px] font-extrabold tracking-tight uppercase italic text-white/90">
                                {(() => {
                                    const opponentName = role === 'vet'
                                        ? `${activeConv?.users?.first_name || 'Patient'} ${activeConv?.users?.last_name || ''}`.trim()
                                        : activeConv?.veterinarian?.name ? `Dr. ${activeConv.veterinarian.name}` : 'Veterinarian';

                                    return opponentName;
                                })()}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                {activeConv?.status === 'closed' ? (
                                    <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black tracking-widest flex items-center gap-1.5 uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> closed
                                    </div>
                                ) : (
                                    <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest flex items-center gap-1.5 uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> online
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vet Header Controls */}
                    {role === 'vet' && activeConv && activeConv.status !== 'closed' && (
                        <div className="px-10 py-3 bg-black/60 border-b border-white/5 flex items-center justify-end gap-3 z-10 relative">
                            <div className="flex items-center gap-1.5 mr-auto">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => updateConvStatus(activeConv.id, { status: 'closed' })}
                                    className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={14} /> End Protocol
                                </motion.button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => updateConvStatus(activeConv.id, { is_archived: !activeConv.is_archived })}
                                    className={`p-2.5 rounded-xl border transition-all ${activeConv.is_archived ? 'bg-blue-500/20 border-blue-500/50 text-blue-500' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}
                                    title="Archive Chat"
                                >
                                    <Archive size={14} />
                                </motion.button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to permanently delete this chat?')) {
                                            updateConvStatus(activeConv.id, { is_deleted: true });
                                        }
                                    }}
                                    className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all"
                                    title="Purge Chat"
                                >
                                    <Trash2 size={14} />
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 custom-scrollbar relative">
                        {messages.map((msg) => {
                            const isMe = msg.sender_role === role;
                            const isSystem = msg.content.includes('PetZonee') && msg.content.includes('marked');

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center my-6 overflow-hidden">
                                        <div className="px-6 py-3 bg-orange-500/5 border border-orange-500/10 rounded-full backdrop-blur-sm">
                                            <p className="text-[11px] text-orange-500/60 font-black uppercase tracking-[0.2em] text-center italic leading-relaxed">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg relative`}
                                >
                                    <div className="relative max-w-[75%] flex flex-col gap-1">
                                        <div
                                            className={`relative px-4 py-3 text-[13px] leading-[1.6] font-medium shadow-md
                                                ${isMe
                                                    ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none'
                                                    : 'bg-[#252525] text-white/90 border border-white/8 rounded-2xl rounded-tl-none'
                                                }`}
                                        >
                                            {isMe ? (
                                                <span className="absolute -right-[5px] top-0 w-0 h-0 block"
                                                    style={{ borderLeft: '6px solid #f97316', borderBottom: '10px solid transparent' }} />
                                            ) : (
                                                <span className="absolute -left-[5px] top-0 w-0 h-0 block"
                                                    style={{ borderRight: '6px solid #252525', borderBottom: '10px solid transparent' }} />
                                            )}

                                            {msg.content && <p>{msg.content}</p>}

                                            {msg.attachment_url && (
                                                <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                                                    {msg.attachment_type === 'image' ? (
                                                        <div className="relative group">
                                                            <img src={msg.attachment_url} alt="Attachment" className="w-full h-auto object-cover max-h-64" />
                                                            <a
                                                                href={msg.attachment_url}
                                                                download={msg.attachment_name}
                                                                target="_blank"
                                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                            >
                                                                <Download size={22} className="text-white" />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={msg.attachment_url}
                                                            target="_blank"
                                                            className="flex items-center gap-3 p-3 bg-black/20 hover:bg-black/30 transition-colors"
                                                        >
                                                            <FileText size={18} className="text-orange-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold truncate">{msg.attachment_name || 'Document'}</p>
                                                                <p className="text-[9px] opacity-40">Tap to download</p>
                                                            </div>
                                                            <Download size={14} className="opacity-40" />
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

                                    {/* Vet Controls for Individual Chats */}
                                    {role === 'vet' && isMe && (
                                        <div className="absolute top-0 -left-12 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-2">
                                            {/* Vet controls for individual messages are not needed based on requirements, but kept structure if needed */}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    {/* Quick Replies Area */}
                    {activeConv?.status !== 'closed' && (
                        <div className="px-6 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/20 shrink-0">
                            {QUICK_REPLIES.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setNewMessage(reply);
                                        setTimeout(() => handleSendMessage({ preventDefault: () => { } } as React.FormEvent), 0);
                                    }}
                                    className="shrink-0 px-5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-orange-500 hover:border-orange-500/20 hover:bg-orange-500/5 transition-all italic shadow-inner"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input area */}
                    <div className="px-6 py-4 bg-[#111]/50 border-t border-white/5 shrink-0">
                        {activeConv?.status === 'closed' ? (
                            <div className="flex items-center gap-4 py-4 px-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl mx-2 mb-2">
                                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <X size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">Transmission Resolved</p>
                                    <p className="text-[9px] text-white/40 italic mt-0.5">This channel has been officially closed.</p>
                                </div>
                                <button
                                    onClick={() => window.open('/contactUs', '_self')}
                                    className="ml-auto px-4 py-2 border border-white/10 rounded-lg text-[9px] font-black uppercase text-white hover:bg-white/5 transition-all"
                                >
                                    New Inquiry
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
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
                                    placeholder="Type a message..."
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
                </div>
            ) : (
                <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-24 text-center relative overflow-hidden bg-[#050505]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[150px] -z-10 animate-pulse" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-orange-500/20 mb-8 shadow-inner group-hover:text-orange-500/40 transition-all"
                    >
                        <MessageSquare size={40} />
                    </motion.div>
                    <h2 className="text-3xl font-extrabold tracking-tighter uppercase italic text-white/90 mb-4">Frequency <span className="text-orange-500 not-italic">Silent</span></h2>
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs leading-loose italic">Select a sub-space transmission from the left module to initiate secure protocols.</p>
                </div>
            )}
        </div>
    );
}
