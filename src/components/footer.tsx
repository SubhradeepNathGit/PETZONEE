'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

export default function Footer() {
  const gallery = [
    '/images/footerimg1.jpg',
    '/images/footerimg2.jpg',
    '/images/footerimg3.jpg',
    '/images/footerimg4.jpg',
    '/images/footerimg5.jpg',
    '/images/footerimg6.jpg',
    '/images/footerimg7.jpg',
    '/images/footerimg10.jpg',
    '/images/footerimg9.jpg',
  ];

  return (
    <footer className="relative bg-[#fdf6f0] overflow-hidden">
      {/* Newsletter */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-14">
        <div className="relative rounded-3xl bg-[#FF8A65] px-6 py-10 sm:px-10 md:py-14 text-center text-white shadow-2xl shadow-[#FF6B40]/40">
          <h2 className="mx-auto max-w-[820px] font-bold leading-tight text-2xl sm:text-3xl md:text-4xl drop-shadow-lg">
            Subscribe to our Newsletter for the Latest Updates & Offers
          </h2>

          {/* form */}
          <form
            className="mx-auto mt-8 flex w-full max-w-[720px] items-center rounded-full border border-white/30 bg-white/10 pl-4 pr-2 shadow-lg backdrop-blur-md"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Newsletter signup"
          >
            <input
              type="email"
              required
              placeholder="Your email here"
              className="peer w-full rounded-full bg-transparent py-3 text-[15px] text-white placeholder-white/90 outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[#f5f5dc] text-orange-500 px-6 py-1 font-semibold shadow-md shadow-black/40 transition-all hover:scale-105 active:scale-95"
            >
              Submit
            </button>
          </form>

          <p className="mt-3 text-sm opacity-70">
            Some exclusions apply. See{' '}
            <Link href="#" className="underline">
              Terms &amp; Conditions
            </Link>{' '}
            for details*
          </p>
        </div>
      </div>

      {/* Auto-swiper */}
      <div className="mx-auto w-full max-w-[1200px] px-4">
        <div className="py-10">
          <Swiper
            modules={[Autoplay]}
            loop
            autoplay={{ delay: 2200, disableOnInteraction: false, pauseOnMouseEnter: true }}
            speed={900}
            spaceBetween={16}
            breakpoints={{
              0: { slidesPerView: 2 },
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
              1280: { slidesPerView: 5 }, 
            }}
            className="overflow-hidden px-2 sm:px-4"
          >
            {gallery.map((src, i) => (
              <SwiperSlide key={i} aria-label={`gallery item ${i + 1}`}>
                <div className="w-full h-36 sm:h-40 md:h-44 lg:h-48 xl:h-52 rounded-2xl overflow-hidden shadow-md shadow-black/20">
                  <Image
                    src={src}
                    alt={`poshik-${i}`}
                    width={500}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    priority={i < 4}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto mt-2 w-full max-w-[1200px] px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />
      </div>

      {/* Footer main */}
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-start relative z-10">
          {/* Contact */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-gray-900">Contact Info</h3>
            <ul className="space-y-3 text-[15px] text-gray-700">
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-[#FF6B40]" />
                <a href="tel:+918905671234" className="hover:underline">
                  +91-8975671234
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={18} className="text-[#FF6B40]" />
                Kolkata, India
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-[#FF6B40]" />
                <a href="mailto:poshik@example.com" className="hover:underline">
                  poshik@example.com
                </a>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-5">
              <Link href="#" aria-label="Instagram">
                <Instagram className="hover:scale-110 transition-transform text-[#FF6B40]" />
              </Link>
              <Link href="#" aria-label="Facebook">
                <Facebook className="hover:scale-110 transition-transform text-[#4267B2]" />
              </Link>
              <Link href="#" aria-label="Twitter">
                <Twitter className="hover:scale-110 transition-transform text-[#1DA1F2]" />
              </Link>
            </div>
          </div>

          {/* Center brand */}
          <div className="text-center md:text-left">
            <div className="text-3xl font-extrabold text-[#FF8A65]">POSHIK</div>
            <p className="mx-auto md:mx-0 mt-4 max-w-[480px] text-[15px] text-gray-600 leading-relaxed">
              Give your pets the love, care and attention they deserve every single day 24/7 with us.
            </p>

            {/* App buttons */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-gray-800">Find us on</p>
              <div className="flex flex-wrap items-center gap-4">
                <Image
                  src="/icons/playstore.png"
                  alt="Google Play"
                  width={140}
                  height={44}
                  className="drop-shadow-md hover:scale-105 transition-transform"
                />
                <Image
                  src="/icons/applestore.png"
                  alt="App Store"
                  width={140}
                  height={44}
                  className="drop-shadow-md hover:scale-105 transition-transform"
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="relative">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Find Out About Us</h3>
            <ul className="space-y-2 text-[15px] text-gray-700">
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Refund and Returns</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Shipping Rates &amp; Policies</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Returns &amp; Replacements</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Your Orders</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Cookie Settings</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Terms and Conditions</Link></li>
              <li><Link href="#" className="hover:text-[#FF6B40] transition-colors">Privacy Policy</Link></li>
            </ul>

            {/* Dog Image */}
            <div className="mt-6 flex justify-center md:mt-0 md:absolute md:-right-8 md:bottom-0">
              <Image
                src="/icons/footer1.png"
                alt="Dog"
                width={250}
                height={250}
                className="object-contain scale-x-[-1] -rotate-20" 
              />
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-black/10 pt-6 text-sm text-gray-600 md:flex-row">
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-[#FF6B40] transition-colors">
              Privacy Notice
            </Link>
            <Link href="#" className="hover:text-[#FF6B40] transition-colors">
              Terms of Use
            </Link>
          </div>
          <p className="text-gray-500">
            All rights Reserved © {new Date().getFullYear()}{" "}
            <Link
              href="https://github.com/SubhradeepNathGit"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-[#FF6B40] transition-colors"
            >
              Subhradeep Nath
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
