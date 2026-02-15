"use client";

import { ReactNode, useEffect, useRef, useState, Suspense } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Loader from "@/components/loader";
import { usePathname, useSearchParams } from "next/navigation";

interface ClientLayoutProps {
  children: ReactNode;
}

// Separate component for Scroll Management ensuring it's inside Suspense
function ScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathname = useRef<string | null>(null);
  const [scrollUnlock, setScrollUnlock] = useState(false);

  // We need to know when the loader is done to unlock scroll.
  // However, the loader state is in the parent.
  // This is a bit tricky. The original code coupled scroll locking with loading state.
  // Let's look at the original logic.
  // The original logic had `loading` state in ClientLayoutContent.
  // And `scrollUnlock` state derived/managed there.
  // The `window.scrollTo` in original line 113 depended on `scrollUnlock`.

  // To keep meaningful separation without prop drilling hell or context:
  // We can just keep the scroll restoration logic here that depends on searchParams.
  // BUT `window.scrollTo` was conditioned on `scrollUnlock`.

  // Actually, the simplest way to solve the "useSearchParams causing de-opt" 
  // without breaking the layout is:
  // 1. Keep `ClientLayoutContent` mostly as is.
  // 2. Put `useSearchParams` usages inside a component wrapped in Suspense *inside* ClientLayoutContent.

  // Let's refine the plan inline to be safe.
  // The parts using `useSearchParams` are:
  // - The `useEffect` at line 113: `[pathname, searchParams, scrollUnlock]`
  // - The variable `searchParams` at line 19.

  // So let's extract THAT specific effect into `ScrollHandler`.
  return null;
}

// Component to handle scroll restoration on navigation
function ScrollHandler({ scrollUnlock }: { scrollUnlock: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!scrollUnlock) return;

    requestAnimationFrame(() => {
      if (lastPathname.current !== pathname) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        lastPathname.current = pathname;
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }, [pathname, searchParams, scrollUnlock]);

  return null;
}

function ClientLayoutContent({ children }: ClientLayoutProps) {
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [scrollUnlock, setScrollUnlock] = useState(false);

  const pathname = usePathname();
  // Removed top-level useSearchParams to avoid suspending the entire component

  const lastPathname = useRef<string | null>(null);

  const skipLoaderRoutes = ["/cart", "/checkout", "/checkout/success"];
  const skipLoader = skipLoaderRoutes.includes(pathname);

  const hideLayout = pathname.startsWith("/checkout") || pathname === "/feed" || pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/signup") || pathname === "/cart";

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

      if (video.readyState >= 4) { // HAVE_ENOUGH_DATA
        handleVideoReady();
      } else {
        // Use 'canplaythrough' for 0-lag experience on production
        video.addEventListener("canplaythrough", handleVideoReady, { once: true });

        timeout = setTimeout(() => {
          handleVideoReady();
        }, 8000); // 8s fallback for production networks
      }

      return () => {
        video.removeEventListener("canplay", handleVideoReady);
        clearTimeout(timeout);
      };
    } else {
      timeout = setTimeout(() => {
        setLoading(false);
        setShowContent(true);
      }, 3000);

      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll during loading
  useEffect(() => {
    if (loading) {
      setScrollUnlock(false);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      // Delay unlocking to match the fade animation duration (1000ms)
      const timeout = setTimeout(() => {
        setScrollUnlock(true);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  useEffect(() => {
    if (!scrollUnlock) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [scrollUnlock]);


  return (
    <div className={`relative min-h-screen ${!scrollUnlock ? "h-screen overflow-hidden" : "overflow-x-hidden"} ${pathname === "/cart" || pathname.startsWith("/checkout") ? "bg-white" : ""}`}>

      {/* Put ScrollHandler in Suspense to isolate useSearchParams dependency */}
      <Suspense fallback={null}>
        <ScrollHandler scrollUnlock={scrollUnlock} />
      </Suspense>

      {!skipLoader && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-600 ${loading ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
        >
          <Loader isLoading={loading} />
        </div>
      )}


      <div
        className={`transition-opacity duration-600 ${showContent || skipLoader ? "opacity-100" : "opacity-0"
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
    <ClientLayoutContent>{children}</ClientLayoutContent>
  );
}
