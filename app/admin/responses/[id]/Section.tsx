// The ruled section the response detail page is built from: a hairline, an
// eyebrow, an optional action on the right. Shared by the read-only view
// and the workflow panel so the two cannot rule themselves differently.
export function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="type-eyebrow">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
