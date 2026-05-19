// app/checkout/page.tsx
"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import SpinnerLoader from "@/components/SpinnerLoader";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<SpinnerLoader text="Preparing checkout..." />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cart");
  }, [router]);

  return <SpinnerLoader text="Redirecting to cart..." />;
}
