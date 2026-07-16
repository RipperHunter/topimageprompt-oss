import 'server-only';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function sendTransactionalEmail({ to, subject, html }) {
  const apiUrl = process.env.EMAIL_API_URL?.trim() || 'https://api.resend.com/emails';
  const apiKey = required('EMAIL_API_KEY');
  const from = required('EMAIL_FROM');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Email provider rejected the request (${response.status}): ${detail}`);
  }
}

