"use client";

import * as React from "react";

/**
 * A row or header selection box.
 *
 * A native checkbox tinted with the primary colour. The admin kit does not
 * fork a checkbox for this: one input with accent-color is themed
 * consistently enough by every evergreen browser, and a native box is what
 * keeps keyboard and screen reader behaviour free.
 *
 * `indeterminate` is the header box's "some of these rows" state. It is a DOM
 * property rather than an attribute, so it is set imperatively.
 *
 * Inside a DataTable row that has a `rowHref`, the stretched row link sits
 * under the cell contents and real controls take their pointer events back,
 * so this works in a clickable row without any extra handling.
 */
export function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  /** What this box selects, for the accessible name. Never rendered. */
  label: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={label}
      className="focus-ring block h-4 w-4 cursor-pointer rounded accent-primary disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
