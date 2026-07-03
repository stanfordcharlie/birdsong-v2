import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/home" className="text-lg font-semibold text-card-foreground">
        Birdsong
      </Link>
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost">
          <Link href="/admin/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link href="/admin/signup">Get Started</Link>
        </Button>
      </div>
    </header>
  );
}
