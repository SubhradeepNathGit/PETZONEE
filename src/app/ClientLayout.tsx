"use client";

import { ReactNode, useEffect, useRef, useState, Suspense } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Loader from "@/components/loader";
import { usePathname, useSearchParams } from "next/navigation";

interface ClientLayoutProps {
  children: ReactNode;
}


function ClientLayoutContent({ children }: ClientLayoutProps) {
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const lastPathname = useRef<string | null>(null);

  const skipLoaderRoutes = ["/cart", "/checkout", "/checkout/success"];
  const skipLoader = skipLoaderRoutes.includes(pathname);

  const hideLayout = pathname.startsWith("/checkout") || pathname === "/feed" || pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/signup");

  useEffect(() => {
    if (skipLoader) {
      setLoading(false);
      setShowContent(true);
      return;
    }

    if (pathname === "/404" || pathname === "/not-found") {
      setLoading(false);
      setShowContent(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    const video = document.querySelector<HTMLVideoElement>("video.banner-video");

    if (video) {
      video.preload = "auto";

      const handleVideoReady = () => {
        clearTimeout(timeout);
        setLoading(false);
        setShowContent(true);
      };

      video.addEventListener("canplaythrough", handleVideoReady, { once: true });

      timeout = setTimeout(() => {
        setLoading(false);
        setShowContent(true);
      }, 3000);

      return () => {
        video.removeEventListener("canplaythrough", handleVideoReady);
        clearTimeout(timeout);
      };
    } else {
      timeout = setTimeout(() => {
        setLoading(false);
        setShowContent(true);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [pathname, skipLoader]);


  useEffect(() => {
    requestAnimationFrame(() => {
      if (lastPathname.current !== pathname) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        lastPathname.current = pathname;
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }, [pathname, searchParams]);

  return (
    <div className="relative min-h-screen overflow-hidden">

      {!skipLoader && (
        <div
          className={`absolute inset-0 z-50 transition-opacity duration-1000 ${loading ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
          <Loader isLoading={loading} />
        </div>
      )}


      <div
        className={`transition-opacity duration-1000 ${showContent || skipLoader ? "opacity-100" : "opacity-0"
          }`}
      >
        {!hideLayout && <Navbar />}
        <main>{children}</main>
        {!hideLayout && <Footer />}
      </div>
    </div>
  );
}


export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <Suspense fallback={<Loader isLoading={true} />}>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </Suspense>
  );
}
