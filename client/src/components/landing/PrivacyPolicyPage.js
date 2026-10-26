import React from 'react';
import { Link } from 'react-router-dom';

// Public page (no login). Google's OAuth verification checks this URL, so the Google sections must stay in
// step with what the app actually requests (see server/services/googleAccount.js OAUTH_SCOPES).
const EFFECTIVE = '22 October 2026';
const CONTACT = 'info@codigixinfotech.com';

const Section = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="mt-3 space-y-3 text-slate-700 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/"><img src="/codigix-logo.png" alt="Codigix" className="h-8 object-contain" /></Link>
        <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-red-600">Sign in</Link>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Codigix CRM · Effective {EFFECTIVE}</p>
      <p className="mt-6 text-slate-700 leading-relaxed">
        This policy explains how Codigix Infotech Pvt. Ltd. ("Codigix", "we") collects, uses, stores and protects
        information in Codigix CRM (allinonecrm.codigixinfotech.com), a business platform for tasks, projects, sales
        and meetings that Codigix offers to businesses and their teams. It applies to every person who uses Codigix CRM.
      </p>

      <Section title="Information we collect">
        <p><strong>Account information:</strong> name, work email, department, role and the password you sign in with (stored only as a secure hash).</p>
        <p><strong>Work records:</strong> the tasks, projects, meetings, notes, leads, quotations and other business records you and your team create in the platform.</p>
        <p><strong>Google account data</strong>, only if you choose "Connect my Google account", as described below.</p>
      </Section>

      <Section title="Google account data and how we use it">
        <p>Connecting Google is optional. When you connect, Google asks you to approve these permissions, and we use each one only for the purpose shown:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Your email address and basic profile (openid, email):</strong> to show which Google account is connected.</li>
          <li><strong>Google Calendar events (calendar.events):</strong> to create, update and cancel the calendar event for a meeting you schedule in Codigix CRM, with its Google Meet link and invitations to the attendees you choose. We do not read or change other events in your calendar.</li>
          <li><strong>Google Meet spaces created by this app (meetings.space.created):</strong> to add the meeting host as a co-host of a Meet that this app created.</li>
          <li><strong>Send email on your behalf (gmail.send):</strong> to send the emails you trigger in Codigix CRM (for example a task assignment, a quotation or a proposal) from your own Gmail address. We cannot read, search or delete the emails in your mailbox.</li>
        </ul>
        <p>We store an encrypted Google access token (AES-256-GCM) so these actions work without asking you to sign in each time, and we store the calendar event ID and Meet link with the meeting record.</p>
        <p>
          Codigix CRM's use and transfer to any other app of information received from Google APIs will adhere to
          the <a className="text-red-600 underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>,
          including the Limited Use requirements. Google user data is used only to provide the features above. It is
          not used for advertising, not sold, not used to train AI or machine-learning models, and not read by people
          except with your permission, for security purposes, or where the law requires it.
        </p>
      </Section>

      <Section title="How we share information">
        <p>Records you create are visible to the members and managers of your own team's workspace who work with them, never to other customers. We do not sell personal data. We share data only with the service providers needed to run the platform (hosting, email delivery, and Google for the features you connect), or when the law requires it.</p>
      </Section>

      <Section title="Storage, security and retention">
        <p>Data is stored on secured servers. Access is limited to authorised staff, connections use HTTPS, and Google tokens are encrypted at rest. We keep work records for as long as your team uses the platform. A Google connection is kept until you disconnect it.</p>
      </Section>

      <Section title="Your choices and removing Google access">
        <ul className="list-disc pl-6 space-y-2">
          <li>Click <strong>Disconnect</strong> on the Meetings page: we revoke the Google token and delete it from our servers.</li>
          <li>Or remove "Codigix CRM" at <a className="text-red-600 underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.</li>
          <li>To access, correct or delete your personal data, email us at <a className="text-red-600 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</li>
        </ul>
      </Section>

      <Section title="Changes to this policy">
        <p>If we change how we use Google user data, we will update this page and ask for your consent again before using the data in a new way.</p>
      </Section>

      <Section title="Contact">
        <p>Codigix Infotech Pvt. Ltd., Office 514, Bramha Sky Uzuri, Pimpri Chowk, Pimpri, Pune 411018, India<br />
          Email: <a className="text-red-600 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </Section>
    </main>

    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-sm text-slate-500 flex flex-wrap gap-4 justify-between">
        <span>© {new Date().getFullYear()} Codigix Infotech Pvt. Ltd.</span>
        <Link to="/" className="hover:text-red-600">Home</Link>
      </div>
    </footer>
  </div>
);

export default PrivacyPolicyPage;
