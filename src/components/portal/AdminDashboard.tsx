'use client';
import Image from 'next/image';
import Link from 'next/link';
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
      <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-6 md:p-10 transition-all duration-500">
        {/* Static Mirror Reflection Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent opacity-50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-50 pointer-events-none" />

        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-20 -mb-20 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="flex-shrink-0">
              <AvatarPicker name={firstName || "Admin"} currentUrl={profileAvatar} meId={meId} table="users" showMessage={showMessage} onUploaded={onAvatarChange} />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#FF8A65] mb-2">Command Center</p>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-tight mb-4">
                Hello{firstName ? `, ${firstName}` : ''}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-white/30 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em]">
                  Here is what happening on <span className="text-white font-black italic shadow-orange-500/50">PETZONEE</span> today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4 md:space-y-2 w-full md:w-auto">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] flex items-center gap-4">
              Platform Quick Actions
              <div className="hidden md:block flex-1 h-[1px] flex-grow bg-white/5 min-w-[200px]"></div>
            </h3>
            <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest hidden md:block">Administrative shortcuts</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/admin" className="px-6 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shadow-lg hover:shadow-blue-500/20">
              Analytics Terminal
            </Link>
            <Link href="/admin/kyc" className="px-6 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-lg hover:shadow-orange-500/20">
              Review Applications
            </Link>
            <Link href="/admin/users" className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-white/20 transition-all">
              Manage Users
            </Link>
          </div>
        </div>
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
