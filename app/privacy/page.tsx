/*
 * TEMPLATE. This Privacy Policy is plain-language boilerplate, not legal
 * advice, and it requires review by a licensed attorney before Birdsong
 * relies on it at scale.
 */
import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

const CONTACT_EMAIL = "charlie@usebirdsong.com";

export const metadata: Metadata = {
  title: "Privacy Policy · Birdsong",
  description: "How Birdsong collects, uses, and shares information from survey respondents.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 23, 2026">
      <p>
        This Privacy Policy explains how Birdsong handles information when you take part in a
        research conversation on our platform. Birdsong runs short, AI moderated interviews on
        behalf of the company that commissioned the survey (the &ldquo;sponsor&rdquo;). By taking
        part, you agree to the handling of information described here.
      </p>

      <h2>Information we collect from respondents</h2>
      <p>When you take part in a survey, we collect:</p>
      <ul>
        <li>
          <strong>Contact and profile details you provide</strong> before the interview: your name,
          your email address, and, when the sponsor asks for them, your phone number and any custom
          fields the survey defines (for example job title, organization, or a LinkedIn URL).
        </li>
        <li>
          <strong>The full interview transcript:</strong> everything you type in response to the
          questions, in your own words, along with the questions themselves.
        </li>
        <li>
          <strong>Basic technical information</strong> that is normal for any website, such as your
          IP address and browser type, used to operate the service and limit abuse.
        </li>
      </ul>

      <h2>How the interview works</h2>
      <p>
        The interview is conducted by an AI interviewer, not a live person. It asks follow up
        questions based on what you say so the conversation stays relevant. The interview is run on
        behalf of the sponsor who commissioned the survey.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>To run the interview and generate a transcript of your responses.</li>
        <li>To analyze your responses and produce derived analysis, such as summaries and scoring.</li>
        <li>To send your gift card and a copy of the report, when a gift card is offered.</li>
        <li>To operate, secure, and improve the platform.</li>
      </ul>

      <h2>How we share your information</h2>
      <p>
        <strong>With the sponsor.</strong> Your responses, including the full transcript and the
        analysis derived from it, are shared with the sponsor who commissioned the survey. The
        sponsor may use that information for their own research and business purposes. Your contact
        details are shared with the sponsor as part of your response.
      </p>
      <p>
        <strong>With service providers.</strong> We use a small number of processors to run the
        service on our behalf. The interview is conducted and analyzed using Anthropic as our AI
        processor. We also use infrastructure, database, email, and abuse prevention providers to
        host the platform, store responses, and deliver messages. These providers act on our
        instructions and are not permitted to use your information for their own purposes.
      </p>
      <p>
        We do not sell your personal information, and we do not share it for cross context
        behavioral advertising.
      </p>

      <h2>Gift card fulfillment</h2>
      <p>
        When a survey offers a gift card, we use the email address (and, if provided, other contact
        details) you gave us solely to confirm your completed response and deliver the gift card and
        report. We ask for a work email so we can verify and fulfill the reward.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        The respondent survey does not use third party advertising or cross site tracking cookies.
        It uses your browser&rsquo;s local storage to remember that you have completed a survey so
        you are not asked to repeat it. Our administrative areas use essential session cookies for
        account login.
      </p>

      <h2>Retention</h2>
      <p>
        We retain your responses, including the transcript and derived analysis, for as long as
        needed to provide the service to the sponsor and to meet our legal and operational
        obligations. You can ask us to delete your information at any time using the contact below,
        and we will honor that request unless we are required to keep it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can request access to, correction of, or deletion of your information by emailing us.
        Depending on where you live, you may have additional rights under local law.
      </p>

      <h2>Children</h2>
      <p>
        Birdsong is not directed to anyone under 18, and we do not knowingly collect information from
        people under 18.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we will revise the date at the top
        of this page.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy question or to request deletion of your information, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
