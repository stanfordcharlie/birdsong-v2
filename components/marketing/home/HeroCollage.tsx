"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../green/MaterialIcon";

// The collage is composed at a fixed size and then scaled as a unit. Every
// offset below is a pixel coordinate inside this stage, so these two numbers
// are the only thing standing between the design's arithmetic and the page.
const STAGE_W = 600;
const STAGE_H = 560;

// Both four-point stars. Kept as one constant because the 96px and 34px
// stars are the same shape at two sizes, and a second copy of eight
// percentage pairs is a second chance to mistype one.
const STAR_CLIP =
  "polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)";

/**
 * The hero's flat-illustration collage: rings, arches, sticker avatars and
 * two hard-shadowed cards.
 *
 * The whole composition is authored at 600x560 and scaled down to whatever
 * width its grid column actually gets. That is the only way this survives
 * being responsive: the pieces overlap by design (the mic badge hangs off
 * the SO sticker, the quote card crosses the arches), so reflowing them
 * individually would pull the composition apart, and a fixed 600px stage in
 * a 340px column would simply spill across the page. Scaling keeps every
 * relationship exact at every width and cannot clip.
 *
 * The wrapper's height is the scaled height rather than 560px, because a
 * `transform` does not affect layout — without it the collage would leave a
 * 560px hole under itself on a phone.
 *
 * This is the one client component on the page. A container query would
 * avoid it, but CSS cannot divide a length by a length to produce the
 * unitless scale factor, so the measurement has to happen in script.
 */
export function HeroCollage() {
  const [scale, setScale] = useState(1);
  const observerRef = useRef<ResizeObserver | null>(null);

  // A ref callback, not useEffect + useRef: the stage is measured the moment
  // it is attached, so the first painted frame after hydration is already at
  // the right scale instead of flashing full size and snapping down.
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;

    const measure = () => {
      const next = Math.min(1, el.clientWidth / STAGE_W);
      // Ignore sub-half-percent changes. Scrollbar appearance and subpixel
      // layout shifts otherwise retrigger a state update from inside the
      // observer callback, which is the classic ResizeObserver loop.
      setScale((current) => (Math.abs(next - current) > 0.005 ? next : current));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observerRef.current = observer;
    measure();
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return (
    <div
      ref={stageRef}
      // Renders at full size on the server and before measurement, which is
      // correct for the desktop case the hero is designed around.
      style={{ height: Math.round(STAGE_H * scale) }}
      className="relative w-full min-w-0"
    >
      <div
        style={{ transform: `scale(${scale})` }}
        className="absolute left-1/2 top-0 ml-[-300px] h-[560px] w-[600px] origin-[50%_0] overflow-hidden"
      >
        {/* Sage ring */}
        <div className="absolute left-[80px] top-[10px] size-[250px] rounded-full border-[74px] border-ln-sage" />

        {/* The two green arches behind the cards */}
        <div className="absolute -right-[20px] top-[170px] h-[140px] w-[280px] rounded-t-[140px] bg-ln-green" />
        <div className="absolute -right-[20px] top-[320px] h-[140px] w-[280px] rounded-t-[140px] bg-ln-green" />

        {/* Report card */}
        <div className="absolute left-[60px] top-[120px] w-[300px] border-2 border-ln-ink bg-white px-[22px] pb-[26px] pt-[22px] shadow-[8px_8px_0_var(--ln-ink)]">
          <div className="mb-[16px] font-jakarta text-[16px] font-bold leading-[1.2]">
            Where pipeline comes from
          </div>
          <div className="grid gap-[9px]">
            <div className="h-[14px] w-[88%] bg-ln-green" />
            <div className="h-[14px] w-[64%] bg-ln-sage" />
            <div className="h-[14px] w-[46%] bg-ln-green-mid" />
            <div className="h-[14px] w-[28%] bg-ln-green-pale" />
          </div>
        </div>

        {/* Quote card */}
        <div className="absolute left-[180px] top-[350px] w-[290px] border-2 border-ln-ink bg-white px-[24px] py-[22px] shadow-[8px_8px_0_var(--ln-ink)]">
          <div className="font-jakarta text-[17px] font-semibold leading-[1.35] tracking-[-0.01em]">
            “Triage. Everything sits for days and the good ones go cold.”
          </div>
          <div className="mt-[16px] flex items-center justify-between">
            <span className="text-[12px] text-ln-muted">Head of Growth · Coretide</span>
            <span className="rounded-full border-[1.5px] border-ln-ink bg-ln-green-pale px-[10px] py-[3px] text-[11px] font-bold">
              Score 9 / 10
            </span>
          </div>
        </div>

        {/* Sparkle disc */}
        <div className="absolute left-[400px] top-[20px] flex size-[170px] items-center justify-center rounded-full bg-ln-logo-cream">
          <div style={{ clipPath: STAR_CLIP }} className="size-[96px] bg-ln-green" />
          <div
            style={{ clipPath: STAR_CLIP }}
            className="absolute bottom-[34px] left-[22px] size-[34px] bg-ln-green"
          />
        </div>

        {/* Sticker: Head of Growth */}
        <div className="absolute left-0 top-[320px] w-[160px]">
          <div className="flex size-[150px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-sage font-jakarta text-[48px] font-extrabold text-ln-ink">
            SO
          </div>
          <div className="relative mx-auto -mt-[18px] w-max rounded-full border-[2.5px] border-ln-ink bg-white px-[16px] py-[6px] font-jakarta text-[13px] font-bold tracking-[0.06em]">
            HEAD OF GROWTH
          </div>
          <div className="absolute -right-[16px] top-[60px] flex size-[64px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-white">
            <MaterialIcon name="mic" className="text-[34px]" />
          </div>
        </div>

        {/* Sticker: CRO */}
        <div className="absolute left-[478px] top-[400px] w-[120px]">
          <div className="flex size-[116px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-green-mid font-jakarta text-[40px] font-extrabold text-white">
            JR
          </div>
          <div className="relative -mt-[18px] ml-[6px] w-max rounded-full border-[2.5px] border-ln-ink bg-white px-[16px] py-[6px] font-jakarta text-[13px] font-bold tracking-[0.06em]">
            CRO
          </div>
          <div className="absolute -left-[14px] -top-[30px] flex size-[56px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-white">
            <MaterialIcon name="graphic_eq" className="text-[30px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
