// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { sidebarMenus } from "@/app/config/sidebarMenus";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type SidebarProps = {
  role: "admin" | "vet" | "user";
  name: string;
  avatarUrl?: string;
};

export default function Sidebar({ role, name, avatarUrl }: SidebarProps) {
  const menus = sidebarMenus[role] || [];
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // use same redirect as Navbar
      router.push("/signup"); // change to your actual login route
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="w-72 h-screen relative overflow-hidden flex flex-col">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFB799] via-[#FF8A70] to-[#E65700]"></div>
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-md"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Profile Section */}
        <div className="flex flex-col pt-8 items-center px-6">
          <div className="relative mb-4">
            <Image
              src={avatarUrl || "/default-avatar.png"}
              alt={name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-[#f6f6dc] shadow-lg"
            />
          </div>
          <h2 className="font-bold text-white text-xl mb-1 drop-shadow-sm">{name}</h2>
          <p className="text-sm text-white/80 capitalize bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
            {role}
          </p>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-2 mt-8 px-4 flex-1">
          {menus.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="group relative text-white/90 font-medium text-base px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/20 hover:shadow-lg backdrop-blur-sm border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center justify-center gap-3 text-white/90 font-medium text-base px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-[#FF8A65]/20 hover:shadow-lg backdrop-blur-sm border border-white/10 hover:border-[#FFB399]/40"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:scale-100" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-8 w-16 h-16 bg-white/5 rounded-full blur-lg"></div>
    </aside>
  );
}
