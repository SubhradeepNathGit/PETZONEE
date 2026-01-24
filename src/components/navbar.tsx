// components/common/Navbar.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PawPrint, ShoppingCart, User as UserIcon, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Navbar = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('Guest');
  const [cartCount, setCartCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch cart count
  const fetchCartCount = useCallback(async (uid: string) => {
    const { data } = await supabase.from('cart').select('quantity').eq('user_id', uid);
    if (data) setCartCount(data.reduce((sum, r) => sum + Number((r as { quantity: number }).quantity || 0), 0));
  }, []);

  // Initialize and handle auth changes
  useEffect(() => {
    let cleanup: (() => void)[] = [];

    const initUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from('users').select('first_name').eq('id', user.id).single();
        setFirstName(profile?.first_name || 'Friend');
        fetchCartCount(user.id);

        // Setup realtime and polling
        const channel = supabase.channel(`cart-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cart', filter: `user_id=eq.${user.id}` },
            () => fetchCartCount(user.id))
          .subscribe();

        const interval = setInterval(() => fetchCartCount(user.id), 5000);
        const onVis = () => document.visibilityState === 'visible' && fetchCartCount(user.id);
        document.addEventListener('visibilitychange', onVis);

        cleanup.push(
          () => supabase.removeChannel(channel),
          () => clearInterval(interval),
          () => document.removeEventListener('visibilitychange', onVis)
        );
      } else {
        setUserId(null);
        setFirstName('Guest');
        setCartCount(0);
      }
      setIsLoading(false);
    };

    initUser();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        cleanup.forEach(fn => fn()); // Clean previous
        cleanup = [];
        initUser();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setFirstName('Guest');
        setCartCount(0);
        setDropdownOpen(false);
        setMobileDropdownOpen(false);
        setIsMobileMenuOpen(false);
        cleanup.forEach(fn => fn());
        cleanup = [];
      }
    });

    return () => {
      subscription.unsubscribe();
      cleanup.forEach(fn => fn());
    };
  }, [fetchCartCount]);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setMobileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setUserId(null);
    setFirstName('Guest');
    setCartCount(0);
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleDashboardClick = () => {
    setDropdownOpen(false);
    setMobileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/dashboard');
  };

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Discover', href: '/map' },
    { name: 'Products', href: '/products' },
    { name: 'Health', href: '/vet' },
    { name: 'Contact', href: '/contactUs' },
  ];

  const UserDropdown = ({ isMobile = false }) => {
    const isOpen = isMobile ? mobileDropdownOpen : dropdownOpen;
    const setOpen = isMobile ? setMobileDropdownOpen : setDropdownOpen;

    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!isOpen)}
          className="flex items-center gap-2 text-[#f5f5dc] hover:text-[#FF8A65] transition-colors duration-200"
        >
          <UserIcon className="h-5 w-5 opacity-80" />
          <span className="font-[var(--font-inter)] text-sm md:text-base">
            Hi, <span className="font-semibold">{firstName}</span>
          </span>
          <ChevronDown size={16} className="opacity-70" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute ${isMobile ? 'left-0 bg-black/40' : 'right-0 bg-black/60'} mt-2 w-40 rounded-lg shadow-lg text-white py-2 backdrop-blur-md`}
            >
              <button onClick={handleDashboardClick} className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200">
                My Profile
              </button>
              <button onClick={handleSignOut} className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200">
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const CartIcon = ({ onClick }: { onClick?: () => void }) => (
    <Link href="/cart" onClick={onClick} className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-white/10 transition" aria-label="Cart">
      <ShoppingCart className="h-6 w-6 text-[#f5f5dc]" />
      {cartCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-[#FF8A70] px-1.5 text-[11px] font-bold text-white grid place-items-center shadow">
          {cartCount}
        </span>
      )}
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/50 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center justify-between h-16 md:h-20 relative"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group z-50">
            <motion.div whileHover={{ rotate: 15, scale: 1.2 }} transition={{ duration: 0.2 }}>
              <PawPrint className="h-8 w-8 text-[#f5f5dc] group-hover:text-[#FF8A65] transition-colors duration-200" />
            </motion.div>
            <motion.span className="text-2xl font-bold text-[#f5f5dc] group-hover:text-[#FF8A65] transition-colors duration-200" style={{ letterSpacing: '0.2em' }}>
              PETZONEE
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
            <div className="flex items-center space-x-6 bg-white/20 rounded-full px-8 py-3 shadow-lg">
              {navItems.map((item, index) => (
                <motion.div key={item.name} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05 }}>
                  <Link href={item.href} className="text-[#f5f5dc] hover:text-[#FF8A70] font-[var(--font-inter)] font-medium transition-colors duration-200 relative group tracking-wide">
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FF8A70] transition-all duration-200 group-hover:w-full" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4 z-50 relative">
            {!isLoading && userId ? (
              <>
                <CartIcon />
                <UserDropdown />
              </>
            ) : !isLoading && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-500 text-white font-[var(--font-inter)] font-semibold px-6 py-2 rounded-full shadow-lg transition-all duration-200 tracking-wide">
                    Join Now
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2 relative w-8 h-8 flex flex-col justify-center items-center group z-50"
            whileTap={{ scale: 0.9 }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="absolute h-0.5 w-6 bg-white rounded group-hover:bg-yellow-300"
                initial={false}
                animate={{
                  rotate: isMobileMenuOpen && i !== 1 ? (i === 0 ? 45 : -45) : 0,
                  y: isMobileMenuOpen ? 0 : (i === 0 ? -6 : i === 2 ? 6 : 0),
                  opacity: isMobileMenuOpen && i === 1 ? 0 : 1
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </motion.button>
        </motion.div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-black/20 backdrop-blur-md rounded-lg mt-2"
            >
              <div className="px-4 py-6 space-y-4">
                {!isLoading && userId && (
                  <div className="flex flex-col gap-2">
                    <CartIcon onClick={() => setIsMobileMenuOpen(false)} />
                    <UserDropdown isMobile />
                  </div>
                )}

                {navItems.map((item, index) => (
                  <motion.div key={item.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="block text-white hover:text-orange-400 font-[var(--font-inter)] font-medium py-2 transition-colors duration-200 tracking-wide">
                      {item.name}
                    </Link>
                  </motion.div>
                ))}

                {!isLoading && !userId && (
                  <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-500 text-white font-[var(--font-inter)] font-semibold py-2 rounded-full mt-4 tracking-wide shadow-lg">
                      Join Now
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;