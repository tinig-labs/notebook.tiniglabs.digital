import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { A, LegalPage, List, Mail, P, Section } from "@/components/legal";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for the tinig labs notebook beta.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" lede={<>The rules for using the <Brand /> notebook during the closed beta.</>}>
      <Section id="beta" title="Closed beta">
        <P>
          The notebook is free while in beta and open only to approved speech-language pathologists. Features may
          change and things may break, so keep an export of anything you can&apos;t lose.
        </P>
      </Section>

      <Section id="your-duties" title="Your responsibilities">
        <List>
          <li>Use it only for your professional practice, and keep your email account secure.</li>
          <li>Get informed consent from each patient, or a parent or guardian, before recording.</li>
          <li>Record only what therapy needs, and delete data you no longer need.</li>
          <li>Sign out devices you lose or stop using (Settings → Devices).</li>
          <li>Tell us right away at <Mail /> if you think your account was misused.</li>
        </List>
      </Section>

      <Section id="processing" title="How we process data for you">
        <P>
          You remain the personal information controller. As your processor under the Data Privacy Act, we:
        </P>
        <List>
          <li>process patient data only to provide the notebook, and only on your instructions in the app;</li>
          <li>keep it confidential and encrypted, and limit who on our side can operate the systems;</li>
          <li>use only the providers listed in the <A href="/privacy">privacy notice</A>, under equal protections;</li>
          <li>help you answer patient requests to access, correct or delete their data;</li>
          <li>tell you and the NPC within 72 hours of a breach affecting your data;</li>
          <li>delete everything when you delete your account.</li>
        </List>
      </Section>

      <Section id="ipa" title="Transcriptions">
        <P>
          IPA is produced by a research model (used under a non-commercial licence). It can be wrong.
          Treat it as a draft and use your clinical judgment.
        </P>
      </Section>

      <Section id="ending" title="Leaving">
        <P>
          You can export and delete your data at any time. We may end the beta with 30 days&apos; notice by email, giving
          you time to export.
        </P>
      </Section>

      <Section id="liability" title="No warranty">
        <P>
          The beta is provided as is. To the extent the law allows, <Brand /> isn&apos;t liable for losses from using it.
          Nothing here limits rights you have under Philippine law.
        </P>
      </Section>

      <Section id="contact" title="Contact">
        <P>
          <Mail />
        </P>
      </Section>
    </LegalPage>
  );
}
