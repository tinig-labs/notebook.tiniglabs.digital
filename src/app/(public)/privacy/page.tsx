import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { A, DataTable, LegalPage, List, Mail, P, Section } from "@/components/legal";
import { DPO_EMAIL, SITE_URL } from "@/lib/constants";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How tinig labs notebook handles SLP accounts and patient recordings.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

// Keep in sync with src/db/schema.ts.
const DATA = [
  {
    what: "Your name, email, clinic and PRC no.",
    when: "You request access or sign in",
    why: "To run the closed beta and send sign-in codes",
    kept: "Until you delete your account",
  },
  {
    what: "Patient details, notes, labels",
    when: "You add them",
    why: "To organise your caseload",
    kept: "Until you or your patient ask to delete them. Encrypted; we can't browse them",
  },
  {
    what: "Patient voice recordings",
    when: "You record or import audio",
    why: "To review speech and track progress",
    kept: "Until deleted. Encrypted on your device before upload",
  },
  {
    what: "IPA transcriptions",
    when: "You tap Transcribe",
    why: "To suggest a phonetic transcription",
    kept: "With the recording. Audio is processed in memory and not kept by the model",
  },
  {
    what: "Device list and security log",
    when: "You sign in, export, delete or transcribe",
    why: "To let you sign out lost devices and to investigate incidents",
    kept: "Device list until removed; log for 3 years. Never contains patient content",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      lede={
        <>
          The <Brand /> notebook holds health information about your patients. This page explains what we hold, how
          it&apos;s protected, and the choices you have.
        </>
      }
      summary={<DataTable rows={DATA} note="Sign-in cookies only. No analytics, no ads, and no selling or sharing of data." />}
    >
      <Section id="roles" title="Who is responsible">
        <P>
          Under the Data Privacy Act of 2012 (RA 10173), you, the speech-language pathologist, are the personal
          information controller for your patients&apos; data. <Brand /> is your personal information processor: we
          store and process it only to run the notebook for you, as set out in the <A href="/terms">Terms</A>.
        </P>
        <P>Patient health information and recordings are sensitive personal information under the Act.</P>
      </Section>

      <Section id="consent" title="Patient consent">
        <P>
          Before you record a patient, you confirm that the patient, or for a minor a parent or guardian, has given
          informed consent. The notebook records who gave consent and when. Collect only what you need for therapy.
        </P>
      </Section>

      <Section id="security" title="How it’s protected">
        <List>
          <li>Everything is encrypted with AES-256-GCM on your device, before it is stored or synced.</li>
          <li>Each account has its own data key, kept wrapped by a master key held in Cloudflare&apos;s secret store.</li>
          <li>Our database and file storage hold only ciphertext. Audio is never public and has no shareable link.</li>
          <li>All traffic uses HTTPS (TLS). Sign-in uses one-time email codes; there are no passwords to leak.</li>
          <li>Only approved beta users can sign in. You can sign out lost devices, which wipes their local copy.</li>
          <li>Access, exports, transcriptions and deletions are logged, without patient content.</li>
        </List>
        <P>
          Because the keys are managed for you, you never need a passphrase. It also means our systems can decrypt
          audio when you ask for a transcription. That happens in memory only, and staff don&apos;t access patient data.
        </P>
      </Section>

      <Section id="providers" title="Who else handles it">
        <List>
          <li>Cloudflare runs the app and stores encrypted audio (Workers, R2, Asia-Pacific).</li>
          <li>Neon stores encrypted records and sign-in accounts in Singapore (AWS ap-southeast-1).</li>
          <li>Modal runs the IPA model in the United States. It receives audio over TLS, keeps nothing, and logs no audio.</li>
          <li>Microsoft Azure Communication Services sends sign-in and access emails.</li>
        </List>
        <P>
          Some of these are outside the Philippines. We bind them to protect the data at least as well as Philippine
          law requires.
        </P>
      </Section>

      <Section id="rights" title="Your rights and your patients’ rights">
        <List>
          <li>See, correct or delete any record in the app at any time.</li>
          <li>Export everything (audio, IPA, notes) as a ZIP from Settings, even offline.</li>
          <li>Delete your account: we erase audio, records and keys. Without the key, backups can&apos;t be read.</li>
        </List>
        <P>
          Patients or guardians should contact their SLP first. You can also reach our data protection officer at{" "}
          <Mail to={DPO_EMAIL} />, or complain to the <A href="https://privacy.gov.ph">National Privacy Commission</A>.
        </P>
      </Section>

      <Section id="breach" title="If something goes wrong">
        <P>
          If a breach puts personal data at risk, we will notify affected users and the National Privacy Commission
          within 72 hours of finding out, as NPC Circular 16-03 requires.
        </P>
      </Section>

      <Section id="changes" title="Changes">
        <P>We&apos;ll update the date at the top and email you before any change that affects how patient data is handled.</P>
      </Section>

      <Section id="contact" title="Contact">
        <P>
          Data protection officer: <Mail to={DPO_EMAIL} />. Everything else: <Mail />.
        </P>
      </Section>
    </LegalPage>
  );
}
