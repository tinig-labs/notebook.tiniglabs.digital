import { PublicShell } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { FOOTER_LINKS } from "@/lib/constants";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicShell>{children}</PublicShell>
      <SiteFooter current="notebook" links={FOOTER_LINKS} />
    </>
  );
}
