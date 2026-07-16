import React from 'react';
import ContactClient from '../../components/ContactClient';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Contact topimageprompt | Support and Partnerships',
  description: 'Contact topimageprompt for support, partnerships, feedback, and AI prompt library questions.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact topimageprompt',
    description: 'Reach the topimageprompt team for support and partnerships.',
    url: '/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
