"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import type { StatsProps } from "@/types/blocks";

function parseNumeric(value: string): { num: number; prefix: string; suffix: string } | null {
  const match = value.match(/^([^\d]*?)([\d,.]+)(.*)$/);
  if (!match) return null;
  const num = parseFloat(match[2].replace(/,/g, ""));
  if (isNaN(num)) return null;
  return { prefix: match[1], num, suffix: match[3] };
}

function formatNumber(n: number, original: string): string {
  if (original.includes(",")) {
    return n.toLocaleString("en-US");
  }
  if (n % 1 !== 0) return n.toFixed(1);
  return String(Math.round(n));
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(value);
  const parsed = useRef(parseNumeric(value));

  useEffect(() => {
    if (!isInView || !parsed.current) return;

    const { num, prefix, suffix } = parsed.current;
    const duration = 1500;
    const steps = 40;
    const increment = num / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      current = num * eased;
      setDisplay(`${prefix}${formatNumber(current, value)}${suffix}`);

      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-black sm:text-4xl">{display}</p>
      <p className="mt-1 text-sm opacity-50">{label}</p>
    </div>
  );
}

export function StatsBlock({ stats }: StatsProps) {
  return (
    <section className="border-y border-current/10 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
