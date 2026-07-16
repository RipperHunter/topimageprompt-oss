# PromptVault OSS

[![CI](https://github.com/RipperHunter/topimageprompt-oss/actions/workflows/ci.yml/badge.svg)](https://github.com/RipperHunter/topimageprompt-oss/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

PromptVault OSS is a full-stack platform for publishing, organizing, and discovering AI image prompts. It combines a public prompt library with editorial collections, structured blog publishing, secure admin workflows, bulk imports, account features, and search-friendly metadata.

This repository is a fresh, sanitized open-source edition of the platform behind [topimageprompt.com](https://topimageprompt.com). It contains demo records and original SVG placeholders only. Production accounts, databases, uploads, secrets, analytics, deployment files, and private Git history are intentionally excluded.

## Features

- Searchable prompt library with model, style, aspect-ratio, popularity, and category metadata
- Prompt detail pages, crawlable topic hubs, collections, trending views, and user saves
- Blog editor with JSON batch import, SEO metadata, FAQ data, citations, internal links, and structured data
- Secure admin-only prompt and article workflows
- ZIP-based prompt imports with image validation and idempotent external IDs
- Local image storage for development and optional S3-compatible object storage
- NextAuth credentials authentication, role checks, API keys, rate limits, and security headers
- Dynamic sitemap, robots policy, Open Graph metadata, JSON-LD, and `llms.txt`
- Responsive dark interface with loading states and motion

## Technology

- Next.js 16 and React 19
- Prisma 6 with SQLite for the open-source development setup
- NextAuth 4
- Sharp image processing
- S3-compatible storage support through the AWS SDK
- ESLint and GitHub Actions

## Quick start

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/RipperHunter/topimageprompt-oss.git
cd topimageprompt-oss
cp .env.example .env
npm ci
npm run db:push
npm run db:seed
npm run dev
```

Before seeding, set a private local administrator email and a password of at least 12 characters in `.env`:

```dotenv
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="change-this-local-password"
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is created locally and is ignored by Git.

## Configuration

The essential variables are documented in [.env.example](.env.example). At minimum, set:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` when running the demo seed

Email verification uses a provider-compatible HTTPS endpoint. Set `EMAIL_API_KEY` and `EMAIL_FROM`; `EMAIL_API_URL` defaults to the Resend email endpoint.

For production, configure the `R2_*` variables for Cloudflare R2 or another S3-compatible service. Without them, uploads use `public/uploads` locally.

Brand name, domain, public URL, and social handle are configurable through `NEXT_PUBLIC_BRAND_*` variables. Update `public/llms.txt` with the deployed domain as part of production setup.

## Useful commands

```bash
npm run dev       # start the development server
npm run lint      # run ESLint
npm run build     # create a production build
npm run check     # lint and build
npm run db:push   # apply the Prisma schema locally
npm run db:seed   # load safe demo content
```

## Project structure

```text
app/          Next.js pages, route handlers, admin tools, and styles
components/   Shared navigation, cards, providers, and UI components
data/         Browser-safe demonstration records
lib/          Security, SEO, storage, import, database, and utility modules
prisma/       Schema, clean migration history, and demonstration seed
public/demo/  Original SVG artwork included with the OSS edition
docs/         Architecture and sanitization notes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the request and data flow.

## Security

Do not report vulnerabilities in a public issue. Follow [SECURITY.md](SECURITY.md). Never commit `.env` files, SQLite databases, production exports, uploads, API tokens, or session secrets.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [ROADMAP.md](ROADMAP.md) before contributing.

## License and trademarks

The source code is licensed under the [Apache License 2.0](LICENSE). Demo SVG artwork under `public/demo` is distributed under the same license.

PromptVault OSS is not affiliated with OpenAI or any image-model provider. Product and model names are trademarks of their respective owners. Example prompts do not grant rights in third-party models, services, or generated outputs.
