import { getProductById } from "@/lib/utils";
import ProductDetailsClient from "@/components/products/ProductDetailsClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const { product, details } = await getProductById(id);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-red-100 text-center max-w-lg w-full border border-red-50">
          <div className="text-8xl mb-6">🔍</div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-500 mb-8 font-medium">Sorry, we couldn't find the product you're looking for. It might have been removed or the link is incorrect.</p>
          <a href="/products" className="inline-block px-10 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200">
            Browse All Products
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <ProductDetailsClient product={product} details={details} />
    </div>
  );
}
