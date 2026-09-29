import { cn } from "@/lib/utils";
import { bg, border, radius } from "@/components/admin/ui/tokens";

/**
 * The official marks, as inline SVG so they scale and need no asset request.
 *
 * A logo is never drawn by hand and never recoloured: each mark carries the
 * vendor's own brand colours, which is why these are the only literal colours
 * under app/admin. They are not tokens and must not be reused anywhere else.
 * Paths are the vendors' published marks on a 24-unit grid.
 */

export type IntegrationVendor = "hubspot" | "salesforce" | "slack";

type MarkProps = { size?: number; className?: string };

export function HubSpotMark({ size = 20, className }: MarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="#FF7A59"
    >
      <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.196 2.196 0 0 0 1.252 1.973l.013.006v2.852a6.22 6.22 0 0 0-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 0 0-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033c0-.202-.03-.397-.086-.581l.004.014 2.317-2.317a6.2 6.2 0 1 0 4.782-11.156l-.043-.005zm-.964 9.378a3.185 3.185 0 1 1 .001-6.37 3.185 3.185 0 0 1-.001 6.37z" />
    </svg>
  );
}

export function SlackMark({ size = 20, className }: MarkProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)}>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

export function SalesforceMark({ size = 20, className }: MarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="#00A1E0"
    >
      <path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.176 5.22c-.345 0-.69-.044-1.02-.104a3.75 3.75 0 0 1-3.3 1.95c-.6 0-1.155-.15-1.65-.375A4.314 4.314 0 0 1 8.88 20.4a4.302 4.302 0 0 1-4.05-2.82c-.27.062-.54.076-.825.076-2.204 0-4.005-1.8-4.005-4.05 0-1.5.811-2.805 2.01-3.51-.255-.57-.39-1.2-.39-1.846 0-2.58 2.1-4.65 4.65-4.65 1.53 0 2.85.705 3.72 1.8" />
    </svg>
  );
}

const MARKS: Record<IntegrationVendor, (props: MarkProps) => React.ReactNode> = {
  hubspot: HubSpotMark,
  salesforce: SalesforceMark,
  slack: SlackMark,
};

export function VendorMark({ vendor, ...props }: MarkProps & { vendor: IntegrationVendor }) {
  const Mark = MARKS[vendor];
  return <Mark {...props} />;
}

/**
 * The mark on a neutral tile: base ground, hairline border, control radius.
 * 40px in headers and menus, 32px in table rows.
 */
export function LogoTile({
  vendor,
  size = 40,
  className,
}: {
  vendor: IntegrationVendor;
  size?: 32 | 40;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border",
        size === 40 ? "h-10 w-10" : "h-8 w-8",
        radius.control,
        border.base,
        bg.base,
        className
      )}
    >
      <VendorMark vendor={vendor} size={size === 40 ? 22 : 18} />
    </span>
  );
}
