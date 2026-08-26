'use client';

import { useState, useEffect, useRef, useContext, createContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, Layers, Search, User, Compass, Grid3x3, X,
  BookOpen, Shield, Heart, Target, BarChart3, Upload, PackageOpen, LayoutGrid, Settings, Factory, ScanLine, Tag,
} from 'lucide-react';

const PRIMARY_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Scan', href: '/scan', icon: ScanLine },
  { label: 'Collections', href: '/collections', icon: Layers },
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Shelf', href: '/shelf', icon: User },
];

const MORE_ITEMS = [
  { label: 'All Cards', href: '/cards', icon: LayoutGrid },
  { label: 'Explore', href: '/explore', icon: BookOpen },
  { label: 'Manufacturers', href: '/manufacturers', icon: Factory },
  { label: 'Marketplace', href: '/marketplace', icon: Tag },
  { label: 'Vault', href: '/vault', icon: Shield },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Projects', href: '/projects', icon: Target },
  { label: 'Statistics', href: '/statistics', icon: BarChart3 },
  { label: 'Migration', href: '/migration', icon: Upload },
  { label: 'Pack Simulator', href: '/pack-simulator', icon: PackageOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function DockButton({ href, label, icon: Icon, isActive, onClick }: { href: string; label: string; icon: any; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`
        group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40
        ${isActive
          ? 'bg-foreground/10 text-foreground shadow-inner'
          : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5 hover:-translate-y-1'
        }
      `}
    >
      <Icon size={22} aria-hidden="true" />
      <div
        role="tooltip"
        className="absolute bottom-full mb-3 px-3 py-1.5 bg-background/80 backdrop-blur-md text-foreground text-xs font-medium rounded-full opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap z-50 border border-foreground/10 shadow-xl"
      >
        {label}
      </div>
      {isActive && (
        <motion.div
          layoutId="dock-indicator"
          className="absolute -bottom-1 w-1 h-1 bg-foreground rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  );
}

export function FloatingDock() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) {
      window.addEventListener('keydown', handleKey);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreOpen]);

  const isMoreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <div ref={panelRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-3">
      <AnimatePresence>
        {moreOpen && (
          <motion.nav
            aria-label="More navigation"
            className="grid grid-cols-4 gap-2 p-3 rounded-3xl bg-foreground/5 backdrop-blur-3xl border border-foreground/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
            initial={{ y: 16, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {MORE_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    isActive ? 'bg-foreground/10 text-foreground' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label="Primary navigation"
        className="flex items-center gap-2 p-2 rounded-full bg-foreground/5 backdrop-blur-3xl border border-foreground/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
      >
        {PRIMARY_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return <DockButton key={item.href} href={item.href} label={item.label} icon={item.icon} isActive={isActive} />;
        })}

        <div className="w-px h-6 bg-foreground/10 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-label={moreOpen ? 'Close more navigation' : 'More navigation'}
          aria-expanded={moreOpen}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
            moreOpen || isMoreActive ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5 hover:-translate-y-1'
          }`}
        >
          {moreOpen ? <X size={22} aria-hidden="true" /> : <Grid3x3 size={22} aria-hidden="true" />}
          <div role="tooltip" className="absolute bottom-full mb-3 px-3 py-1.5 bg-background/80 backdrop-blur-md text-foreground text-xs font-medium rounded-full opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-foreground/10 shadow-xl">
            More
          </div>
          {isMoreActive && !moreOpen && (
            <div className="absolute -bottom-1 w-1 h-1 bg-foreground rounded-full" />
          )}
        </button>
      </motion.nav>
    </div>
  );
}

/**
 * Lets a page opt itself out of the floating in-app dock (see
 * useHideFloatingDock below) — the pre-auth marketing homepage is the first
 * user of this, since the dock's Scan/Collections/Shelf items make no sense
 * before signing up. A context rather than a pathname check in AppShell
 * itself: AppShell has no server-provided knowledge of auth state, and "/"
 * renders different content for signed-in vs signed-out visitors — the page
 * that actually knows which one it is opts out itself.
 */
const DockVisibilityContext = createContext<{ setHidden: (hidden: boolean) => void } | null>(null);

/**
 * Call from a page's top-level Client Component to hide the floating dock
 * while it's mounted. `hidden` (default true) lets a page that's public
 * regardless of viewer identity — e.g. a shared /u/[username] profile —
 * hide the dock only for the guest-viewer case, since Scan/Shelf/Collections
 * are meaningless to someone who isn't signed in but useful to one who is.
 */
export function useHideFloatingDock(hidden: boolean = true) {
  const ctx = useContext(DockVisibilityContext);
  useEffect(() => {
    if (!hidden) return;
    ctx?.setHidden(true);
    return () => ctx?.setHidden(false);
  }, [ctx, hidden]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [dockHidden, setDockHidden] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-foreground focus:text-background focus:font-medium"
      >
        Skip to content
      </a>
      <DockVisibilityContext.Provider value={{ setHidden: setDockHidden }}>
        <main id="main-content" className="flex-1 min-h-screen relative overflow-hidden pointer-events-auto">
          {children}
        </main>

        {/*
          A container for the dock that allows pointer events to pass through everywhere else.
          The main content remains fully interactive behind the dock area.
        */}
        {!dockHidden && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <FloatingDock />
          </div>
        )}
      </DockVisibilityContext.Provider>
    </div>
  );
}
