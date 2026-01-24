import { getProductById } from "@/lib/utils";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  params: { id: string };
}

export default async function ProductPage({ params }: Props) {
  const { product, details } = await getProductById(params.id);

  if (!product) {
    return (
      <div className="p-10 text-center text-red-500 text-xl">
        ❌ Product not found
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-10">
      {/* Left: Product Images */}
      <div>
        {/* Main Image */}
        <div className="w-full h-[400px] relative rounded-2xl overflow-hidden shadow">
          <Image
            src={product.img_1 || "/placeholder.png"}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Thumbnails */}
        <div className="flex gap-3 mt-4">
          {[product.img_1, product.img_2].map(
            (img, idx) =>
              img && (
                <div
                  key={idx}
                  className="w-20 h-20 relative border rounded-xl overflow-hidden"
                >
                  <Image src={img} alt="thumb" fill className="object-cover" />
                </div>
              )
          )}
        </div>
      </div>

      {/* Right: Product Details */}
      <div>
        {/* Title & Category */}
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-gray-600 mt-2">Category: {product.category}</p>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center mt-2 text-yellow-500">
            ⭐ {product.rating.toFixed(1)} / 5
          </div>
        )}

        {/* Price */}
        <div className="mt-3">
          {product.old_price && (
            <span className="line-through text-gray-500 mr-2">
              ₹{product.old_price}
            </span>
          )}
          <span className="text-2xl font-bold text-red-500">
            ₹{product.discount_price}
          </span>
        </div>

        {/* Sizes (from product_details) */}
        {details.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold mb-2">Weight / Size</h3>
            <div className="flex gap-3">
              {details.map((d) => (
                <button
                  key={d.id}
                  className={cn(
                    "px-4 py-2 border rounded-xl hover:bg-gray-100 transition"
                  )}
                >
                  {d.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center gap-3 mt-5">
          <button className="px-3 py-1 border rounded">-</button>
          <span>1</span>
          <button className="px-3 py-1 border rounded">+</button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button className="bg-gray-700 text-white px-6 py-3 rounded-2xl hover:bg-gray-800 transition">
            Add To Cart
          </button>
          <button className="bg-red-500 text-white px-6 py-3 rounded-2xl hover:bg-red-600 transition">
            Buy Now
          </button>
        </div>

        {/* Description */}
        {product.description && (
          <p className="mt-6 text-gray-700 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}
