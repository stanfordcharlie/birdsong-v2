import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's stock scales. Every custom key added
 * under `theme.extend` in tailwind.config.ts has to be declared here too, or
 * the merger misfiles it — and a misfiled class is silently deleted from the
 * output. This is not a nicety; it has already shipped a visible bug.
 *
 * The failure that motivated this: `text-*` is the prefix for BOTH font-size
 * and text-color. Our custom sizes (text-control, text-micro, …) are not in
 * the stock font-size scale, so tailwind-merge fell back to reading them as
 * colors. That put `text-control` in the same conflict group as
 * `text-primary-foreground`, and since cva emits size after variant, the size
 * won and the color was dropped: admin's small primary buttons rendered as
 * dark ink text on an ink pill, i.e. an invisible label.
 *
 * radius / shadow / max-width fail less loudly but are the same defect. An
 * unrecognised class joins no group, so it conflicts with nothing and a later
 * override silently fails to replace it — both classes survive and CSS source
 * order decides the winner instead of the call site.
 *
 * Keep this in step with tailwind.config.ts. lib/utils.test.ts guards it.
 */

// theme.extend.borderRadius. Registered on every corner group, not just the
// all-corner one: AdminSidebar already writes `rounded-r-control`, and a
// corner-specific class lands in its own group (`rounded-r`), which the
// all-corner entry does not cover.
const RADIUS_KEYS = ["card", "control", "account", "pill"]
const ROUNDED_GROUP_IDS = [
  "rounded",
  "rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l",
  "rounded-ss", "rounded-se", "rounded-ee", "rounded-es",
  "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl",
] as const

const roundedClassGroups = Object.fromEntries(
  ROUNDED_GROUP_IDS.map((id) => [id, [{ [id]: RADIUS_KEYS }]])
)

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // theme.extend.fontSize — the named control steps.
      "font-size": [
        { text: ["micro", "count", "control", "nav", "wordmark", "display-sm", "account", "role"] },
      ],
      ...roundedClassGroups,
      // theme.extend.boxShadow — the one admin card elevation.
      shadow: [{ shadow: ["card", "card-hover"] }],
      // theme.extend.maxWidth — the single admin container width.
      "max-w": [{ "max-w": ["container"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
