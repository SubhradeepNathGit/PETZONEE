"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
  {
    id: 1,
    img: "/images/testimonial1.jpg",
    title: "Elegant Pets Creating Joyful Bonds With Humans",
    desc: "Mauris pharetra vestibulum fusce dictum risus blandit quis. Ante condimentum neque at luctus nibh finibus facilisis erat.",
    rating: 4,
    video: "https://www.youtube.com/watch?v=sR_VRV0KU1g",
  },
  {
    id: 2,
    img: "/images/testimonial2.jpg",
    title: "Crafting Cheerful Moments For Your Perfect Pet",
    desc: "Tempus leo eu aenean sed diam urna tempor. Bibendum egestas iaculis massa nisl malesuada lacinia integer class aptent.",
    rating: 5,
    video: "https://www.youtube.com/watch?v=AXoi0Pj9PbQ",
  },
  {
    id: 3,
    img: "/images/testimonial3.jpg",
    title: "Bringing Your Pet's Dream Life To Reality",
    desc: "Maximus eget fermentum odio phasellus non purus est. Dictum risus blandit quis suspendisse aliquet nisi sodales luctus.",
    rating: 4,
    video: "https://www.youtube.com/watch?v=85N0TGTPqxA",
  },
  {
    id: 4,
    img: "/images/testimonial4.jpg",
    title: "Classy Companions For Hoomans Joy Of Pet",
    desc: "Fringilla lacus nec metus bibendum egestas iaculis massa. Ut hendrerit semper vel class aptent taciti sociosqu.",
    rating: 4,
    video: "https://www.youtube.com/watch?v=QLbZe4_IyMM",
  },
  {
    id: 5,
    img: "/images/testimonial5.jpg",
    title: "Trusted Care For Your Beloved Pets",
    desc: "Curabitur non nulla sit amet nisl tempus convallis quis ac lectus. Quisque velit nisi, pretium ut lacinia in, elementum id enim.",
    rating: 5,
    video: "https://www.youtube.com/watch?v=gwwSobLh3Rg",
  },
];

export default function TestimonialSection() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lock body scroll when modal open
  useEffect(() => {
    if (activeVideo) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [activeVideo]);

  const handleOpenVideo = (videoUrl: string) => {
    // convert YouTube watch URL to embed URL
    const embedUrl = videoUrl.replace("watch?v=", "embed/");
    setActiveVideo(embedUrl);
    setLoading(true);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Heading Right */}
        <div className="flex justify-end mb-12">
          <div className="text-right">
            <p className="text-orange-500 font-bold uppercase tracking-wide">
              /What Our Clients Say
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-snug text-gray-900">
              Know Directly From Those Who <br /> Trust And Choose Us
            </h2>
          </div>
        </div>

        {/* Swiper Carousel */}
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={24}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            reverseDirection: false,
            pauseOnMouseEnter: false,
          }}
          loop={true}
          speed={800}
          breakpoints={{
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
        >
          {testimonials.map((t) => (
            <SwiperSlide key={t.id}>
              {/* Card */}
              <div className="group relative overflow-hidden rounded-2xl shadow-lg transition-shadow duration-500 hover:shadow-2xl">
                {/* Image with reverse zoom */}
                <img
                  src={t.img}
                  alt={t.title}
                  className="h-96 w-full object-cover transform scale-110 transition-transform duration-500 ease-out group-hover:scale-100 will-change-transform"
                />

                {/* Gradient Overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Play Button */}
                <button
                  onClick={() => handleOpenVideo(t.video)}
                  className="absolute top-4 left-4 rounded-full bg-white/20 backdrop-blur-md p-3 text-orange-500 shadow-lg ring-1 ring-orange-400 transition-all hover:bg-orange-500 hover:text-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  aria-label="Play testimonial video"
                >
                  <Play className="h-6 w-6" />
                </button>

                {/* Text Content */}
                <div className="absolute bottom-0 p-6 text-white">
                  <h3 className="mb-2 text-lg font-semibold">{t.title}</h3>
                  <p className="mb-3 text-sm opacity-90">{t.desc}</p>
                  <div
                    className="flex text-orange-400"
                    aria-label={`Rating: ${t.rating} out of 5`}
                  >
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-4xl p-4"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute -right-8 -top-8 rounded-full bg-orange-500 p-3 text-white shadow-md transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label="Close video"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Player */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {/* Thumbnail & Spinner */}
                {loading && (
                  <>
                    <img
                      src={`https://img.youtube.com/vi/${
                        (activeVideo.split("embed/")[1] || "").split("?")[0]
                      }/hqdefault.jpg`}
                      alt="Video thumbnail"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    </div>
                  </>
                )}

                <iframe
                  src={`${activeVideo}?autoplay=1&mute=1&playsinline=1`}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  onLoad={() => setLoading(false)}
                  title="Testimonial video"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination styling */}
      <style jsx global>{`
        .swiper-pagination-bullet {
          background: #f97316;
          opacity: 0.5;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          transform: scale(1.2);
        }
      `}</style>
    </section>
  );
}
