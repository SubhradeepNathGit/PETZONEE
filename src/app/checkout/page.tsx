// app/checkout/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  Wallet,
  Landmark,
  IndianRupee,
  Shield,
  CheckCircle2,
  Package,
  User,
  Home,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import SpinnerLoader from "@/components/SpinnerLoader";

/* ---------- Types ---------- */
type CartRow = {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  inserted_at: string;
};

type PayMode = "card" | "upi" | "netbanking" | "wallet";

type Contact = {
  email: string;
  phone: string;
};

type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const PROMO_LOCAL_KEY = "applied_promo_code"; // 🔑 same as Cart

export default function CheckoutPage() {
  const router = useRouter();

  // state
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const [contact, setContact] = useState<Contact>({ email: "", phone: "" });
  const [addr, setAddr] = useState<Address>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [delivery, setDelivery] = useState<"standard" | "express">("standard");
  const [payMode, setPayMode] = useState<PayMode>("card");

  // promo
  const [promoCode, setPromoCode] = useState<string | null>(null);

  /* ---------- Init: auth + cart + promo ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          if (mounted) {
            setMsg("Please sign in to continue.");
            setLoading(false);
          }
          return;
        }
        if (mounted) setUserId(auth.user.id);

        const { data, error } = await supabase
          .from("cart")
          .select("*")
          .eq("user_id", auth.user.id)
          .order("inserted_at", { ascending: false });

        if (error) {
          console.error("Failed to load cart:", error);
          if (mounted) setMsg("Could not load your cart.");
        } else if (mounted) {
          setItems((data as CartRow[]) ?? []);
        }
      } catch (err) {
        console.error("Checkout init error:", err);
        if (mounted) setMsg("An unexpected error occurred.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 🔑 check promo from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PROMO_LOCAL_KEY);
      if (saved && saved.trim().toUpperCase() === "WELCOME10") {
        setPromoCode("WELCOME10");
      } else {
        setPromoCode(null);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Pricing ---------- */
  const subtotal = useMemo(
    () => items.reduce((s, r) => s + Number(r.price) * r.quantity, 0),
    [items]
  );

  const deliveryFee = delivery === "standard" ? 0 : 99;
  const sgst = Math.round(subtotal * 0.09);
  const cgst = Math.round(subtotal * 0.09);
  const totalTax = sgst + cgst;

  const promoDiscount = useMemo(() => {
    if (promoCode === "WELCOME10" && subtotal > 0) {
      return Math.round((subtotal + totalTax) * 0.1);
    }
    return 0;
  }, [promoCode, subtotal, totalTax]);

  const total = subtotal + totalTax + deliveryFee - promoDiscount;

  const validForm =
    contact.email.trim().includes("@") &&
    contact.phone.trim().length >= 8 &&
    addr.name.trim().length >= 2 &&
    addr.line1.trim().length >= 3 &&
    addr.city.trim().length >= 2 &&
    addr.state.trim().length >= 2 &&
    addr.pincode.trim().length >= 4;

  const formatINR = (v: number) => `₹${v.toLocaleString()}`;

  /* ---------- Place order ---------- */
  const placeOrder = async () => {
    if (!userId) {
      setMsg("Please sign in to place the order.");
      return;
    }
    if (items.length === 0) {
      setMsg("Your cart is empty.");
      return;
    }
    if (!validForm) {
      setMsg("Please fill contact & shipping details.");
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      const snapshot = {
        orderId: `BM-${Date.now().toString(36).toUpperCase()}`,
        when: new Date().toISOString(),
        items: items.map((r) => ({
          id: r.id,
          name: r.name,
          price: Number(r.price),
          quantity: r.quantity,
          image_url: r.image_url,
        })),
        summary: {
          subtotal,
          sgst,
          cgst,
          totalTax,
          deliveryFee,
          promoCode,
          promoDiscount,
          total,
        },
        contact,
        address: addr,
        delivery,
        payMode,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("last_order", JSON.stringify(snapshot));
      }

      const { error } = await supabase.from("cart").delete().eq("user_id", userId);
      if (error) throw new Error("Could not clear cart. Please try again.");

      // 🔑 Clear promo after successful order
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROMO_LOCAL_KEY);
      }

      router.push("/checkout/processing");
    } catch (err) {
      console.error("placeOrder error:", err);
      setMsg(err instanceof Error ? err.message : "Could not place order. Try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- UI ---------- */
  if (loading) return <SpinnerLoader text="Loading checkout…" />;
  if (busy) return <SpinnerLoader text="Placing your order…" />;

  return (
    <div className="min-h-screen bg-white">
      {/* Secure Checkout Header */}
      <div className="border-b bg-gradient-to-r from-white to-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <p className="text-xs text-gray-600 font-medium">256-bit SSL Encrypted</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <ShoppingBag className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Secure Payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {!userId ? (
          <p className="mt-6 text-rose-600">{msg || "Please sign in to continue."}</p>
        ) : items.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Forms */}
            <section className="space-y-6 lg:col-span-2">
              {/* Payment */}
              <Card>
                <SectionTitle
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Payment method"
                  subtitle="Select your preferred payment option"
                />
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PayTile
                    checked={payMode === "card"}
                    onClick={() => setPayMode("card")}
                    title="Debit/Credit Card"
                    subtitle="Visa, Mastercard, RuPay"
                    icons={<CardIcons />}
                  />
                  <PayTile
                    checked={payMode === "upi"}
                    onClick={() => setPayMode("upi")}
                    title="UPI"
                    subtitle="Google Pay, PhonePe, Paytm"
                    icons={<UpiBadge />}
                  />
                  <PayTile
                    checked={payMode === "netbanking"}
                    onClick={() => setPayMode("netbanking")}
                    title="Net Banking"
                    subtitle="All major banks"
                    icons={<Landmark className="h-5 w-5 text-blue-600" />}
                  />
                  <PayTile
                    checked={payMode === "wallet"}
                    onClick={() => setPayMode("wallet")}
                    title="Wallets"
                    subtitle="Paytm, PhonePe & more"
                    icons={<Wallet className="h-5 w-5 text-purple-600" />}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-700 font-medium">
                    Demo checkout - No real payment will be processed
                  </p>
                </div>
              </Card>

              {/* Contact */}
              <Card>
                <SectionTitle
                  icon={<Mail className="h-5 w-5" />}
                  title="Contact information"
                  subtitle="We'll send order updates here"
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Email address"
                    placeholder="you@example.com"
                    value={contact.email}
                    onChange={(v) => setContact({ ...contact, email: v })}
                    icon={<Mail className="h-4 w-4 text-gray-400" />}
                  />
                  <Input
                    label="Phone number"
                    placeholder="+91 9xxxxxxxxx"
                    value={contact.phone}
                    onChange={(v) => setContact({ ...contact, phone: v })}
                    icon={<Phone className="h-4 w-4 text-gray-400" />}
                  />
                </div>
              </Card>

              {/* Address */}
              <Card>
                <SectionTitle
                  icon={<Home className="h-5 w-5" />}
                  title="Delivery address"
                  subtitle="Where should we deliver your order?"
                />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    placeholder="John Doe"
                    value={addr.name}
                    onChange={(v) => setAddr({ ...addr, name: v })}
                    icon={<User className="h-4 w-4 text-gray-400" />}
                  />
                  <Input
                    label="Phone number"
                    placeholder="+91 9xxxxxxxxx"
                    value={contact.phone}
                    onChange={(v) => setContact({ ...contact, phone: v })}
                    icon={<Phone className="h-4 w-4 text-gray-400" />}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Address line 1"
                      placeholder="House no., Building name"
                      value={addr.line1}
                      onChange={(v) => setAddr({ ...addr, line1: v })}
                      icon={<Home className="h-4 w-4 text-gray-400" />}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Address line 2 (optional)"
                      placeholder="Street, Area, Landmark"
                      value={addr.line2}
                      onChange={(v) => setAddr({ ...addr, line2: v })}
                      icon={<MapPin className="h-4 w-4 text-gray-400" />}
                    />
                  </div>
                  <Input
                    label="City"
                    placeholder="Mumbai"
                    value={addr.city}
                    onChange={(v) => setAddr({ ...addr, city: v })}
                  />
                  <Input
                    label="State"
                    placeholder="Maharashtra"
                    value={addr.state}
                    onChange={(v) => setAddr({ ...addr, state: v })}
                  />
                  <Input
                    label="Pincode"
                    placeholder="400001"
                    value={addr.pincode}
                    onChange={(v) => setAddr({ ...addr, pincode: v })}
                  />
                </div>
              </Card>

              {/* Delivery */}
              <Card>
                <SectionTitle
                  icon={<Package className="h-5 w-5" />}
                  title="Delivery options"
                  subtitle="Choose your delivery speed"
                />
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <RadioTile
                    checked={delivery === "standard"}
                    onClick={() => setDelivery("standard")}
                    title="Standard Delivery"
                    subtitle="3–5 business days"
                    price="FREE"
                  />
                  <RadioTile
                    checked={delivery === "express"}
                    onClick={() => setDelivery("express")}
                    title="Express Delivery"
                    subtitle="1–2 business days"
                    price="₹99"
                  />
                </div>
              </Card>
            </section>

            {/* Right: Summary */}
            <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sticky top-4">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                </div>
              </div>

              <div className="mt-5 space-y-4 max-h-full overflow-y-auto">
                {items.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
                      <Image
                        src={r.image_url || "/images/placeholder.png"}
                        alt={r.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900 line-clamp-2">{r.name}</p>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                          {formatINR(Number(r.price) * r.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Qty: {r.quantity}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{formatINR(Number(r.price))} each</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t space-y-2.5">
                <Row label="Subtotal" value={subtotal} />
                <Row label="SGST (9%)" value={sgst} />
                <Row label="CGST (9%)" value={cgst} />
                <Row
                  label={`Delivery (${delivery === "standard" ? "Standard" : "Express"})`}
                  value={deliveryFee}
                />
                {promoDiscount > 0 && promoCode && (
                  <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Promo ({promoCode})</span>
                    <span className="text-sm font-bold text-green-700">
                      - ₹{Math.abs(promoDiscount).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <Row label="Total Amount" value={total} bold />
              </div>

              <button
                onClick={placeOrder}
                disabled={busy || !validForm}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-red-400 px-4 py-3.5 font-bold text-white shadow-lg hover:shadow-xl hover:from-green-700/80 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
                {busy ? 'Processing...' : 'Place Order'}
              </button>

              {!validForm && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <Shield className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-rose-700 font-medium">
                    Please complete all required fields to proceed with checkout
                  </p>
                </div>
              )}
              {msg && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <Shield className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-rose-700 font-medium">{msg}</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">{children}</div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 text-rose-600">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {subtitle && (
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-rose-500">
        {icon}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md outline-none"
        />
      </div>
    </label>
  );
}

function RadioTile({
  checked,
  onClick,
  title,
  subtitle,
  price,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${checked ? "border-rose-500 ring-2 ring-rose-200" : "border-gray-200"
        }`}
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="font-medium">{price}</p>
      </div>
    </button>
  );
}

function PayTile({
  checked,
  onClick,
  title,
  subtitle,
  icons,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icons: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${checked ? "border-rose-500 ring-2 ring-rose-200" : "border-gray-200"
        }`}
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">{icons}</div>
    </button>
  );
}

function CardIcons() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md border bg-white px-2 py-1 text-[10px] font-bold text-blue-700">
        VISA
      </span>
      <span className="rounded-md border bg-white px-2 py-1 text-[10px] font-bold text-black">
        Mastercard
      </span>
      <span className="rounded-md border bg-white px-2 py-1 text-[10px] font-bold text-indigo-700">
        RuPay
      </span>
    </div>
  );
}

function UpiBadge() {
  return (
    <span className="rounded-md border bg-white px-2 py-1 text-[10px] font-bold text-green-700">
      UPI
    </span>
  );
}

function Row({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-bold text-gray-900" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-gray-900 text-lg" : "text-gray-900 font-semibold"}`}>
        {positive
          ? `₹${value.toLocaleString()}`
          : `- ₹${Math.abs(value).toLocaleString()}`}
      </span>
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-10 rounded-2xl border bg-white p-10 text-center shadow-sm">
      <h3 className="text-xl font-semibold">Your cart is empty</h3>
      <p className="mt-1 text-gray-500">Add items and try again.</p>
    </div>
  );
}
