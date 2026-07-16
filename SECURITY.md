# Security policy

## Supported version

Security fixes are applied to the latest release and the `main` branch.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue.

Use GitHub's private vulnerability reporting feature on this repository. Include the affected route or component, reproduction steps, impact, and any suggested mitigation. Please do not access data that does not belong to you, disrupt a live service, or perform destructive testing.

The maintainer will acknowledge a complete report as soon as practical, investigate it, and coordinate disclosure after a fix is available.

## Secrets and private data

The project must never receive real passwords, API keys, session secrets, production databases, private uploads, email lists, analytics exports, or access tokens. Use `.env.example`, synthetic records, and the included SVG demo assets.

