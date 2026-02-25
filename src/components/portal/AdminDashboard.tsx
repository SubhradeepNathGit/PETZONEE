'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, Metric, AvatarPicker } from './shared/ui';
import { useDebounce } from './shared/hooks';
import { IconUsers, IconShield, IconMedal, IconSearch, IconRefresh, IconMail, IconPhone, IconDocument, IconCheck, IconX } from './shared/icons';
import { ClipboardList, Stethoscope } from 'lucide-react';
import type { VetRow } from './shared/types';
import React, { useMemo, useState } from 'react';

export default function AdminDashboard({
  firstName, meId, rows, stats, busy, setBusy, showMessage, refresh, profileAvatar, onAvatarChange,
}: {
  firstName: string;
  meId: string | null;
  rows: VetRow[];
  stats: { users: number; vetsPending: number; vetsApproved: number };
  busy: string;
  setBusy: (s: string) => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  refresh: () => Promise<void>;
  profileAvatar: string | null;
  onAvatarChange: (url: string | null) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter(
      (vet) =>
        vet.name.toLowerCase().includes(q) ||
        vet.email.toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  async function setKyc(id: string, status: 'approved' | 'rejected') {
    try {
      setBusy(id);
      const { data, error } = await supabase
        .from('veterinarian')
        .update({
          kyc_status: status,
          approved_by: meId ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, kyc_status')
        .single();

      if (error) throw error;
      if (!data) throw new Error('No row returned. Check table configuration.');

      await refresh();
      showMessage(`Veterinarian ${status === 'approved' ? 'approved' : 'rejected'} successfully!`, 'success');
    } catch (err: unknown) {
      console.error('KYC update error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update KYC status.';
      showMessage(msg, 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <AvatarPicker name={firstName || "Admin"} currentUrl={profileAvatar} meId={meId} table="users" showMessage={showMessage} onUploaded={onAvatarChange} />
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Hello, {firstName || 'Admin'}</h2>
              <p className="text-gray-300">Here is what happening on Pet Verse today.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Metric title="Total Users" value={stats.users} icon={<IconUsers />} gradient="from-cyan-500 to-blue-600" trend="+12%" />
            <Metric title="Pending KYC" value={stats.vetsPending} icon={<IconShield />} gradient="from-yellow-400 to-amber-600" trend={stats.vetsPending > 0 ? 'Needs attention' : 'All clear'} />
            <Metric title="Approved Vets" value={stats.vetsApproved} icon={<IconMedal />} gradient="from-emerald-500 to-teal-600" trend="+3 this week" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">KYC Review Center</h3>
            <p className="text-gray-300 text-sm">Review and approve veterinarian applications</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-64 h-10 rounded-xl bg-white/5 text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="Search veterinarians..."
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch size={16} />
              </span>
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition"
              title="Refresh"
            >
              <IconRefresh size={16} />
            </button>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white/5 text-gray-500 mb-6">
              <ClipboardList size={40} />
            </div>
            <h4 className="text-2xl font-bold text-white mb-2">
              {searchQuery ? 'No matching applications' : 'No pending applications'}
            </h4>
            <p className="text-gray-400 max-w-sm mx-auto font-medium">
              {searchQuery ? 'Try adjusting your search terms to find what you are looking for.' : 'All veterinarian applications have been reviewed. Good job!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRows.map((vet, index) => (
              <motion.div
                key={vet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-cyan-400/30">
                        <Image
                          src={vet.avatar_url || '/images/avatar-placeholder.png'}
                          width={64}
                          height={64}
                          alt={vet.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center shadow-lg ring-2 ring-black/10">
                        <Stethoscope size={12} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-white">{vet.name}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mt-1">
                        <span className="flex items-center gap-1"><IconMail size={14} />{vet.email}</span>
                        <span className="flex items-center gap-1"><IconPhone size={14} />{vet.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${vet.medical_doc_url ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30' : 'bg-red-500/10 text-red-200 border-red-500/30'}`}>
                          Medical License: {vet.medical_doc_url ? 'Provided' : 'Missing'}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full border bg-yellow-500/10 text-yellow-200 border-yellow-500/30">
                          Status: {vet.kyc_status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {vet.medical_doc_url && (
                      <a
                        href={vet.medical_doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition text-sm"
                      >
                        <IconDocument size={16} /> View Document
                      </a>
                    )}
                    <button
                      disabled={busy === vet.id}
                      onClick={() => setKyc(vet.id, 'approved')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow hover:brightness-110 transition text-sm disabled:opacity-60"
                    >
                      <IconCheck size={16} /> {busy === vet.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      disabled={busy === vet.id}
                      onClick={() => setKyc(vet.id, 'rejected')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 text-white shadow hover:brightness-110 transition text-sm disabled:opacity-60"
                    >
                      <IconX size={16} /> {busy === vet.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}



type VetSelect = Pick<
  VetRow,
  'id' | 'name' | 'email' | 'phone' | 'medical_doc_url' | 'kyc_status' | 'avatar_url'
>;

export async function loadPendingVets(setRows: (r: VetRow[]) => void) {
  try {
    const { data, error } = await supabase
      .from('veterinarian')
      .select('id,name,email,phone,medical_doc_url,kyc_status,avatar_url')
      .eq('kyc_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;


    setRows((data as VetSelect[] | null) ?? []);
  } catch (error: unknown) {
    console.error('Load pending vets error:', error);
    setRows([]);
  }
}

export async function loadAdminStats(
  setStats: (s: { users: number; vetsPending: number; vetsApproved: number }) => void
) {
  try {
    const [usersResult, pendingResult, approvedResult] = await Promise.allSettled([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('veterinarian').select('id', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
      supabase.from('veterinarian').select('id', { count: 'exact', head: true }).eq('kyc_status', 'approved'),
    ]);

    const users = usersResult.status === 'fulfilled' ? (usersResult.value.count ?? 0) : 0;
    const vetsPending = pendingResult.status === 'fulfilled' ? (pendingResult.value.count ?? 0) : 0;
    const vetsApproved = approvedResult.status === 'fulfilled' ? (approvedResult.value.count ?? 0) : 0;

    setStats({ users, vetsPending, vetsApproved });
  } catch (error: unknown) {
    console.error('Load admin stats error:', error);
    setStats({ users: 0, vetsPending: 0, vetsApproved: 0 });
  }
}
