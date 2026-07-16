import { permanentRedirect } from 'next/navigation';

export default function PromptIndexPage() {
  permanentRedirect('/prompts');
}
