
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { IconCamera } from './icons';


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
    <Card>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-white/10 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    </Card>
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
  const buttonClass = `inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradient} text-white rounded-lg font-medium text-sm shadow-md hover:brightness-110 transition group-hover:translate-x-1`;
  const arrow = <span className="group-hover:translate-x-0.5 transition-transform duration-300">→</span>;

  return (
    <div className="group relative overflow-hidden rounded-2xl p-6 bg-white/5 border border-white/10 shadow-sm transition-all duration-300">
      <div
        className={`absolute -top-2 -right-1 h-32 w-32 bg-gradient-to-br ${gradient} opacity-30 rounded-full blur-2xl group-hover:scale-400 transition-transform duration-500`}
      />
      <div className="relative z-10">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">{description}</p>

        {href ? (
          <Link href={href} className={buttonClass}>
            {action}
            {arrow}
          </Link>
        ) : (
          <button onClick={onClick} type="button" className={buttonClass}>
            {action}
            {arrow}
          </button>
        )}
      </div>
    </div>
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
      <div className="h-35 w-35 rounded-full overflow-hidden ring-6 ring-yellow-200 shadow-lg bg-white/10 flex items-center justify-center">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt="Profile"
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#FF8A65] to-[#FF5722] flex items-center justify-center text-white text-6xl font-bold">
            {(name || "U").charAt(0).toUpperCase()}
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
