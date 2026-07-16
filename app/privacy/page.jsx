import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How topimageprompt collects, uses, protects, and retains account and usage data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="container legal-page">
      <div className="legal-header"><h1>Privacy Policy</h1><p>Last updated: July 15, 2026</p></div>
      <div className="legal-content">
        <p>This policy explains the information topimageprompt processes when you browse the site, create an account, save a prompt, subscribe, or contact us.</p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>Account details such as email address, profile name, avatar, authentication provider, and password hash when credentials login is used.</li>
          <li>Actions such as prompt views, copies, and saves, plus basic request and analytics information.</li>
          <li>Messages and newsletter subscription details you choose to submit.</li>
          <li>Essential cookies and local preferences needed for login, security, and display settings.</li>
        </ul>

        <h2>2. How we use information</h2>
        <p>We use this information to operate accounts and saved collections, secure the service, understand feature usage, respond to requests, and improve prompt discovery. We do not sell personal information.</p>

        <h2>3. Service providers and retention</h2>
        <p>Hosting, authentication, email, storage, and analytics providers may process limited data for us. We retain information only as long as reasonably needed for the service, security, legal obligations, and dispute resolution.</p>

        <h2>4. Your choices</h2>
        <p>You may update profile settings, unsubscribe from email, revoke API keys, or request account/data deletion. Some security and legal records may need to be retained.</p>

        <h2>5. Contact</h2>
        <p>Use the <Link href="/contact">contact page</Link> for privacy questions.</p>
      </div>
    </main>
  );
}
