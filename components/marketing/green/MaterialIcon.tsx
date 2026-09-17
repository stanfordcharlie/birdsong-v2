import { cn } from "@/lib/utils";

/**
 * One of the home landing page's four thin-line icons.
 *
 * Material Symbols renders by ligature: the glyph name is the element's own
 * text content. That makes the icon font non-optional in a way an SVG set
 * would not be, which is why it is self-hosted and subsetted to exactly
 * these names rather than linked from Google (see lib/fonts.ts), and
 * why `.ln-icon` in globals.css forces `liga` on.
 *
 * The name is typed rather than a free string so a call site cannot ask for
 * a glyph the subset does not contain — that would silently render the word
 * instead of the icon, and only in the browser.
 */
export type GreenIconName =
  | "mic"
  | "graphic_eq"
  | "groups"
  | "edit_note"
  | "format_quote"
  | "check";

export function MaterialIcon({
  name,
  className,
}: {
  name: GreenIconName;
  className?: string;
}) {
  return (
    // aria-hidden throughout: every icon on this page sits beside the
    // heading or label that already names it, so announcing the ligature
    // text would just read the glyph name aloud.
    <span aria-hidden="true" className={cn("ln-icon", className)}>
      {name}
    </span>
  );
}
