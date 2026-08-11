"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, ScanLine, LayoutGrid, TrendingUp, Shield, BarChart3, Upload,
  Check, ChevronDown, Sparkles,
} from "lucide-react";
import { RarityShowcaseCard } from "./rarity-showcase-card";
import { HowItWorks } from "./how-it-works";
import { useHideFloatingDock } from "@/components/layout/app-shell";

const FEATURES = [
  { icon: ScanLine, title: "Scan & identify", body: "Point your camera at a card. Collectra identifies it, matches the exact variant, and adds it to your Shelf." },
  { icon: LayoutGrid, title: "The full catalog", body: "Sports, TCGs, and pop culture — searchable down to the parallel and print run." },
  { icon: TrendingUp, title: "Real market value", body: "Live pricing pulled from real marketplace sales, not a static price guide. Know what your binder is worth today." },
  { icon: Shield, title: "Vault & Wishlist", body: "Track what you own, what's protected, and what you're chasing next." },
  { icon: BarChart3, title: "Collection intelligence", body: "A health score, completion tracking, and gap analysis your spreadsheet never gave you." },
  { icon: Upload, title: "Import everything", body: "Bring an existing collection in from a spreadsheet or another tracker in minutes." },
];

const FAQS = [
  { q: "Is my collection private?", a: "Yes, by default. Nothing you track is visible to anyone else unless you turn on a public profile, and even then, dollar values stay hidden unless you separately opt in." },
  { q: "What can I track with Collectra?", a: "Sports cards, trading card games, and pop-culture sets — anything in the catalog, plus anything you import yourself." },
  { q: "How does scanning work?", a: "Take a photo of a card in the app. Collectra identifies the card and variant, you confirm the match, and it's added straight to your collection — priced automatically." },
  { q: "Can I import my existing collection?", a: "Yes — the Migration tool brings in a spreadsheet or an export from another tracker, matches each row to the catalog, and lets you review anything it's unsure about before committing." },
  { q: "What happens on the free plan?", a: "Free tracks cards across up to 4 sets and 25 confirmed scans a week. Pro removes both limits." },
];

export function Homepage({ stats }: { stats: { cards: number; sets: number; franchises: number; variants: number } }) {
  useHideFloatingDock();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />
      <Hero />
      <StatsStrip stats={stats} />
      <Features />
      <HowItWorks />
      <PricingTeaser />
      <FAQ />
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-40 px-4 py-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-2.5 rounded-full bg-background/60 backdrop-blur-2xl border border-foreground/10">
        <span className="font-display font-bold text-lg tracking-tight">Collectra</span>
        <div className="flex items-center gap-2">
          <Link href="/pricing" className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            Get started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-16 px-6">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-5"
          >
            The collector operating system
          </motion.p>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05] mb-6"
          >
            Every card has a story.
            <br />
            Collectra keeps it.
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="text-lg text-foreground/60 max-w-lg mb-10 leading-relaxed"
          >
            Scan a card and Collectra identifies it, prices it, and tracks it — across a catalog of sports, TCGs,
            and pop culture. No more spreadsheets guessing what your binder is worth.
          </motion.p>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} className="flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              Start free <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-foreground/5 border border-foreground/10 font-medium hover:bg-foreground/10 transition-colors"
            >
              See pricing
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 90 }}
          className="flex justify-center lg:justify-end"
        >
          <RarityShowcaseCard />
        </motion.div>
      </div>
    </section>
  );
}

function StatCount({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <p className="text-3xl sm:text-4xl font-display font-bold">{value.toLocaleString()}</p>
      <p className="text-xs font-mono uppercase tracking-widest text-foreground/40 mt-2">{label}</p>
    </motion.div>
  );
}

function StatsStrip({ stats }: { stats: { cards: number; sets: number; franchises: number; variants: number } }) {
  return (
    <section className="py-16 border-y border-foreground/10">
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <StatCount value={stats.cards} label="Cards" />
        <StatCount value={stats.variants} label="Variants" />
        <StatCount value={stats.sets} label="Sets" />
        <StatCount value={stats.franchises} label="Franchises" />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-4">What you get</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold">Everything a collection needs, in one place.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/[0.07] transition-colors"
            >
              <div className="w-11 h-11 rounded-2xl bg-foreground/10 flex items-center justify-center mb-5 text-foreground">
                <f.icon size={20} />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-4">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-16">Start free. Upgrade when you outgrow it.</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-3xl bg-foreground/5 border border-foreground/10"
          >
            <h3 className="font-display font-bold text-lg mb-1">Free</h3>
            <p className="text-3xl font-display font-bold mb-6">$0</p>
            <ul className="space-y-2.5 text-sm text-foreground/60">
              <li className="flex items-center gap-2"><Check size={15} className="text-foreground/40 shrink-0" /> Up to 4 sets</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-foreground/40 shrink-0" /> 25 scans / week</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-foreground/40 shrink-0" /> Full catalog & pricing</li>
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 rounded-3xl bg-primary/5 border border-primary/30 relative"
          >
            <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
              <Sparkles size={12} /> Pro
            </div>
            <h3 className="font-display font-bold text-lg mb-1">Pro</h3>
            <p className="text-3xl font-display font-bold mb-6">$4.99<span className="text-sm text-foreground/50 font-normal"> / mo</span></p>
            <ul className="space-y-2.5 text-sm text-foreground/60">
              <li className="flex items-center gap-2"><Check size={15} className="text-primary shrink-0" /> Unlimited sets</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-primary shrink-0" /> Unlimited scans</li>
              <li className="flex items-center gap-2"><Check size={15} className="text-primary shrink-0" /> Everything in Free</li>
            </ul>
          </motion.div>
        </div>

        <Link href="/pricing" className="inline-flex items-center gap-2 mt-10 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
          Full pricing details <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-4 text-center">Questions</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-16 text-center">Good to know</h2>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="rounded-2xl bg-foreground/5 border border-foreground/10 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium">{item.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-foreground/40 shrink-0">
                    <ChevronDown size={18} />
                  </motion.span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm text-foreground/60 leading-relaxed">{item.a}</p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="py-16 px-6 border-t border-foreground/10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <span className="font-display font-bold">Collectra</span>
        <nav className="flex items-center gap-6 text-sm text-foreground/50">
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
        </nav>
        <span className="text-xs text-foreground/30">© {new Date().getFullYear()} Collectra</span>
      </div>
    </footer>
  );
}
