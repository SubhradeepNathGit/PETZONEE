'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
// @ts-expect-error: swiper CSS import may not have type declarations in this project setup
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
    <footer className="relative bg-[#07070a] border-t border-white/[0.04] overflow-hidden">
      {/* Background radial ambient glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF8A65]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Newsletter */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-16">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#FF8A65] via-[#FF7043] to-[#E64A19] px-6 py-12 sm:px-10 md:py-16 text-center text-white shadow-[0_20px_50px_rgba(255,112,67,0.25)] overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="mx-auto max-w-[820px] font-extrabold leading-tight text-3xl sm:text-4xl md:text-5xl tracking-tight uppercase">
              Subscribe to our Newsletter
            </h2>
            <p className="mt-3 text-white/80 font-medium max-w-[500px] mx-auto text-sm sm:text-base">
              Get the latest updates, medical tips, and exclusive offers for your pets!
            </p>

            {/* form */}
            <form
              className="mx-auto mt-8 flex w-full max-w-[650px] items-center rounded-full border border-white/20 bg-black/20 pl-5 pr-2 py-1.5 backdrop-blur-xl focus-within:ring-2 focus-within:ring-white/40 focus-within:border-transparent transition-all"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Newsletter signup"
            >
              <input
                type="email"
                required
                placeholder="Enter your email address"
                className="peer w-full rounded-full bg-transparent py-2.5 text-[15px] text-white placeholder-white/50 outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-white text-[#FF5722] hover:bg-[#FFF3E0] px-8 py-2.5 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 cursor-pointer"
              >
                Submit
              </button>
            </form>

            <p className="mt-4 text-xs text-white/60">
              Some exclusions apply. See{' '}
              <Link href="#" className="underline font-semibold hover:text-white transition-colors">
                Terms &amp; Conditions
              </Link>{' '}
              for details*
            </p>
          </div>
        </div>
      </div>

      {/* Auto-swiper */}
      <div className="mx-auto w-full max-w-[1200px] px-4">
        <div className="py-12 border-b border-white/[0.04]">
          <Swiper
            modules={[Autoplay]}
            loop
            autoplay={{ delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            speed={1000}
            spaceBetween={20}
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
                <div className="relative w-full h-36 sm:h-40 md:h-44 lg:h-48 xl:h-52 rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] p-1 group">
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <Image
                      src={src}
                      alt={`petzonee-${i}`}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      priority={i < 4}
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Footer main */}
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-start relative z-10">
          
          {/* Contact */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#FF8A65] rounded-full" />
              Contact Info
            </h3>
            <ul className="space-y-4 text-[14px] text-white/50 font-medium">
              <li className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-[#FF8A65]/30 group-hover:bg-[#FF8A65]/5 transition-all">
                  <Phone size={16} className="text-[#FF8A65] group-hover:scale-110 transition-transform" />
                </div>
                <a href="tel:+918905671234" className="hover:text-[#FF8A65] transition-colors">
                  +91 89756 71234
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-[#FF8A65]/30 group-hover:bg-[#FF8A65]/5 transition-all">
                  <MapPin size={16} className="text-[#FF8A65] group-hover:scale-110 transition-transform" />
                </div>
                <span className="group-hover:text-white transition-colors">
                  Salt Lake Sector V, Kolkata, India
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-[#FF8A65]/30 group-hover:bg-[#FF8A65]/5 transition-all">
                  <Mail size={16} className="text-[#FF8A65] group-hover:scale-110 transition-transform" />
                </div>
                <a href="mailto:support@petzonee.com" className="hover:text-[#FF8A65] transition-colors">
                  support@petzonee.com
                </a>
              </li>
            </ul>
            <div className="pt-2 flex items-center gap-4">
              {[
                { 
                  icon: <Instagram size={18} />, 
                  href: "https://www.instagram.com", 
                  color: "hover:bg-gradient-to-tr hover:from-yellow-500 hover:to-purple-600 hover:text-white" 
                },
                { 
                  icon: <Facebook size={18} />, 
                  href: "https://www.facebook.com", 
                  color: "hover:bg-[#1877F2] hover:text-white" 
                },
                { 
                  icon: (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ), 
                  href: "https://x.com", 
                  color: "hover:bg-white hover:text-black" 
                },
                { 
                  icon: (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-4.846c1.666.988 3.396 1.502 5.355 1.503 5.439 0 9.865-4.423 9.868-9.86.002-2.635-1.025-5.11-2.89-6.973C17.062 2.012 14.59 1.01 11.96 1.01c-5.448 0-9.88 4.425-9.883 9.864 0 1.836.486 3.633 1.408 5.22L2.52 21.43l5.227-1.37zM17.18 14.28c-.284-.144-1.684-.83-1.947-.927-.263-.096-.454-.144-.645.144-.191.288-.74.927-.907 1.117-.167.19-.334.215-.618.072-.284-.144-1.202-.442-2.29-1.42-.847-.756-1.42-1.69-1.586-1.978-.166-.287-.018-.443.124-.585.128-.127.284-.33.426-.496.143-.165.19-.284.285-.473.095-.19.047-.354-.024-.497-.07-.144-.645-1.553-.883-2.128-.23-.557-.464-.48-.64-.488-.167-.008-.358-.01-.55-.01-.19 0-.501.07-.763.355-.262.288-1.003.98-1.003 2.39 0 1.41 1.027 2.77 1.17 2.96.143.19 2.02 3.084 4.895 4.328.684.296 1.218.473 1.634.605.688.22 1.314.189 1.81.115.552-.083 1.684-.688 1.922-1.352.238-.665.238-1.236.167-1.352-.07-.117-.262-.19-.547-.333z" />
                    </svg>
                  ), 
                  href: "https://www.whatsapp.com", 
                  color: "hover:bg-[#25D366] hover:text-white" 
                },
              ].map((social, i) => (
                <Link
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white/40 flex items-center justify-center transition-all ${social.color}`}
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Center brand */}
          <div className="text-center md:text-left space-y-5">
            <div>
              <div className="text-3xl font-black text-white tracking-tight uppercase">
                PET<span className="text-[#FF8A65]">ZONE</span>E
              </div>
              <p className="mt-3 max-w-[400px] text-sm text-white/50 leading-relaxed font-medium">
                Give your pets the love, care, and attention they deserve every single day 24/7 with our state-of-the-art medical and social base.
              </p>
            </div>

            {/* App buttons */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em]">Find us on</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Image
                  src="/icons/playstore.png"
                  alt="Google Play"
                  width={130}
                  height={40}
                  className="hover:scale-105 hover:brightness-110 transition-all cursor-pointer opacity-85 hover:opacity-100"
                />
                <Image
                  src="/icons/applestore.png"
                  alt="App Store"
                  width={130}
                  height={40}
                  className="hover:scale-105 hover:brightness-110 transition-all cursor-pointer opacity-85 hover:opacity-100"
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="relative space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#FF8A65] rounded-full" />
              Information
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] text-white/40 font-medium">
              {[
                { text: "Refund and Returns", href: "/contactUs" },
                { text: "Shipping Rates & Policies", href: "/contactUs" },
                { text: "Returns & Replacements", href: "/contactUs" },
                { text: "Your Orders", href: "/dashboard?view=orders" },
                { text: "Help Center", href: "/contactUs" },
                { text: "Cookie Settings", href: "/contactUs" },
                { text: "Terms and Conditions", href: "/contactUs" },
                { text: "Privacy Policy", href: "/contactUs" }
              ].map((link) => (
                <li key={link.text}>
                  <Link href={link.href} className="hover:text-[#FF8A65] transition-colors block py-0.5">
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Dog Image */}
            <div className="mt-8 flex justify-center md:mt-0 md:absolute md:-right-6 md:-bottom-6 pointer-events-none select-none opacity-20 md:opacity-40">
              <Image
                src="/icons/footer1.png"
                alt="Dog"
                width={200}
                height={200}
                className="object-contain scale-x-[-1] -rotate-12 hover:rotate-0 transition-transform duration-700"
              />
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-5 border-t border-white/[0.04] pt-8 text-xs text-white/30 font-medium md:flex-row">
          <div className="flex items-center gap-6">
            <Link href="/contactUs" className="hover:text-[#FF8A65] transition-colors">
              Privacy Notice
            </Link>
            <Link href="/contactUs" className="hover:text-[#FF8A65] transition-colors">
              Terms of Use
            </Link>
          </div>
          <p className="text-white/20">
            All rights Reserved © {new Date().getFullYear()}{" "}
            <Link
              href="https://github.com/SubhradeepNathGit"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white/35 hover:text-[#FF8A65] transition-colors"
            >
              Subhradeep Nath
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
