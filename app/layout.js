import "./globals.css";
import "./explore.css";
import "./admin.css";
import "./auth.css";
import "./blog.css";
import ConditionalLayout from "../components/ConditionalLayout";
import Providers from "../components/Providers";
import PageTracker from "../components/PageTracker";
import { BRAND_FAVICON, BRAND_HANDLE, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import { getPublicNavigationData } from "@/lib/public-data";
import { safeJsonLd } from "@/lib/seo";

// Revalidate all pages using this layout every 3600 seconds (1 hour) for SSG/ISR caching
export const revalidate = 3600;

export const metadata = {
  metadataBase: new URL(BRAND_URL),
  title: `${BRAND_NAME} | Browse the image. Steal the prompt.`,
  description: "Search thousands of AI-generated images and copy the exact prompt behind each one. Free. Instant. Yours.",
  icons: {
    icon: BRAND_FAVICON,
    shortcut: BRAND_FAVICON,
    apple: BRAND_FAVICON,
  },
  openGraph: {
    title: `${BRAND_NAME} | The Premier AI Prompt Library`,
    description: 'Search thousands of AI-generated images and copy the exact prompt behind each one.',
    url: BRAND_URL,
    siteName: BRAND_NAME,
    images: [
      {
        url: '/demo/abstract.svg',
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} Cyberpunk Neon Cover`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} | Steal The Prompt`,
    description: 'Browse the image. Steal the prompt. Free AI Prompt Library.',
    creator: `@${BRAND_HANDLE}`,
    images: ['/demo/cyber.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": BRAND_NAME,
      "url": BRAND_URL,
      "logo": `${BRAND_URL}${BRAND_FAVICON}`
    },
    {
      "@type": "WebSite",
      "name": BRAND_NAME,
      "url": BRAND_URL,
      "description": "Browse AI-generated images and copy the exact prompts that created them. Free. Instant.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BRAND_URL}/explore?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

export default async function RootLayout({ children }) {
  const navigationData = await getPublicNavigationData();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initializer - prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SLMK4S8MHZ" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SLMK4S8MHZ');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgSchema) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <PageTracker />
          <ConditionalLayout navigationData={navigationData}>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
