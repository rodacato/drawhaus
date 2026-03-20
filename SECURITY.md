# Security Policy

## Supported Versions

Only the latest released version receives security patches. See [CHANGELOG.md](CHANGELOG.md) for the current version.

## Reporting a Vulnerability

If you discover a security vulnerability in Drawhaus, please report it responsibly.

**Do NOT open a public issue.** Instead:

1. Send an email to **security@drawhaus.dev** with:
   - A description of the vulnerability.
   - Steps to reproduce it.
   - The potential impact.
   - Any suggested fix (optional).

2. You will receive an acknowledgment within **48 hours**.

3. We will work with you to understand and resolve the issue before any public disclosure.

## Disclosure Timeline

- **0 days**: Vulnerability reported.
- **48 hours**: Acknowledgment sent to reporter.
- **7 days**: Initial assessment and fix development.
- **30 days**: Fix released and advisory published (if applicable).

We ask that you give us reasonable time to address the issue before disclosing it publicly.

## Security Best Practices for Self-Hosting

Since Drawhaus is a self-hosted application, operators should:

- **Keep dependencies updated**: Run `npm audit` regularly and apply patches.
- **Use HTTPS**: Always deploy behind a reverse proxy with TLS enabled.
- **Restrict network access**: Limit exposure of the backend API and database ports.
- **Set strong secrets**: Use strong, unique values for session secrets and API keys in your `.env` configuration.
- **Enable authentication**: Do not expose Drawhaus without Google OAuth or another auth layer configured.
- **Back up your data**: Regularly back up your database and Google Drive sync data.

## Scope

The following are **in scope** for security reports:

- Authentication and authorization bypasses.
- Injection vulnerabilities (SQL, NoSQL, query injection).
- Cross-site scripting (XSS) and cross-site request forgery (CSRF).
- Insecure data exposure.
- Server-side request forgery (SSRF).

The following are **out of scope**:

- Vulnerabilities in third-party dependencies (report these upstream).
- Denial-of-service attacks.
- Social engineering.
- Issues that require physical access to the server.

## Acknowledgments

We appreciate the security research community and will credit reporters (with permission) in our release notes.
