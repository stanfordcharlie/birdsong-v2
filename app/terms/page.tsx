/*
 * TEMPLATE. These Terms of Service are plain-language boilerplate, not legal
 * advice, and they require review by a licensed attorney before Birdsong
 * relies on them at scale.
 */
import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

const CONTACT_EMAIL = "charlie@usebirdsong.com";

export const metadata: Metadata = {
  title: "Terms of Service · Birdsong",
  description: "The terms that apply when you take part in a Birdsong research conversation.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 23, 2026">
      <p>
        These Terms of Service apply when you take part in a research conversation on Birdsong. By
        starting a survey, you agree to these terms. If you do not agree, please do not take part.
      </p>

      <h2>What Birdsong is</h2>
      <p>
        Birdsong runs short, AI moderated research interviews on behalf of the company that
        commissioned the survey (the &ldquo;sponsor&rdquo;). The interview is conducted by an AI
        interviewer, and your responses are shared with the sponsor. How we handle your information
        is described in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 18 years old to take part. By starting a survey, you confirm that you
        are 18 or older.
      </p>

      <h2>Incentives and gift cards</h2>
      <ul>
        <li>
          When a survey offers a gift card, it is issued for a completed, good faith response to the
          interview.
        </li>
        <li>
          Eligibility is limited to one gift card per person per survey. Fraudulent, automated,
          duplicate, or bad faith submissions void eligibility, and we may withhold or reverse a
          reward in those cases.
        </li>
        <li>
          We use the email address you provide to deliver the gift card, which typically arrives
          within a day or two of completion. We may ask for a work email to verify your response.
        </li>
        <li>
          Gift cards have no cash value beyond the stated amount and are subject to the terms of the
          issuer.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>Answer honestly and in your own words.</li>
        <li>
          Do not submit responses through bots, scripts, or other automated means, and do not
          attempt more than one response to the same survey.
        </li>
        <li>Do not impersonate another person or misrepresent your identity or affiliation.</li>
        <li>
          Do not submit unlawful, infringing, or harmful content, and do not attempt to disrupt or
          probe the security of the platform.
        </li>
      </ul>

      <h2>No guarantee</h2>
      <p>
        The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis,
        without warranties of any kind, whether express or implied. We do not guarantee that the
        service will be uninterrupted or error free. Nothing in a Birdsong interview is professional
        advice.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Birdsong will not be liable for any indirect,
        incidental, or consequential damages arising from your use of the platform or your
        participation in a survey.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of California, without regard to its
        conflict of laws rules. (Placeholder, subject to attorney review.)
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we do, we will revise the date at the top
        of this page.
      </p>

      <h2>Contact</h2>
      <p>
        If you have any question about these terms, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
