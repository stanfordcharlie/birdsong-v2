import { Card } from "@/components/admin/ui";
import { border, radius, bg, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

/** The section's title and its one muted line. */
export function SettingsTitle({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className={cn("text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em]", text.ink)}>{title}</h1>
      {description && <p className={cn("text-[13px] leading-[1.45]", text.muted2)}>{description}</p>}
    </div>
  );
}

/** A Settings section at the reading width every section but the profile uses. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-[900px] flex-col gap-[18px]">
      <SettingsTitle title={title} description={description} />
      {children}
    </div>
  );
}

/**
 * One setting: what it is on the left, its control in a card on the right.
 * Rows are separated by a hairline.
 */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-t py-6 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8",
        border.base
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className={cn("text-[15px] font-extrabold leading-[1.3]", text.ink)}>{title}</h2>
        <p className={cn("text-[13px] leading-[1.45]", text.muted2)}>{description}</p>
      </div>
      <Card>{children}</Card>
    </section>
  );
}

/** The 38px field every Settings form uses. */
export const settingsInputClass = cn(
  "focus-ring h-[38px] w-full border px-3 text-[14px] placeholder:text-[color:hsl(var(--ds-muted-3))] disabled:opacity-60",
  radius.control,
  border.base,
  bg.base,
  text.ink
);

export const settingsLabelClass = cn("text-[12px] font-bold", text.muted2);
