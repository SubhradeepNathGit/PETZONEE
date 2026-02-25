'use client';
import { Card, FeatureCard, AvatarPicker } from './shared/ui';
import React from 'react';
import { PawPrint, Calendar, ShoppingBag, Bell } from 'lucide-react';

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
  return (
    <div className="space-y-8 pb-10">
      <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-10 shadow-2xl transition-all duration-500">
        {/* Static Mirror Reflection Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-50" />

        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-20 -mb-20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
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
          <div className="flex-1">
            <h2 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
              Hello{firstName ? `, ${firstName}` : ''}
            </h2>
            <p className="text-white/80 text-lg font-medium">
              Your premium pet care journey starts here with <span className="text-white font-bold">PETZONEE</span>
            </p>
          </div>
        </div>
      </Card>

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

      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-bold text-white">Recent Activity</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center text-orange-500 font-bold text-xl group-hover:scale-110 transition-transform">
              P
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Welcome to PETZONEE</p>
              <p className="text-sm text-gray-400 font-medium mt-1">Complete your profile to unlock personalized pet care recommendations</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Just now</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
