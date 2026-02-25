
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { IconCamera, IconUser } from './icons';


export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-md shadow-lg hover:shadow-xl transition ${className}`}
    >
      {children}
    </motion.div>
  );
}


export function LoadingCard() {
  return (
    <Card className="border-none bg-white/[0.02]">
      <div className="animate-pulse space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white/10 rounded-full" />
          <div className="space-y-3 flex-1">
            <div className="h-8 bg-white/10 rounded-xl w-1/3" />
            <div className="h-4 bg-white/10 rounded-lg w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white/5 rounded-3xl border border-white/5" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      <div className="h-48 w-full bg-white/[0.03] rounded-3xl animate-pulse flex items-center p-8 gap-6 border border-white/5">
        <div className="h-24 w-24 rounded-full bg-white/10" />
        <div className="space-y-4 flex-1">
          <div className="h-10 bg-white/10 rounded-xl w-1/4" />
          <div className="h-4 bg-white/10 rounded-lg w-1/3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 bg-white/[0.03] rounded-3xl border border-white/5 animate-pulse p-8">
            <div className="w-14 h-14 bg-white/10 rounded-2xl mb-6" />
            <div className="h-8 bg-white/10 rounded-xl w-3/4 mb-4" />
            <div className="h-4 bg-white/10 rounded-lg w-full mb-2" />
            <div className="h-4 bg-white/10 rounded-lg w-2/3" />
          </div>
        ))}
      </div>

      <div className="h-40 bg-white/[0.03] rounded-3xl border border-white/5 animate-pulse p-8">
        <div className="h-8 bg-white/10 rounded-xl w-1/5 mb-6" />
        <div className="flex items-center gap-4">
          <div className="h-12 w-full bg-white/10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}


export function Metric({
  title,
  value,
  icon,
  gradient,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-br ${gradient} p-2.5 text-white shadow-md`}>{icon}</div>
        <div className="flex-1">
          <p className="text-xs text-gray-300 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white leading-tight">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-0.5">{trend}</p>}
        </div>
      </div>
    </div>
  );
}


export function FeatureCard({
  title,
  description,
  icon,
  gradient,
  action,
  href,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  action: string;
  href?: string;
  onClick?: () => void;
}) {
  const buttonClass = `inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${gradient} text-white rounded-xl font-semibold text-sm shadow-lg shadow-black/20 hover:brightness-110 active:scale-95 transition-all duration-300 group-hover:translate-x-1`;
  const arrow = <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-3xl p-8 bg-white/[0.03] border border-white/10 hover:border-white/20 shadow-2xl transition-all duration-500 backdrop-blur-xl"
    >
      <div
        className={`absolute -top-12 -right-12 h-48 w-48 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 group-hover:scale-150 transition-all duration-700`}
      />

      <div className="relative z-10">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-3 mb-6 shadow-xl shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
          <div className="text-white">
            {icon}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">{description}</p>

        {href ? (
          <Link href={href} className={buttonClass}>
            <span>{action}</span>
            {arrow}
          </Link>
        ) : (
          <button onClick={onClick} type="button" className={buttonClass}>
            <span>{action}</span>
            {arrow}
          </button>
        )}
      </div>
    </motion.div>
  );
}


export function AvatarPicker({
  currentUrl,
  meId,
  table,
  showMessage,
  onUploaded,
  name,
}: {
  currentUrl: string | null;
  meId: string | null;
  table: 'users' | 'veterinarian';
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUploaded: (url: string | null) => void;
  name?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => fileRef.current?.click();

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!meId) {
        showMessage('Not signed in', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showMessage('Image must be less than 5MB', 'error');
        return;
      }

      try {
        setUploading(true);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${meId}/avatar-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = pub?.publicUrl ?? '';

        const { error: dbErr } = await supabase.from(table).update({ avatar_url: publicUrl }).eq('id', meId);
        if (dbErr) throw dbErr;

        onUploaded(publicUrl);
        showMessage('Profile picture updated successfully!', 'success');
      } catch (err) {
        console.error('Avatar upload error:', err);
        const message = err instanceof Error ? err.message : 'Failed to upload profile picture';
        showMessage(message, 'error');
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [meId, table, showMessage, onUploaded],
  );

  return (
    <div className="relative group">
      <div className="h-35 w-35 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl bg-zinc-800 flex items-center justify-center transition-all duration-500 group-hover:ring-white/20">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt="Profile"
            width={140}
            height={140}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-zinc-400">
            <IconUser size={80} />
          </div>
        )}
      </div>
      <button
        onClick={handlePick}
        disabled={uploading}
        className="absolute -bottom-0 -right-0 h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110 transition hover:scale-110 disabled:opacity-50"
        title="Upload profile picture"
      >
        {uploading ? (
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <IconCamera size={16} />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
