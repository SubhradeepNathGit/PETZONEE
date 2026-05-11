// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { sidebarMenus } from "@/app/config/sidebarMenus";
import Image from "next/image";
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  MessageSquare, 
  Calendar, 
  Compass, 
  ShoppingCart, 
  Rss, 
  PlusCircle, 
  Headphones, 
  Mail, 
  Trash2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React from "react";

type SidebarProps = {
  role: "admin" | "vet" | "user";
  name: string;
  avatarUrl?: string;
  onItemClick?: () => void;
};

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Stethoscope,
  Users,
  CreditCard,
  ShieldCheck,
  Package,
  ShoppingBag,
  DollarSign,
  MessageSquare,
  User,
  Calendar,
  Compass,
  ShoppingCart,
  Rss,
  PlusCircle,
  Headphones,
  Mail,
  Trash2
};

function SidebarInner({ role, name, avatarUrl, onItemClick }: SidebarProps) {
  const menus = sidebarMenus[role] || [];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build the current full path including query string for accurate active-state matching
  const currentFullPath = React.useMemo(() => {
    const sp = searchParams.toString();
    return sp ? `${pathname}?${sp}` : pathname;
  }, [pathname, searchParams]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onItemClick?.();
      router.push("/signup");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="w-72 h-screen relative overflow-hidden flex flex-col border-r border-white/5 bg-[#0a0a0f]">
      {/* Subtle depth gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full py-10">
        {/* Profile Section */}
        <div className="flex flex-col items-center px-8 mb-12">
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-700 ${role === 'vet' ? 'bg-cyan-500' : 'bg-gradient-to-r from-[#FF8A70] to-[#FF7043]'}`}></div>
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  width={100}
                  height={100}
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-white/10 transition-all duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-24 h-24 rounded-full ring-2 ring-white/10 bg-white/5 flex items-center justify-center text-white/20 transition-all duration-500 group-hover:scale-105 group-hover:text-white/40">
                  <User className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>
          <h2 className="font-extrabold text-white text-2xl mt-6 mb-1 tracking-tight">{name}</h2>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className={`w-1.5 h-1.5 rounded-full ${role === 'vet' ? 'bg-cyan-500' : 'bg-[#FF8A70]'}`}></div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
              {role}
            </span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-1.5 px-4 flex-1 overflow-y-auto custom-scrollbar">
          {menus.map((item) => {
            const Icon = iconMap[item.icon || "User"] || User;
            const isActive = currentFullPath === item.path;
            
            return (
              <Link
                key={`${item.path}-${item.label}`}
                href={item.path}
                onClick={onItemClick}
                className={`group relative flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 border ${
                  isActive 
                    ? role === 'vet'
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-[#FF8A70]/10 border-[#FF8A70]/20 text-[#FF8A70]" 
                    : "text-white/50 hover:bg-white/5 border-transparent hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? (role === 'vet' ? "text-cyan-400" : "text-[#FF8A70]") : "text-white/40 group-hover:text-white"}`} />
                <span className="font-bold text-sm tracking-wide">
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute right-4 w-1.5 h-1.5 rounded-full ${role === 'vet' ? "bg-cyan-500" : "bg-[#FF8A70]"}`}></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="px-4 mt-8">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center justify-center gap-3 text-white/40 hover:text-white font-bold py-4 rounded-2xl transition-all duration-300 bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:rotate-12 group-hover:text-red-500" />
            <span className="text-sm tracking-tight">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <React.Suspense fallback={<div className="w-72 h-screen bg-[#0a0a0f] border-r border-white/5 animate-pulse" />}>
      <SidebarInner {...props} />
    </React.Suspense>
  );
}
