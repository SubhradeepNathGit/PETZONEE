import { getProductById } from "@/lib/utils";
import ProductDetailsClient from "@/components/products/ProductDetailsClient";
import { Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const { product, details } = await getProductById(id);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-[#0a0a0f] p-12 rounded-[40px] border border-white/5 text-center max-w-lg w-full">
          <div className="flex justify-center mb-6">
            <Search className="w-20 h-20 text-white/10" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tighter">Product Not Found</h1>
          <p className="text-white/40 mb-8 font-medium">Sorry, we couldn&apos;t find the product you&apos;re looking for. It might have been removed or the link is incorrect.</p>
          <Link href="/products" className="inline-block px-10 py-4 bg-[#FF8A70] text-white rounded-2xl font-bold hover:brightness-110 transition-all">
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <ProductDetailsClient product={product} details={details} />
    </div>
  );
}
