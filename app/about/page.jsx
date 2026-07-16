import Link from 'next/link';

export const dynamic = 'force-static';

export const metadata = {
  title: 'About topimageprompt | Transparent AI Prompt Library',
  description: 'Learn how topimageprompt organizes transparent, copy-ready AI image prompts and practical prompt-engineering guidance.',
  alternates: { canonical: '/about' },
  openGraph: { title: 'About topimageprompt', description: 'A transparent library of AI image prompts and examples.', url: '/about' },
};

export default function AboutPage() {
  return (
    <main className="container legal-page">
      <div className="legal-header"><h1>About topimageprompt</h1><p>A transparent AI image prompt library.</p></div>
      <div className="legal-content">
        <h2>What we publish</h2>
        <p>topimageprompt pairs AI-generated example images with the prompt text, model, style, and aspect ratio used to create them. The goal is to help creators learn from concrete examples and build better prompts without guesswork.</p>

        <h2>How to use the library</h2>
        <p>Browse by <Link href="/prompts">model or visual style</Link>, open an example, copy the full prompt, and adapt it to your subject and generator. Results vary as models and versions change, so prompt pages identify the relevant generation context whenever it is available.</p>

        <h2>Editorial approach</h2>
        <p>Guides are written to answer a specific creative problem. We aim to show reproducible examples, disclose relevant tools and assumptions, link to primary sources, and update material when the underlying products change.</p>

        <p style={{ marginTop: '36px' }}><Link href="/explore" className="btn-black" style={{ padding: '12px 24px', textDecoration: 'none', borderRadius: '999px' }}>Explore prompts</Link></p>
      </div>
    </main>
  );
}
