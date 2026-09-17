import { describe, expect, it } from "vitest";
import { cn } from "./utils";

/**
 * Guards the custom scales registered in lib/utils.ts against
 * tailwind.config.ts.
 *
 * tailwind-merge silently DELETES a class it misfiles, and an invalid or
 * absent utility is never a build error, so nothing else in the pipeline can
 * catch this. It shipped once already: `text-*` is the prefix for both
 * font-size and text-color, so the custom sizes were read as colors and the
 * real color was dropped from every small primary button — an ink label on an
 * ink pill.
 *
 * Add a case here whenever theme.extend gains a key.
 */
describe("cn", () => {
  // The regression itself: a size and a color are different CSS properties
  // and must never knock each other out, in either order.
  it.each([
    ["text-control", "text-primary-foreground"],
    ["text-micro", "text-muted-foreground"],
    ["text-count", "text-faint"],
    ["text-nav", "text-sidebar-foreground"],
    ["text-wordmark", "text-sidebar-active-foreground"],
    ["text-display-sm", "text-card-foreground"],
    ["text-account", "text-sidebar-active-foreground"],
    ["text-role", "text-sidebar-muted/[0.38]"],
  ])("keeps %s alongside %s", (size, color) => {
    expect(cn(size, color).split(" ")).toEqual([size, color]);
    expect(cn(color, size).split(" ")).toEqual([color, size]);
  });

  it("keeps a custom size alongside a font family", () => {
    expect(cn("text-control", "font-archivo").split(" ")).toEqual(["text-control", "font-archivo"]);
  });

  // The mirror of the above: classes that DO set the same property still have
  // to collapse, or a call-site override stops working.
  it.each([
    ["custom over custom size", "text-control text-micro", "text-micro"],
    ["custom over stock size", "text-sm text-control", "text-control"],
    ["stock over custom size", "text-control text-sm", "text-sm"],
    ["custom radius", "rounded-card rounded-pill", "rounded-pill"],
    ["account radius", "rounded-control rounded-account", "rounded-account"],
    ["stock over custom radius", "rounded-pill rounded-md", "rounded-md"],
    ["per-corner radius", "rounded-r-control rounded-r-pill", "rounded-r-pill"],
    ["custom shadow", "shadow-card shadow-card-hover", "shadow-card-hover"],
    ["stock over custom shadow", "shadow-card shadow-sm", "shadow-sm"],
    ["custom max-width", "max-w-container max-w-[720px]", "max-w-[720px]"],
  ])("collapses %s", (_label, input, expected) => {
    expect(cn(input)).toBe(expected);
  });

  it("still merges plain Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("bg-chip", "bg-brand-weak")).toBe("bg-brand-weak");
  });
});
