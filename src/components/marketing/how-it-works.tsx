"use client";

import { useLayoutEffect, useRef } from "react";
import { Camera, ScanSearch, CheckCircle2, LayoutGrid } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STEPS = [
  { icon: Camera, title: "Scan a card", body: "Point your camera at any card — Collectra reads it instantly, right from your phone." },
  { icon: ScanSearch, title: "We find the exact match", body: "Matched against the full catalog down to the parallel and variant, not just the base card." },
  { icon: CheckCircle2, title: "You confirm", body: "AI identification never adds anything silently — you pick the right match if there's more than one candidate." },
  { icon: LayoutGrid, title: "It's tracked", body: "Priced, valued, and added straight to your Shelf. No spreadsheet required." },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const steps = stepRefs.current.filter(Boolean) as HTMLDivElement[];
      gsap.set(steps, { opacity: 0.25, scale: 0.96 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${steps.length * 400}`,
          scrub: 0.6,
          pin: true,
        },
      });

      steps.forEach((step, i) => {
        tl.to(step, { opacity: 1, scale: 1, duration: 0.5 }, i);
        if (i > 0) tl.to(steps[i - 1], { opacity: 0.25, scale: 0.96, duration: 0.5 }, i);
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center py-24 md:py-0">
      <div className="max-w-3xl mx-auto px-6 w-full">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 text-center mb-4">How it works</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-16">From your camera to your Shelf</h2>

        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="flex items-start gap-5 p-6 rounded-3xl bg-foreground/5 border border-foreground/10"
            >
              <div className="w-11 h-11 rounded-2xl bg-foreground/10 flex items-center justify-center shrink-0 text-foreground">
                <step.icon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-foreground/40">0{i + 1}</span>
                  <h3 className="font-display font-bold text-lg">{step.title}</h3>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
