'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays, Mail, Clock, User as UserIcon,
    XCircle, CheckCircle2, Stethoscope, ChevronRight,
    AlertCircle, Loader2, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

/* Types */
type Vet = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
};

type Appointment = {
    id: string;
    user_id: string;
    vet_id: string;
    appointment_time: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    notes: string | null;
    created_at: string;
    updated_at: string;
    vet?: Vet | null;
};

/* Helpers */
function initials(name?: string | null): string {
    if (!name) return 'V';
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? 'V') + (p[1]?.[0] ?? '')).toUpperCase();
}

function fmtDate(iso: string): string {
    try {
        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
        }).format(new Date(iso));
    } catch { return iso; }
}

/* Status Config */
const STATUS_CONFIG = {
    accepted: {
        pill: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        dot: 'bg-emerald-500',
        label: 'Confirmed',
        icon: CheckCircle2,
    },
    rejected: {
        pill: 'bg-red-500/20 text-red-400 border border-red-500/30',
        dot: 'bg-red-500',
        label: 'Cancelled',
        icon: XCircle,
    },
    pending: {
        pill: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        dot: 'bg-amber-500',
        label: 'Pending',
        icon: Clock,
    },
    completed: {
        pill: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        dot: 'bg-blue-500',
        label: 'Visited',
        icon: CheckCircle2,
    },
};

/* Appointment Card */
function AppointmentCard({
    appt,
    dim = false,
    onStatusUpdate
}: {
    appt: Appointment;
    dim?: boolean;
    onStatusUpdate?: (id: string, status: Appointment['status'] | 'delete') => void;
}) {
    const vet = appt.vet;
    const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;

    const appointmentDate = new Date(appt.appointment_time);
    const now = new Date();
    const isPast = appointmentDate < now;

    // Cancellation rule: Allow for future active/pending slots, but hide if in history (dim)
    const canCancel = !isPast && !dim && (appt.status === 'pending' || appt.status === 'accepted');
    const canReschedule = !isPast && (appt.status === 'pending' || appt.status === 'accepted');
    const canComplete = isPast && appt.status === 'accepted';

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            whileHover={dim ? {} : { y: -4, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`
                relative bg-white/[0.03] backdrop-blur-xl
                rounded-xl border border-white/10 overflow-hidden
                transition-all duration-300
                ${dim
                    ? 'p-2.5 opacity-40 grayscale-[0.8] scale-[0.97] border-white/5 hover:opacity-60 bg-transparent'
                    : 'p-6 hover:border-[#5F97C9]/30 group/card bg-white/[0.03]'}
            `}
        >
            {/* Inner Glow / Border Accents */}
            {!dim && (
                <>
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#5F97C9]/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#5F97C9]/[0.05] to-transparent pointer-events-none" />
                </>
            )}
            {dim && (
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                    {/* Avatar - Circular */}
                    <div className="relative flex-shrink-0">
                        <div className={`rounded-full overflow-hidden ring-1 ring-white/10 bg-zinc-950 p-0.5 transition-all duration-500
                            ${dim ? 'w-9 h-9 opacity-50' : 'w-14 h-14 group-hover/card:ring-[#5F97C9]/50 shadow-xl shadow-[#5F97C9]/5'}
                        `}>
                            {vet?.avatar_url && vet.avatar_url.startsWith('http') ? (
                                <Image
                                    src={vet.avatar_url}
                                    alt={`Dr. ${vet?.name ?? 'Veterinarian'}`}
                                    width={dim ? 36 : 56} height={dim ? 36 : 56}
                                    className={`w-full h-full object-cover rounded-full transition-transform duration-700 ${!dim ? 'group-hover/card:scale-110' : 'grayscale shadow-inner'}`}
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center bg-white/5 text-white/50 font-bold rounded-full ${dim ? 'text-[9px]' : 'text-lg'}`}>
                                    {initials(vet?.name)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {!dim && <p className="font-bold uppercase tracking-[0.2em] text-[#5F97C9] mb-1 opacity-80 text-[8px]">Veterinary Specialist</p>}
                        <h3 className={`text-white font-bold tracking-normal leading-none mb-1.5 flex flex-wrap items-center gap-2 sm:gap-3 ${dim ? 'text-sm opacity-50' : 'text-xl'}`}>
                            Dr. {vet?.name ?? 'Veterinarian'}
                            {appt.notes && !dim && (
                                <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 mx-1">
                                    <span className="text-[8px] font-bold uppercase text-white/20">Note</span>
                                    <span className="text-[10px] font-medium text-white/30 truncate max-w-[120px]">&ldquo;{appt.notes}&rdquo;</span>
                                </div>
                            )}
                        </h3>
                        <div className={`flex items-center gap-2 ${dim ? 'text-white/20' : 'text-white/40'}`}>
                            <Clock size={dim ? 9 : 11} className={dim ? 'opacity-30' : 'text-[#5F97C9]'} />
                            <span className={`font-bold uppercase tracking-widest leading-none ${dim ? 'text-[8px]' : 'text-[10px]'}`}>{fmtDate(appt.appointment_time)}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions + Status */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 mr-2">
                        {canComplete && (
                            <button
                                onClick={() => onStatusUpdate?.(appt.id, 'completed')}
                                className="group/btn relative inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300"
                            >
                                <CheckCircle2 size={12} />
                                <span>Complete</span>
                            </button>
                        )}

                        {canReschedule && (
                            <Link
                                href={`/appointments/new?reschedule=${appt.id}`}
                                className="group/btn relative inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                            >
                                <CalendarDays size={12} className="text-[#5F97C9]" />
                                <span>Reschedule</span>
                            </Link>
                        )}

                        {canCancel && (
                            <button
                                onClick={() => onStatusUpdate?.(appt.id, 'rejected')}
                                className="group/btn relative inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-red-400/60 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/5 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                            >
                                <XCircle size={12} />
                                <span>Cancel</span>
                            </button>
                        )}

                        {dim && (
                            <button
                                onClick={() => onStatusUpdate?.(appt.id, 'delete')}
                                className="group/btn relative inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white/20 hover:text-red-500 transition-all duration-300"
                            >
                                <Trash2 size={10} />
                                <span>Delete Record</span>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold uppercase tracking-normal ${cfg.pill} shadow-sm ${dim ? 'text-[7px] py-1 px-2 border-transparent bg-transparent opacity-30 grayscale' : 'text-[9px]'}`}>
                            {!dim && <div className={`rounded-full ${cfg.dot} ${appt.status === 'pending' || appt.status === 'accepted' ? 'animate-pulse' : ''} w-1.5 h-1.5`} />}
                            {cfg.label}
                        </span>
                        {!isPast && appt.status === 'accepted' && !dim && (
                            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-[0.2em] opacity-80">Slot Active</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

/* Section */
function Section({
    title, subtitle, count, accent = false, children
}: {
    title: string; subtitle: string; count: number; accent?: boolean; children: React.ReactNode;
}) {
    return (
        <section className="mb-12">
            <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center border transition-all duration-500 ${accent ? 'bg-[#5F97C9]/10 border-[#5F97C9]/20 shadow-lg shadow-[#5F97C9]/5' : 'bg-white/5 border-white/10'}`}>
                    <CalendarDays size={20} className={accent ? 'text-[#5F97C9]' : 'text-white/30'} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white leading-none mb-1.5">{title}</h2>
                    <p className="text-[#5F97C9] text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">{subtitle}</p>
                </div>
                {count > 0 && (
                    <span className={`ml-auto text-[10px] font-bold px-4 py-2 rounded-full border ${accent ? 'bg-[#5F97C9]/10 text-[#5F97C9] border-[#5F97C9]/20 shadow-xl shadow-[#5F97C9]/5' : 'bg-white/5 text-white/30 border-white/10'}`}>
                        {count} Active
                    </span>
                )}
            </div>
            {children}
        </section>
    );
}

/* Empty State */
function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
    return (
        <div className="text-center py-14 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5 text-white/20 border border-white/5">
                {icon ?? <CalendarDays size={28} />}
            </div>
            <h3 className="text-white/70 text-lg font-bold">{title}</h3>
            {subtitle && <p className="text-white/30 text-xs font-medium mt-1.5">{subtitle}</p>}
        </div>
    );
}

/* Main View Component */
export default function UserAppointmentsView({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Appointment[]>([]);

    // Cancellation Modal State
    const [cancelModalId, setCancelModalId] = useState<string | null>(null);

    const fetchAppointments = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
        id, user_id, vet_id, appointment_time, status, notes, created_at, updated_at,
        vet:veterinarian (id, name, email, phone, avatar_url)
      `)
            .eq('user_id', uid)
            .order('appointment_time', { ascending: false });

        if (error) {
            toast.error('Failed to load appointments: ' + error.message);
            return;
        }
        setItems((data as unknown as Appointment[]) ?? []);
    }, []);

    useEffect(() => {
        if (!userId) return;

        let mounted = true;
        (async () => {
            setLoading(true);
            await fetchAppointments(userId);
            if (mounted) setLoading(false);

            const channel = supabase
                .channel(`appointments-user-view-${userId}`)
                .on('postgres_changes', {
                    event: '*', schema: 'public', table: 'appointments', filter: `user_id=eq.${userId}`,
                }, () => fetchAppointments(userId))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        })();
        return () => { mounted = false; };
    }, [userId, fetchAppointments]);

    const { upcoming, past } = useMemo(() => {
        const up: Appointment[] = [], pa: Appointment[] = [];
        for (const a of items) {
            if (a.status === 'completed' || a.status === 'rejected') {
                pa.push(a);
            } else {
                up.push(a);
            }
        }
        return { upcoming: up, past: pa };
    }, [items]);

    const handleStatusUpdate = async (id: string, newStatus: Appointment['status'] | 'delete') => {
        if (newStatus === 'delete') {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (error) {
                toast.error(`History deletion failed: ${error.message}`);
            } else {
                toast.success('Record Permanently Deleted from History');
                fetchAppointments(userId);
            }
            return;
        }

        // Intercept cancel action
        if (newStatus === 'rejected') {
            setCancelModalId(id);
            return;
        }

        const { error } = await supabase
            .from('appointments')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error(`Update failed: ${error.message}`);
        } else {
            toast.success('Visit Completed');
            fetchAppointments(userId);
        }
    };

    const confirmCancel = async () => {
        if (!cancelModalId) return;
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'rejected' })
            .eq('id', cancelModalId);

        if (error) {
            toast.error(`Cancellation failed: ${error.message}`);
        } else {
            toast.success('Appointment Cancelled Forever');
            fetchAppointments(userId);
        }
        setCancelModalId(null);
    };

    if (loading) {
        return (
            <div className="py-20 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-[#5F97C9] animate-spin mx-auto mb-4" />
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Scanning Records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full relative">
            {/* Cancellation Modal */}
            <AnimatePresence>
                {cancelModalId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setCancelModalId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#0a0a0f] border border-red-500/20 rounded-3xl p-8 overflow-hidden shadow-2xl shadow-red-500/10"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
                                <AlertCircle size={32} />
                            </div>

                            <h3 className="text-3xl font-bold text-white text-center mb-2">Terminate Slot?</h3>
                            <p className="text-white/40 text-sm text-center mb-8 font-medium">This action cannot be undone. The slot will be permanently released back to the clinic.</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCancelModalId(null)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                                >
                                    Confirm Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header Info */}
            <div className="relative group overflow-hidden bg-white/[0.04] border border-white/10 rounded-xl p-10 backdrop-blur-3xl transition-all duration-500 hover:bg-white/[0.06] hover:border-white/20">
                {/* Decorative background effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5F97C9]/5 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-10 -mb-10 blur-3xl opacity-30" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#5F97C9] to-blue-600 flex items-center justify-center text-white shadow-2xl shadow-[#5F97C9]/20 transform transition-transform group-hover:scale-110 group-hover:rotate-3 flex-shrink-0">
                            <Stethoscope size={28} className="sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-1">
                                Veterinary Appointments
                            </h2>
                            <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em]">Medical Consultation Hub</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 sm:gap-8 self-start sm:self-center xl:self-center">
                        <div className="flex gap-6 sm:gap-8">
                            <div className="text-center">
                                <p className="text-white font-bold text-2xl sm:text-3xl leading-none">{upcoming.length}</p>
                                <p className="text-[#5F97C9] text-[8px] sm:text-[9px] uppercase font-bold tracking-widest mt-2 bg-[#5F97C9]/10 px-2 py-0.5 rounded-md">Scheduled</p>
                            </div>

                            <div className="text-center">
                                <p className="text-white font-bold text-2xl sm:text-3xl leading-none">{past.length}</p>
                                <p className="text-white/20 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest mt-2 bg-white/5 px-2 py-0.5 rounded-md">History</p>
                            </div>
                        </div>

                        <Link
                            href="/appointments/new"
                            className="w-full sm:w-auto group/btn relative flex items-center justify-center gap-3 bg-white text-[#16161f] text-xs font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wider overflow-hidden shadow-2xl shadow-white/5"
                        >
                            <CalendarDays size={16} />
                            <span>Book New</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
                <div className="space-y-10">
                    {/* Upcoming */}
                    <Section
                        title="Active Consultations"
                        subtitle={`${upcoming.length} upcoming session${upcoming.length !== 1 ? 's' : ''}`}
                        count={upcoming.length}
                        accent
                    >
                        {upcoming.length === 0 ? (
                            <EmptyState
                                title="No upcoming visits"
                                subtitle="Your scheduled consultations will appear here."
                                icon={<Stethoscope size={28} />}
                            />
                        ) : (
                            <div className="grid gap-4">
                                <AnimatePresence initial={false}>
                                    {upcoming.map(a => (
                                        <AppointmentCard
                                            key={a.id}
                                            appt={a}
                                            onStatusUpdate={handleStatusUpdate}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </Section>

                    {/* Past */}
                    <Section
                        title="Appointment History"
                        subtitle={`${past.length} past record${past.length !== 1 ? 's' : ''}`}
                        count={past.length}
                    >
                        {past.length === 0 ? (
                            <div className="text-center py-10 text-white/20 text-xs font-bold uppercase tracking-widest rounded-3xl border border-dashed border-white/5">
                                No past records found
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <AnimatePresence initial={false}>
                                    {past.map(a => <AppointmentCard key={a.id} appt={a} dim onStatusUpdate={handleStatusUpdate} />)}
                                </AnimatePresence>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-8">
                    <div className="relative overflow-hidden p-10 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-3xl hover:bg-white/[0.06] hover:border-white/20 transition-all group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5F97C9]/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

                        <h4 className="relative z-10 text-white text-[10px] font-bold uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-[#5F97C9] shadow-[0_0_10px_rgba(95,151,201,0.5)] animate-pulse" />
                            Policy
                        </h4>

                        <div className="relative z-10 space-y-10">
                            {[
                                { title: 'Slot Management', desc: 'Contact clinic desk for reschedules' },
                                { title: 'Early Check-in', desc: 'Report 15 mins prior to slot' },
                                { title: 'Cancellation', desc: '24-hour standard window applies' }
                            ].map(item => (
                                <div key={item.title} className="group/item">
                                    <p className="text-[#5F97C9] text-[10px] font-bold uppercase tracking-[0.2em] mb-3 group-hover/item:text-white transition-colors">{item.title}</p>
                                    <p className="text-white/40 text-xs font-bold leading-relaxed tracking-tight group-hover/item:text-white/60 transition-colors">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative overflow-hidden p-10 rounded-xl bg-gradient-to-br from-[#5F97C9]/20 via-[#5F97C9]/5 to-transparent border border-[#5F97C9]/20 group transition-all duration-500 hover:border-[#5F97C9]/40 hover:bg-[#5F97C9]/10">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#5F97C9]/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-150 transition-transform duration-1000" />

                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-[1.2rem] bg-white flex items-center justify-center text-[#16161f] mb-8 transform group-hover:rotate-[10deg] transition-all duration-500 shadow-2xl shadow-white/20">
                                <Stethoscope size={28} />
                            </div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em] mb-4">Emergency Care</p>
                            <p className="text-white/60 text-xs font-bold leading-relaxed mb-8 tracking-tight">Immediate veterinary assistance for acute surgical or medical cases available 24/7.</p>
                            <Link
                                href="/contactUs"
                                className="w-full py-4 rounded-xl bg-white/[0.08] border border-white/10 text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-[#5F97C9] hover:border-[#5F97C9] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 group/btn"
                            >
                                SOS Medical Desk
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
