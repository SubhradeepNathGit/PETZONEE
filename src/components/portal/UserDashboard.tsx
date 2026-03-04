'use client';
import { Card, FeatureCard, AvatarPicker } from './shared/ui';
import React, { useEffect, useState } from 'react';
import { PawPrint, Calendar, ShoppingBag, Bell, ShieldCheck, Crown, Zap, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserDashboard({
  firstName, meId, profileAvatar, onAvatarChange, showMessage, onExploreMyPets,
}: {
  firstName: string;
  meId: string | null;
  profileAvatar: string | null;
  onAvatarChange: (url: string | null) => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onExploreMyPets: () => void;
}) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  useEffect(() => {
    if (!meId) return;
    const fetchSub = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', meId)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        const now = new Date();
        const expiry = new Date(data.end_date);

        if (expiry < now) {
          // Auto-expire in UI/DB if needed 
          // (Usually done by a cron/edge function, but we can handle UI state)
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } else {
        setSubscription(null);
      }
      setLoadingSub(false);
    };
    fetchSub();
  }, [meId]);

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Welcome Card */}
        <Card className="lg:col-span-2 relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-6 md:p-10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent opacity-50" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-[80px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="flex-shrink-0">
              <AvatarPicker
                name={firstName}
                currentUrl={profileAvatar}
                meId={meId}
                table="users"
                showMessage={showMessage}
                onUploaded={onAvatarChange}
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#FF8A65] mb-2">Member Portal</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase leading-tight">
                Hello{firstName ? `, ${firstName}` : ''}
              </h2>
            </div>
          </div>
        </Card>

        {/* Membership Plan Card */}
        <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-8 flex flex-col justify-between group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-50" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                {subscription ? <Crown className="w-6 h-6 text-yellow-500" /> : <ShieldCheck className="w-6 h-6 text-white/40" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                Current Plan
              </span>
            </div>

            {loadingSub ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 w-3/4 bg-white/5 rounded-lg" />
                <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
              </div>
            ) : subscription ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">
                    {subscription.plan_name}
                  </h3>
                  <p className="text-orange-500 text-xs font-bold uppercase tracking-widest">Active Member</p>
                </div>
                <div className="flex items-center gap-4 py-4 border-y border-white/5">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Benefit</p>
                    <p className="text-white text-sm font-bold">
                      {subscription.plan_name === 'Premium Care' ? 'Unlimited' : subscription.plan_name === 'Complete Care' ? '4 Free' : '1+1 Free'} Consults
                    </p>
                  </div>
                  <div className="h-8 w-[1px] bg-white/5" />
                  <div className="flex-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Discount</p>
                    <p className="text-white text-sm font-bold">
                      {subscription.plan_name === 'Premium Care' ? '25%' : subscription.plan_name === 'Complete Care' ? '15%' : '5%'} Off Shop
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white/20 tracking-tighter uppercase">No Active Plan</h3>
                <p className="text-sm text-gray-400 font-medium">Unlock premium benefits, free consultations, and shop discounts.</p>
                <button
                  onClick={() => window.location.href = '/vet'}
                  className="w-full mt-4 py-3 rounded-xl bg-orange-500 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>

          {subscription && (
            <div className="relative z-10 mt-6 pt-4 flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              Renews: {new Date(subscription.end_date).toLocaleDateString()}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureCard
          title="Pet Profiles"
          description="Create and manage detailed profiles for your furry friends with daily photos and activity feed."
          icon={<PawPrint className="w-8 h-8" />}
          gradient="from-orange-500 to-yellow-500"
          action="Manage Pets"
          onClick={onExploreMyPets}
        />
        <FeatureCard
          title="Book Appointments"
          description="Find specialized veterinarians near you and schedule appointments with a single tap."
          icon={<Calendar className="w-8 h-8" />}
          gradient="from-cyan-500 to-blue-500"
          action="Book Now"
          href="/appointments/new"
        />
        <FeatureCard
          title="Shop Products"
          description="Discover premium pet food, grooming kits, and exclusive accessories."
          icon={<ShoppingBag className="w-8 h-8" />}
          gradient="from-rose-500 to-fuchsia-600"
          action="Shop Now"
          href="/products"
        />
      </div>

      <Card className="bg-[#0a0a0a]/80 border border-white/5 backdrop-blur-3xl p-10 mt-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Recent Activity</h3>
        </div>

        <div className="space-y-4">
          {subscription && new Date(subscription.end_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && (
            <div className="flex items-center gap-5 p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 group animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-black font-bold text-xl">
                <ShieldCheck />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg uppercase tracking-tighter">Action Required: Plan Expiring</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Your {subscription.plan_name} ends soon on {new Date(subscription.end_date).toLocaleDateString()}. Renew now to keep your benefits.</p>
              </div>
              <button onClick={() => window.location.href = '/vet'} className="px-5 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest">
                Renew
              </button>
            </div>
          )}
          <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center text-orange-500 font-bold text-xl group-hover:scale-110 transition-transform">
              P
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Your Membership is Active</p>
              <p className="text-sm text-gray-400 font-medium mt-1">You are currently enjoying specialized care and exclusive shop discounts with PETZONEE.</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pulse</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
