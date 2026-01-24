// app/checkout/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  Lock,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  Wallet,
  Landmark,
  IndianRupee,
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

      router.push("/checkout/success");
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
    <>
      {/* Top Banner */}
      <div className="relative mb-8 h-48 w-full sm:h-64 md:h-72 lg:h-80">
        <Image
          src="/images/statbg4.jpg"
          alt="Checkout Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center">
          <h1 className="text-3xl font-bold text-white md:text-5xl">Checkout</h1>
          <p className="mt-2 text-sm text-gray-200 md:text-base">
            Home / Shop / Cart / Checkout
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10">
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
                />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PayTile
                    checked={payMode === "card"}
                    onClick={() => setPayMode("card")}
                    title="Card"
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
                    title="Netbanking"
                    subtitle="All major banks"
                    icons={<Landmark className="h-5 w-5 text-rose-600" />}
                  />
                  <PayTile
                    checked={payMode === "wallet"}
                    onClick={() => setPayMode("wallet")}
                    title="Wallets"
                    subtitle="Popular wallets supported"
                    icons={<Wallet className="h-5 w-5 text-rose-600" />}
                  />
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                  <IndianRupee className="h-4 w-4" /> Demo checkout. No real
                  payment processed.
                </p>
              </Card>

              {/* Contact */}
              <Card>
                <SectionTitle
                  icon={<Mail className="h-5 w-5" />}
                  title="Contact details"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Email"
                    placeholder="you@example.com"
                    value={contact.email}
                    onChange={(v) => setContact({ ...contact, email: v })}
                  />
                  <Input
                    label="Phone"
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
                  icon={<MapPin className="h-5 w-5" />}
                  title="Shipping address"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    value={addr.name}
                    onChange={(v) => setAddr({ ...addr, name: v })}
                  />
                  <Input
                    label="Address line 1"
                    value={addr.line1}
                    onChange={(v) => setAddr({ ...addr, line1: v })}
                  />
                  <Input
                    label="Address line 2 (optional)"
                    value={addr.line2}
                    onChange={(v) => setAddr({ ...addr, line2: v })}
                  />
                  <Input
                    label="City"
                    value={addr.city}
                    onChange={(v) => setAddr({ ...addr, city: v })}
                  />
                  <Input
                    label="State"
                    value={addr.state}
                    onChange={(v) => setAddr({ ...addr, state: v })}
                  />
                  <Input
                    label="Pincode"
                    value={addr.pincode}
                    onChange={(v) => setAddr({ ...addr, pincode: v })}
                  />
                </div>
              </Card>

              {/* Delivery */}
              <Card>
                <SectionTitle
                  icon={<Truck className="h-5 w-5" />}
                  title="Delivery method"
                />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <RadioTile
                    checked={delivery === "standard"}
                    onClick={() => setDelivery("standard")}
                    title="Standard"
                    subtitle="3–5 business days"
                    price="Free"
                  />
                  <RadioTile
                    checked={delivery === "express"}
                    onClick={() => setDelivery("express")}
                    title="Express"
                    subtitle="1–2 business days"
                    price="₹99"
                  />
                </div>
              </Card>
            </section>

            {/* Right: Summary */}
            <aside className="h-fit rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Order Summary</h2>

              <div className="mt-4 space-y-3">
                {items.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={r.image_url || "/images/placeholder.png"}
                        alt={r.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium">{r.name}</p>
                        <span className="text-sm">
                          {formatINR(Number(r.price) * r.quantity)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Qty {r.quantity} · {formatINR(Number(r.price))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-4 h-px bg-gray-200" />

              <Row label="Subtotal" value={subtotal} />
              <Row label="SGST (9%)" value={sgst} />
              <Row label="CGST (9%)" value={cgst} />
              <Row
                label={`Delivery (${delivery === "standard" ? "Standard" : "Express"})`}
                value={deliveryFee}
              />
              {promoDiscount > 0 && promoCode && (
                <Row label={`Promo (${promoCode})`} value={-promoDiscount} />
              )}
              <div className="my-2 h-px bg-gray-200" />
              <Row label="Total" value={total} bold />

              <button
                onClick={placeOrder}
                disabled={busy || !validForm}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5E5E] px-4 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
                Place order
              </button>

              {!validForm && (
                <p className="mt-3 text-xs text-rose-600">
                  Fill contact & shipping details to enable the button.
                </p>
              )}
              {msg && <p className="mt-3 text-sm text-rose-700">{msg}</p>}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

/* ---------- Small UI helpers ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">{children}</div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
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
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${
        checked ? "border-rose-500 ring-2 ring-rose-200" : "border-gray-200"
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
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:bg-gray-50 ${
        checked ? "border-rose-500 ring-2 ring-rose-200" : "border-gray-200"
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
    <div className="mt-1 flex items-center justify-between">
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <span className={bold ? "font-semibold" : ""}>
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
