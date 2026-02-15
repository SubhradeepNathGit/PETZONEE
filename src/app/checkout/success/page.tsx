"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2, Home, Printer, Gift, ArrowLeft } from "lucide-react";

// Types
type OrderItem = {
  id: string; name: string; price: number; quantity: number; image_url: string | null; product_id?: string;
};
type LastOrder = {
  orderId: string; when: string; items: OrderItem[];
  summary: { subtotal: number; sgst: number; cgst: number; totalTax: number; deliveryFee: number; total: number, promoCode?: string; promoDiscount?: number; }
  contact: { email: string; phone: string };
  address: { name: string; line1: string; line2?: string; city: string; state: string; pincode: string };
  delivery: "standard" | "express"; payMode: "card" | "upi" | "netbanking" | "wallet";
};

// Utility Functions
const prettyPayMode = (mode: LastOrder["payMode"] | undefined) => {
  const modes = { card: "Credit/Debit Card", upi: "UPI Payment", netbanking: "Net Banking", wallet: "Digital Wallet" };
  return modes[mode || "card"] || "—";
};

const formatDate = (date: string) => new Date(date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateTime = (date: string) => new Date(date).toLocaleString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const SuccessHeader = ({ order }: { order: LastOrder | null }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center print:shadow-none print:border-none print:p-0 print:text-left print:mb-8"
  >
    <div className="relative inline-block mb-4 print:hidden">
      <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
    </div>

    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 print:text-4xl print:text-orange-500 print:mb-1">Payment Successful!</h1>
    <p className="text-gray-500 mb-6 font-medium print:hidden">Order placed successfully</p>
    <p className="hidden print:block text-gray-500 mb-4">Thank you for shopping with PETZONEE</p>

    <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 print:bg-transparent print:border-0 print:p-0 print:block">
      <span className="text-sm text-gray-500">Transaction ID:</span>
      <span className="text-sm font-mono font-bold text-gray-900 ml-2">{order?.orderId}</span>
    </div>

    <div className="mt-6 flex items-center justify-center gap-4 text-sm font-medium text-gray-500 print:hidden">
      <span className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        Payment Verified
      </span>
      <span className="hidden md:inline text-gray-300">|</span>
      <span className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        Order Confirmed
      </span>
    </div>
  </motion.div>
);

const OrderCard = ({ order, itemCount }: { order: LastOrder | null; itemCount: number }) => {
  if (!order) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full print:shadow-none print:border print:border-gray-300 print:rounded-none"
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between print:bg-gray-50 print:border-gray-300">
        <h2 className="font-bold text-gray-900 text-lg">Order Details</h2>
        <span className="text-sm font-medium text-gray-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4 items-start">
              <div className="relative h-16 w-16 flex-shrink-0 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden print:border-gray-300">
                <Image
                  src={item.image_url || "/images/placeholder.png"}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate print:whitespace-normal">{item.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity} × ₹{Number(item.price).toLocaleString()}</p>
              </div>
              <p className="font-bold text-gray-900">₹{(Number(item.price) * item.quantity).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-dashed border-gray-200 space-y-3 print:border-gray-300">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-gray-900">₹{order.summary.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery</span>
            <span className="font-semibold text-gray-900 text-green-600">
              {order.summary.deliveryFee === 0 ? 'FREE' : `₹${order.summary.deliveryFee}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>
            <span className="font-semibold text-gray-900">₹{order.summary.totalTax.toLocaleString()}</span>
          </div>

          {order.summary.promoDiscount && order.summary.promoDiscount > 0 ? (
            <div className="flex justify-between text-sm text-orange-600 bg-orange-50 p-2 rounded-lg print:bg-transparent print:p-0">
              <span className="font-medium flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 print:hidden" />Discount ({order.summary.promoCode})</span>
              <span className="font-bold">- ₹{order.summary.promoDiscount.toLocaleString()}</span>
            </div>
          ) : null}

          <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center print:border-gray-300">
            <span className="font-bold text-gray-900 text-lg">Total Paid</span>
            <span className="font-bold text-2xl text-gray-900">₹{order.summary.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm print:bg-gray-100 print:border-gray-300">
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs">Paid via</span>
          <span className="font-bold text-gray-900">{prettyPayMode(order.payMode)}</span>
        </div>
        <div className="h-8 w-[1px] bg-gray-200 print:bg-gray-400"></div>
        <div className="flex flex-col text-right">
          <span className="text-gray-500 text-xs">Paid on</span>
          <span className="font-bold text-gray-900">{formatDate(order.when)}</span>
        </div>
      </div>
    </motion.div>
  );
};

const AddressCard = ({ order }: { order: LastOrder | null }) => {
  if (!order) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-full print:shadow-none print:border print:border-gray-300 print:rounded-none"
    >
      <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4 print:border-gray-300">
        Delivery Detail
      </h2>

      <div className="space-y-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Shipping To</p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 print:bg-transparent print:border-0 print:p-0">
            <p className="font-bold text-gray-900 text-lg mb-1">{order.address.name}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {order.address.line1}<br />
              {order.address.line2 && <>{order.address.line2}<br /></>}
              {order.address.city}, {order.address.state} - {order.address.pincode}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Contact Info</p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 print:bg-transparent print:border-0 print:p-0">
            <div className="grid grid-cols-1 gap-1">
              <p className="text-sm flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-gray-500 w-16 flex-shrink-0">Email:</span>
                <span className="text-gray-900 font-medium break-all">{order.contact.email}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500 w-16 inline-block">Phone:</span>
                <span className="text-gray-900 font-medium">{order.contact.phone}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PrintInvoice = ({ order }: { order: LastOrder | null }) => {
  if (!order) return null;

  return (
    <div className="hidden print:block font-serif text-black p-8 max-w-[210mm] mx-auto bg-white h-full">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">INVOICE</h1>
          <p className="text-sm text-gray-600 mt-1 uppercase tracking-widest">Original Receipt</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-orange-600">PETZONEE</h2>
          <p className="text-sm text-gray-600 mt-1">Premium Pet Care & Accessories</p>
          <p className="text-xs text-gray-500 mt-1">GST: 07AABCP0123A1Z5</p>
        </div>
      </div>

      {/* Meta & Addresses */}
      <div className="flex justify-between items-start mb-10">
        <div className="w-1/3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
          <p className="font-bold text-gray-900 text-lg">{order.address.name}</p>
          <div className="text-sm text-gray-600 mt-1 leading-relaxed">
            <p>{order.address.line1}</p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
            <div className="mt-2 text-xs space-y-0.5">
              <p>Ph: {order.contact.phone}</p>
              <p className="break-all text-[10px] text-gray-500">{order.contact.email}</p>
            </div>
          </div>
        </div>

        <div className="w-1/3 text-right">
          <div className="space-y-1">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-sm text-gray-500">Invoice No:</span>
              <span className="text-sm font-bold text-gray-900">{order.orderId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-bold text-gray-900">{formatDate(order.when)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-sm text-gray-500">Method:</span>
              <span className="text-sm font-bold text-gray-900">{prettyPayMode(order.payMode)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 font-bold text-gray-900 uppercase tracking-wider w-1/2">Item Description</th>
              <th className="text-center py-2 font-bold text-gray-900 uppercase tracking-wider">Qty</th>
              <th className="text-right py-2 font-bold text-gray-900 uppercase tracking-wider">Price</th>
              <th className="text-right py-2 font-bold text-gray-900 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-gray-800 font-medium">{item.name}</td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">₹{Number(item.price).toLocaleString()}</td>
                <td className="py-3 text-right font-bold text-gray-900">₹{(Number(item.price) * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2 space-y-2">
          <div className="flex justify-between text-sm py-1 border-b border-gray-100">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">₹{order.summary.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-gray-100">
            <span className="text-gray-600">Tax (18%)</span>
            <span className="font-medium text-gray-900">₹{order.summary.totalTax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-gray-100">
            <span className="text-gray-600">Delivery</span>
            <span className="font-medium text-gray-900">{order.summary.deliveryFee === 0 ? 'Free' : `₹${order.summary.deliveryFee}`}</span>
          </div>
          {order.summary.promoDiscount && order.summary.promoDiscount > 0 && (
            <div className="flex justify-between text-sm py-1 border-b border-gray-100 text-orange-600">
              <span>Discount ({order.summary.promoCode})</span>
              <span>- ₹{order.summary.promoDiscount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t-2 border-gray-800 pt-3 mt-2">
            <span className="text-gray-900">Total Paid</span>
            <span className="text-gray-900">₹{order.summary.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
        <p className="font-bold text-gray-900 mb-1">Thank you for your business!</p>
        <p>For any queries, contact support@petzonee.com or call +91 98765 43210</p>
        <p className="mt-4 italic">This is a computer generated invoice and does not require a physical signature.</p>
        <div className="mt-4 text-[10px] text-gray-400">
          Page 1 of 1 • Printed on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function SuccessPage() {
  const router = useRouter();
  const [order, setOrder] = useState<LastOrder | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("last_order");
    if (raw) {
      try { setOrder(JSON.parse(raw)); } catch { }
    }
  }, []);

  const itemCount = useMemo(() => order?.items?.reduce((s, it) => s + it.quantity, 0) ?? 0, [order]);
  const isPlanOrder = useMemo(() => order?.items?.some(it => it.product_id === "PLAN"), [order]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative min-h-screen bg-gray-50 pb-20 print:bg-white print:pb-0 print:h-auto print:min-h-0 print:overflow-visible">

      {/* Start: Web UI (Hidden on Print) */}
      <div className="print:hidden">
        {/* Background decoration - PhonePe Success Green (45% height) */}
        <div className="absolute top-0 left-0 right-0 h-[45vh] bg-[#1aba7a]" />

        <main className="relative mx-auto max-w-5xl px-4 pt-12 z-10">
          <SuccessHeader order={order} />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <OrderCard order={order} itemCount={itemCount} />
            </div>
            <div className="md:col-span-1 flex flex-col gap-6">
              {!isPlanOrder && <AddressCard order={order} />}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-3"
              >
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                >
                  <Printer className="h-5 w-5" /> Print Invoice
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-orange-500 text-orange-600 font-bold hover:bg-orange-50 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" /> Continue Shopping
                </button>
              </motion.div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium">Need help with this order?</p>
                <button className="text-xs text-orange-600 font-bold hover:underline mt-1">Contact Support</button>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* End: Web UI */}

      {/* Start: Print UI (Visible only on Print) */}
      <PrintInvoice order={order} />
      {/* End: Print UI */}

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}