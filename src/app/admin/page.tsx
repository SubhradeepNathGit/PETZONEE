"use client";

import { useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import "@/lib/chartjs";
import {
  Users,
  Stethoscope,
  PackageOpen,
  ShieldCheck,
  PawPrint,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";

// Dynamic chart imports
const Line = dynamic(() => import("react-chartjs-2").then((m) => m.Line), {
  ssr: false,
});
const Doughnut = dynamic(
  () => import("react-chartjs-2").then((m) => m.Doughnut),
  { ssr: false }
);

// Types
export type VetRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kyc_status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  medical_doc_url: string | null;
  avatar_url: string | null;
};

export type UserRow = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin" | "vet" | string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type ProductRow = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  old_price: number | null;
  discount_price: number | null;
  img_1: string | null;
  img_2: string | null;
  badge: string | null;
  rating: number | null;
  category: string | null;
  tags: string | null;
};

// Utility functions
const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const lastNDaysLabels = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    daysAgo(n - 1 - i).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
    })
  );

export default function AdminAnalyticsPage() {

  const [meRole, setMeRole] = useState<
    "admin" | "user" | "vet" | "none" | "loading"
  >("loading");
  const [meName, setMeName] = useState<string>("");
  const [meAvatar, setMeAvatar] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [vets, setVets] = useState<VetRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const authId = auth?.user?.id;
        const authEmail = auth?.user?.email;

        if (!authId) {
          setMeRole("none");
          return;
        }

        // Try to find current user
        const queries = [
          supabase
            .from("users")
            .select("role, first_name, avatar_url")
            .eq("user_id", authId)
            .single(),
          supabase
            .from("users")
            .select("role, first_name, avatar_url")
            .eq("id", authId)
            .single(),
        ];

        if (authEmail) {
          queries.push(
            supabase
              .from("users")
              .select("role, first_name, avatar_url")
              .eq("email", authEmail)
              .single()
          );
        }

        const results = await Promise.all(queries);
        const me = results.find((r) => r.data)?.data;

        const role = (me?.role as "admin" | "user" | "vet") ?? "user";
        setMeRole(role);
        setMeName(me?.first_name || "");
        setMeAvatar(me?.avatar_url || null);

        if (role === "admin") {
          const [usersRes, vetsRes, productsRes] = await Promise.all([
            supabase.from("users").select("*"),
            supabase.from("veterinarian").select("*"),
            supabase.from("products").select("*"),
          ]);

          setUsers((usersRes.data as UserRow[]) || []);
          setVets((vetsRes.data as VetRow[]) || []);
          setProducts((productsRes.data as ProductRow[]) || []);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Computed metrics
  const metrics = useMemo(() => {
    const rolesCount = users.reduce((acc, u) => {
      const role = (u.role || "user").toLowerCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const kycCounts = vets.reduce(
      (acc, v) => {
        const status = (v.kyc_status || "pending").toLowerCase();
        acc[status as "approved" | "pending" | "rejected"] =
          (acc[status as "approved" | "pending" | "rejected"] || 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );

    const usersLast14 = (() => {
      const labels = lastNDaysLabels(14);
      const buckets = new Array(14).fill(0);
      const cutoff = daysAgo(13);

      users.forEach((u) => {
        const d = new Date(u.created_at);
        if (d >= cutoff) {
          const key = d.toLocaleDateString(undefined, {
            month: "short",
            day: "2-digit",
          });
          const idx = labels.indexOf(key);
          if (idx >= 0) buckets[idx]++;
        }
      });
      return { labels, data: buckets };
    })();

    const productsByCategory = (() => {
      const categoryMap = products.reduce((acc, p) => {
        const cat = p.category?.trim() || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sorted = Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);
      return {
        labels: sorted.map(([k]) => k),
        data: sorted.map(([, v]) => v),
      };
    })();

    return { rolesCount, kycCounts, usersLast14, productsByCategory };
  }, [users, vets, products]);

  // Chart data
  const chartData = {
    lineUsers: {
      labels: metrics.usersLast14.labels,
      datasets: [
        {
          label: "New Users",
          data: metrics.usersLast14.data,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    doughnutRoles: {
      labels: ["Users", "Vets", "Admins"],
      datasets: [
        {
          data: [
            metrics.rolesCount.user || 0,
            metrics.rolesCount.vet || 0,
            metrics.rolesCount.admin || 0,
          ],
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"],
        },
      ],
    },
  };

 if (loading) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FF8A65] to-black">
  <div className="h-12 w-12 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
  <p className="mt-4 text-lg font-medium text-white">Loading analytics...</p>
</div>

  );
}

  if (meRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FF8A65] to-black">
        <div className="p-8 backdrop-blur-sm bg-white/10 rounded-2xl shadow-lg text-center max-w-md border border-white/20">
          <PawPrint className="mx-auto mb-4 h-16 w-16 text-amber-400" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Access Restricted
          </h2>
          <p className="mb-4 text-blue-200">
            Administrator privileges required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/90">
      {/* Sidebar */}
      <aside className="hidden lg:block w-72 fixed min-h-screen left-0 top-0 z-50">
        <Sidebar
          role="admin"
          name={meName || "Admin"}
          avatarUrl={meAvatar || undefined}
        />
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 p-6">
          <h1 className="text-3xl font-bold text-center text-white">Admin Analytics</h1>
          <p className="text-blue-200 mt-1 text-center"> overview and insights</p>
        </div>
        
        {/* Main Content */}
        <div className="min-h-screen">
          <div className="max-w-full mx-auto p-8 space-y-8">
            {/* KPI Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <StatCard
                icon={<Users className="h-6 w-6" />}
                label="Total Users"
                value={users.length}
                footer={`${metrics.rolesCount.admin || 0} Admins • ${
                  metrics.rolesCount.vet || 0
                } Vets`}
              />
              <StatCard
                icon={<Stethoscope className="h-6 w-6" />}
                label="Veterinarians"
                value={vets.length}
                footer={`${metrics.kycCounts.approved} Approved • ${
                  metrics.kycCounts.pending
                } Pending`}
              />
              <StatCard
                icon={<ShieldCheck className="h-6 w-6" />}
                label="KYC Pending"
                value={metrics.kycCounts.pending}
                footer={`${metrics.kycCounts.approved} Approved • ${metrics.kycCounts.rejected} Rejected`}
              />
              <StatCard
                icon={<PackageOpen className="h-6 w-6" />}
                label="Products"
                value={products.length}
                footer={`Top: ${
                  metrics.productsByCategory.labels[0] || "None"
                }`}
              />
            </motion.div>

            {/* Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <ChartCard
                title="User Growth (14 days)"
                subtitle="Daily registrations"
              >
                <Line
                  data={chartData.lineUsers}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: "#e2e8f0" } } },
                    scales: {
                      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
                      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
                    },
                  }}
                />
              </ChartCard>

              <ChartCard
                title="User Roles"
                subtitle="Distribution breakdown"
              >
                <Doughnut
                  data={chartData.doughnutRoles}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: "#e2e8f0" } } },
                  }}
                />
              </ChartCard>
            </motion.div>

            {/* Data Tables */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Recent Users */}
              <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-xl">
                <h3 className="font-bold text-xl mb-4 text-white">Recent Sign-ups</h3>
                <div className="divide-y divide-white/10 max-h-64 overflow-y-auto">
                  {users
                    .slice()
                    .sort(
                      (a, b) =>
                        +new Date(b.created_at) - +new Date(a.created_at)
                    )
                    .slice(0, 6)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="py-3 flex items-center gap-3 hover:bg-white/5 rounded-lg px-2 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-md flex-shrink-0">
                          {u.avatar_url ? (
                            <Image
                              src={u.avatar_url}
                              alt="User avatar"
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-sm text-blue-200 truncate">
                            {u.email}
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* KYC Pending */}
              <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-xl">
                <h3 className="font-bold text-xl mb-4 text-white">KYC Pending</h3>
                <div className="divide-y divide-white/10 max-h-64 overflow-y-auto">
                  {vets
                    .filter(
                      (v) =>
                        (v.kyc_status || "").toLowerCase() === "pending"
                    )
                    .slice(0, 6)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="py-3 flex items-center gap-3 hover:bg-white/5 rounded-lg px-2 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden shadow-md flex-shrink-0">
                          {v.avatar_url ? (
                            <Image
                              src={v.avatar_url}
                              alt="Vet avatar"
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <Stethoscope className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{v.name}</div>
                          <div className="text-sm text-green-200 truncate">
                            {v.email}
                          </div>
                        </div>
                        <span className="text-xs bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full border border-amber-400/30 whitespace-nowrap">
                          Pending
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({
  icon,
  label,
  value,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  footer?: string;
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }} 
      className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-sm uppercase tracking-wider text-blue-200 font-medium">
            {label}
          </div>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
      </div>
      {footer && <div className="text-sm text-gray-300 mt-2">{footer}</div>}
    </motion.div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-xl">
      <h3 className="font-bold text-xl mb-2 text-white">{title}</h3>
      {subtitle && <p className="text-blue-300 mb-4">{subtitle}</p>}
      <div className="h-72">{children}</div>
    </div>
  );
}