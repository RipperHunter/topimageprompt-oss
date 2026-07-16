import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms governing accounts, prompt use, developer API access, and content on topimageprompt.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="container legal-page">
      <div className="legal-header"><h1>Terms of Service</h1><p>Last updated: July 15, 2026</p></div>
      <div className="legal-content">
        <p>By accessing topimageprompt, you agree to these terms. If you do not agree, do not use the service.</p>

        <h2 id="prompt-license">1. Prompt license and image rights</h2>
        <p>Unless a prompt page says otherwise, you receive a non-exclusive, worldwide, royalty-free license to copy, modify, and use the prompt text, including in commercial projects.</p>
        <p>Example images may be generated with third-party AI tools or supplied by contributors. We do not grant rights that we do not own. Your use of an AI generator and its output remains subject to that provider&apos;s terms and applicable law.</p>

        <h2>2. API and automated access</h2>
        <p>API users must protect their keys, respect the stated rate limits, and must not use the service to disrupt, scrape, clone, or republish the library as a competing database.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for activity performed through your account and for keeping credentials secure. Contact us promptly if you believe an account or API key has been compromised.</p>

        <h2>4. Availability and accuracy</h2>
        <p>The service and its content are provided as available. Prompt results vary by model, version, settings, and provider. We may update or remove content and features.</p>

        <h2>5. Contact</h2>
        <p>Questions about these terms can be sent through the <Link href="/contact">contact page</Link>.</p>
      </div>
    </main>
  );
}
