import { PublicShell } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicShell>{children}</PublicShell>
      <SiteFooter />
    </>
  );
}
