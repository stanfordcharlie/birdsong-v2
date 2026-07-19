## Setup

No provider or root wrapper is required. There's no theme/context component to mount — every token is a plain CSS custom property already defined on `:root` in `styles.css`, and the self-hosted Inter font is wired the same way (a `--font-inter` variable on `:root`, not a page-scoped class). Just import a component and render it.

## Styling idiom

Tailwind utility classes, extended with this system's own semantic color and radius scale (defined in `styles.css`, read by every component). Build UI by composing these with standard Tailwind spacing/layout utilities — never write raw hex colors or arbitrary border-radius values.

Color pairs (each `bg-*` has a matching `*-foreground` for text/icons on top of it):
- `bg-page` — app background (#f8f8f7)
- `bg-card` / `text-card-foreground` — default surface and primary text (white / near-black)
- `bg-primary` / `text-primary-foreground`, hover state `hover:bg-primary-hover` — the indigo accent, for primary actions
- `bg-secondary` / `text-secondary-foreground` — neutral fill for subtle surfaces (chips, muted rows)
- `text-muted-foreground` — secondary/quiet text (labels, captions, helper copy)
- `bg-destructive` / `text-destructive-foreground` — errors, delete actions
- `bg-success` / `text-success-foreground`, `bg-warning` / `text-warning-foreground` — status states (e.g. Badge variants)
- `border-border` — default border color; `border-input` — form control borders
- `ring-ring` — focus ring color (already wired into Input/Textarea/Button's `focus-visible:` states)

Radius: `rounded-card` (12px) for cards/containers, `rounded-control` (8px) for inputs and buttons. Never use Tailwind's default `rounded-lg`/`rounded-md` on these components' own surfaces — use the semantic names so a future token change stays in sync.

Status color is meaningful, not decorative: success/warning/destructive map to real states (qualified/pending/rejected, valid/invalid) — don't pick one for visual variety alone.

## Where the truth lives

`styles.css` at the bundle root (and its `@import` closure, including `_ds_bundle.css`) is the authoritative stylesheet — every token and utility class above is defined there. Each component's own `.prompt.md` documents its specific props; `Card`/`Table` are compound (import the sub-parts — `CardHeader`, `CardContent`, `CardFooter`, etc. — alongside the root component, they have no standalone visual identity).

## Example

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from "birdsong-ui";

function LeadCard() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Dispatch software renewal interview</CardTitle>
          <Badge variant="success">Qualified</Badge>
        </div>
        <CardDescription>18 responses, 6 questions each</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-card-foreground">
          Commercial HVAC and plumbing teams describe how they currently handle scheduling and dispatch.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">View responses</Button>
      </CardFooter>
    </Card>
  );
}
```
