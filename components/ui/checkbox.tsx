import * as React from "react";
import { cn } from "@/lib/utils";

// Plain native checkbox (no Radix dependency in this codebase yet), sized up
// from the browser default and tinted with the design system's primary color
// via accent-color, which every evergreen browser now themes consistently
// enough to skip a custom-rendered box.
const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn("h-[18px] w-[18px] cursor-pointer rounded accent-primary", className)}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
