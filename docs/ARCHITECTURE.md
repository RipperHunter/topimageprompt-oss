# Architecture

PromptVault OSS is a Next.js App Router application. Server components read published content through Prisma, client components provide interactive browsing and editing, and route handlers enforce authentication and validation for mutations.

## Main flows

```text
Browser
  -> Next.js page or route handler
     -> authentication, authorization, validation, and rate limits
        -> Prisma
           -> SQLite in the development profile

Admin import
  -> JSON or ZIP validation
     -> image validation and Sharp processing
        -> local uploads or S3-compatible object storage
           -> Prisma record and cache revalidation
```

## Boundaries

- `app/` owns routing, rendering, handlers, and page-specific styles.
- `components/` contains shared client and server UI.
- `lib/api-security.js` centralizes body limits, input cleaning, authorization helpers, and request protections.
- `lib/seo.js` and `lib/brand.js` centralize safe URLs, structured-data serialization, and deployment identity.
- `lib/image-processor.js` validates images and selects local or object storage.
- `lib/blog-import.js` normalizes the supported blog JSON format.
- `prisma/schema.prisma` defines accounts, prompts, collections, articles, subscriptions, imports, and related records.

## Production considerations

SQLite is convenient for local evaluation. A multi-instance production deployment should use a supported shared database, persistent job storage, private object storage credentials, a strong `NEXTAUTH_SECRET`, HTTPS, backups, monitoring, and provider-specific email settings.

