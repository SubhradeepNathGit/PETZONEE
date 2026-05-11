import { supabase } from '@/lib/supabase';
import type { VetRow } from './types';

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

export async function loadNotiCount(
  userId: string,
  _role: 'user' | 'vet' | 'admin',
  setCount: (n: number) => void
) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);
    if (error) throw error;
    setCount(count ?? 0);
  } catch (error: unknown) {
    console.error('Load notification count error:', error);
    setCount(0);
  }
}
