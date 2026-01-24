'use client';
import Image from 'next/image';
import { Card, AvatarPicker } from './shared/ui';
import { IconMail, IconCalendar, IconCheck, IconX } from './shared/icons';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';


type AppointmentStatus = 'pending' | 'accepted' | 'rejected';

type PatientUser = {
  first_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type AppointmentRow = {
  id: string;
  created_at: string; // ISO
  status: AppointmentStatus;
  users: PatientUser | null; // joined user row
};

type FilterKey = 'all' | AppointmentStatus;

export default function VetDashboard({
  name, meId, avatarUrl, onAvatarChange, showMessage,
}: {
  name: string;
  meId: string | null;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!meId) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('appointments')
          .select('id, created_at, status, users(first_name, email, avatar_url)')
          .eq('vet_id', meId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedData: AppointmentRow[] = (data as unknown[] ?? []).map((row) => {
          const r = row as { users: PatientUser[] | PatientUser | null } & Omit<AppointmentRow, 'users'>;
          return {
            ...r,
            users: Array.isArray(r.users) ? r.users[0] : (r.users || null)
          };
        });

        setAppointments(mappedData);
      } catch (error: unknown) {
        console.error('Fetch appointments error:', error);
        showMessage('Failed to load appointments', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [meId, showMessage]);

  async function updateStatus(id: string, status: Exclude<AppointmentStatus, 'pending'>) {
    try {
      setBusyId(id);
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;

      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status } : a)),
      );
      showMessage(`Appointment ${status} successfully!`, 'success');
    } catch (err: unknown) {
      console.error('Update status error:', err);
      showMessage('Failed to update appointment status', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const filteredAppointments = useMemo(
    () => (filter === 'all' ? appointments : appointments.filter(a => a.status === filter)),
    [appointments, filter],
  );

  const stats = useMemo(
    () => ({
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      accepted: appointments.filter(a => a.status === 'accepted').length,
      rejected: appointments.filter(a => a.status === 'rejected').length,
    }),
    [appointments],
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <AvatarPicker
              currentUrl={avatarUrl}
              meId={meId}
              table="veterinarian"
              showMessage={showMessage}
              onUploaded={onAvatarChange}
            />
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Welcome, {name ? `Dr. ${name}` : 'Doctor'} 🩺
              </h2>
              <p className="text-gray-300">Manage your appointments and patients</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-cyan-300">{stats.total}</p>
              <p className="text-xs text-gray-300">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
              <p className="text-xs text-gray-300">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-emerald-300">{stats.accepted}</p>
              <p className="text-xs text-gray-300">Accepted</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
              <p className="text-xs text-gray-300">Rejected</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Appointments</h3>
            <p className="text-gray-300 text-sm">Manage your patient appointments</p>
          </div>

          <div className="flex gap-2">
            {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${filter === f
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && stats[f] > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                    {stats[f]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="h-12 w-12 bg-white/10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h4 className="text-xl font-semibold text-white mb-2">
              {filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
            </h4>
            <p className="text-gray-300">
              {filter === 'all'
                ? 'Your appointments will appear here once patients book with you.'
                : `Switch to "All" to see appointments with other statuses.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10">
                      <Image
                        src={appointment.users?.avatar_url || '/images/avatar-placeholder.png'}
                        width={48}
                        height={48}
                        alt={appointment.users?.first_name || 'Patient'}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {appointment.users?.first_name || 'Unknown Patient'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        <span className="flex items-center gap-1">
                          <IconMail size={14} />
                          {appointment.users?.email ?? '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconCalendar size={14} />
                          {new Date(appointment.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${appointment.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30'
                            : appointment.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
                              : appointment.status === 'rejected'
                                ? 'bg-red-500/10 text-red-200 border-red-500/30'
                                : 'bg-white/10 text-gray-200 border-white/20'
                            }`}
                        >
                          {appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {appointment.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => updateStatus(appointment.id, 'accepted')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow hover:brightness-110 transition text-sm disabled:opacity-60"
                        >
                          <IconCheck size={16} />{' '}
                          {busyId === appointment.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => updateStatus(appointment.id, 'rejected')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 text-white shadow hover:brightness-110 transition text-sm disabled:opacity-60"
                        >
                          <IconX size={16} />{' '}
                          {busyId === appointment.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


export function KycPending({ status }: { status: 'pending' | 'rejected' | 'approved' }) {
  const statusConfig = {
    pending: {
      icon: '⏳',
      title: 'Application Under Review',
      description: 'Your veterinarian application is being reviewed by our team.',
      color: 'text-yellow-300',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
    },
    rejected: {
      icon: '❌',
      title: 'Application Rejected',
      description: 'Your application has been rejected. Please contact support for more information.',
      color: 'text-red-300',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    },
    approved: {
      icon: '✅',
      title: 'Application Approved',
      description: 'Congratulations! Your application has been approved.',
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    },
  } as const;

  const cfg = statusConfig[status];

  return (
    <Card className={`${cfg.bg} ${cfg.border} border`}>
      <div className="text-center py-8 text-white">
        <div className="text-6xl mb-4">{cfg.icon}</div>
        <h2 className={`text-2xl font-bold mb-3 ${cfg.color}`}>{cfg.title}</h2>
        <p className="text-gray-300 mb-6 max-w-md mx-auto">{cfg.description}</p>

        {status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
              <div className="animate-spin h-4 w-4 border-2 border-yellow-300 border-t-transparent rounded-full" />
              Processing your application...
            </div>
            <p className="text-xs text-gray-400">This usually takes 1-2 business days</p>
          </div>
        )}

        {status === 'rejected' && (
          <button className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow hover:brightness-110 transition">
            Contact Support
          </button>
        )}
      </div>
    </Card>
  );
}
