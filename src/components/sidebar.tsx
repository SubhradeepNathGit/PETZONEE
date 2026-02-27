// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { sidebarMenus } from "@/app/config/sidebarMenus";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type SidebarProps = {
  role: "admin" | "vet" | "user";
  name: string;
  avatarUrl?: string;
  onItemClick?: () => void;
};

export default function Sidebar({ role, name, avatarUrl, onItemClick }: SidebarProps) {
  const menus = sidebarMenus[role] || [];
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // use same redirect as Navbar
      onItemClick?.();
      router.push("/signup"); // change to your actual login route
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="w-72 h-screen relative overflow-hidden flex flex-col border-r border-white/5">
      {/* Background Gradient - Restored to original orange palette */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFB799] via-[#FF8A70] to-[#E65700]"></div>

      {/* Glass overlay with depth */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-2xl"></div>

      {/* Accent glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full py-8">
        {/* Profile Section */}
        <div className="flex flex-col items-center px-8 mb-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-yellow-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  width={90}
                  height={90}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-white/10 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-24 h-24 rounded-full ring-4 ring-white/10 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-zinc-400 transition-transform duration-500 group-hover:scale-105">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>
          <h2 className="font-extrabold text-white text-2xl mt-6 mb-1 tracking-tight">{name}</h2>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
              {role}
            </span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-2 px-6 flex-1 overflow-y-auto custom-scrollbar">
          {menus.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={onItemClick}
              className="group relative flex items-center px-5 py-3.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.08] border border-transparent hover:border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 text-white/85 group-hover:text-white font-bold tracking-wide transition-colors duration-300">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="px-6 mt-6">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center justify-center gap-3 text-white/70 hover:text-white font-bold py-4 rounded-2xl transition-all duration-300 bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="tracking-tight">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-8 w-16 h-16 bg-white/5 rounded-full blur-lg"></div>
    </aside>
  );
}
