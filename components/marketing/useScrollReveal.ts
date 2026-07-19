"use client";

import { useEffect, useRef } from "react";

// Scroll reveal for the landing sections (design_handoff_landing_sections):
// adds "lp-in" to each [data-reveal] descendant once it's ~20% visible,
// then stops observing it. All the visual work lives in globals.css behind
// prefers-reduced-motion: no-preference — for reduced-motion users the
// elements are already at rest, so this class landing is a no-op.
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 }
    );
    targets.forEach((target) => io.observe(target));
    return () => io.disconnect();
  }, []);

  return ref;
}
