import { newsreader } from "@/lib/fonts";

export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${newsreader.variable} min-h-screen overflow-x-hidden bg-[radial-gradient(1200px_600px_at_50%_-10%,#FBF7ED_0%,#F5EFE3_60%)] text-[#211D16]`}
    >
      {children}
    </div>
  );
}
