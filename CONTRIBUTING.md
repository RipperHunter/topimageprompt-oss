# Contributing

Thank you for improving PromptVault OSS.

## Before opening work

1. Search existing issues and discussions.
2. Open an issue for significant features, schema changes, authentication changes, or new dependencies.
3. Keep pull requests focused and avoid unrelated formatting rewrites.
4. Never include production data, private images, credentials, tokens, analytics exports, or generated databases.

## Development

```bash
cp .env.example .env
npm ci
npm run db:push
npm run db:seed
npm run dev
```

Run the same checks used by CI before submitting:

```bash
npm run lint
npm run build
```

## Pull requests

- Explain the user-facing problem and the chosen solution.
- Include screenshots for visible interface changes.
- Add or update documentation when configuration or behavior changes.
- Call out schema migrations and security-sensitive changes.
- Confirm that demo data is synthetic and that secret scanning was performed.
- Keep accessible labels, keyboard behavior, reduced-motion support, and responsive layouts intact.

Contributions are licensed under Apache-2.0 when merged.

