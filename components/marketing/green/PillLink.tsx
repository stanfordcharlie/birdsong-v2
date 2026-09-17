import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The home landing page's one button shape: a Plus Jakarta Sans 600 pill.
 *
 * Only the colour treatment is a variant. Size is left to the caller
 * because the design uses four different pairs of padding/font-size (nav,
 * hero, research, CTA) and an enum of four one-off sizes would carry no
 * more meaning than the values themselves. The outline variant's padding is
 * deliberately 2px tighter than the filled one at every size so its 2px
 * border lands on the same outer box.
 *
 * Always renders next/link: every button on this page points at a real
 * route or an in-page anchor, never a handler.
 */
export function PillLink({
  href,
  variant,
  className,
  children,
}: {
  href: string;
  variant: "filled" | "outline" | "cream";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-block rounded-full font-jakarta font-semibold no-underline transition-colors",
        variant === "filled" && "bg-ln-green text-white hover:bg-ln-green-hover hover:text-white",
        variant === "outline" &&
          "border-2 border-ln-green text-ln-green hover:bg-ln-green-tint hover:text-ln-green-hover",
        // The CTA band's inverted pill: logo cream on the green ground,
        // going to plain white on hover rather than darkening.
        variant === "cream" && "bg-ln-logo-cream text-ln-ink hover:bg-white hover:text-ln-ink",
        className
      )}
    >
      {children}
    </Link>
  );
}
