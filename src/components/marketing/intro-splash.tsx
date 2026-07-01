import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import logoUrl from "@/assets/Logo.png";
import { BRAND } from "@/lib/brand";

const SESSION_KEY = "lahza-intro-shown";
const DISPLAY_MS = 1800;

/** Small deterministic set of floating particles — fixed positions so SSR and
 * client render match (no Math.random mismatch / hydration warnings). */
const PARTICLES = [
  { x: 18, y: 24, delay: 0.1 },
  { x: 82, y: 18, delay: 0.3 },
  { x: 12, y: 70, delay: 0.5 },
  { x: 88, y: 66, delay: 0.2 },
  { x: 50, y: 12, delay: 0.4 },
  { x: 30, y: 85, delay: 0.6 },
  { x: 70, y: 82, delay: 0.15 },
  { x: 50, y: 90, delay: 0.35 },
];

export function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Nothing to render server-side or once we know this session already saw it.
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background"
          onClick={() => setVisible(false)}
        >
          <div className="absolute inset-0 bg-aurora-mesh" />
          <div className="absolute inset-0 bg-noise" />

          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-aurora-cyan"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], y: [0, -14, -24] }}
              transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
            />
          ))}

          <motion.div
            className="pointer-events-none absolute h-72 w-72 rounded-full bg-aurora-violet/30 blur-[100px]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 0.8 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center gap-4"
          >
            <motion.img
              src={logoUrl}
              alt={`${BRAND.name} logo`}
              width={56}
              height={56}
              className="rounded-2xl shadow-[var(--shadow-glow)]"
              animate={{ filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-display text-xl font-semibold tracking-tight text-gradient"
            >
              {BRAND.name}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
