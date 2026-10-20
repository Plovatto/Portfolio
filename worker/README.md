# Contact Worker

Cloudflare Worker behind the portfolio's contact form. The site is static, so this is the only
code that runs on a server.

For each `POST`, it:

1. accepts only the origins in `ALLOWED_ORIGINS`;
2. rejects bodies over 10 KB and invalid fields (name ≤ 100, valid e-mail, message ≤ 5000);
3. drops messages that fill the honeypot field, answering "ok" so bots learn nothing;
4. verifies the Turnstile token with Cloudflare (single use, bound to the visitor's IP);
5. sends a plain-text e-mail through Resend to the fixed `CONTACT_TO`, replying to the visitor.

Secrets never live in the repository or in the site.

## Setup

```bash
cd worker
npm install
npx wrangler login                        # opens the browser
npx wrangler secret put TURNSTILE_SECRET  # from the Turnstile site in the Cloudflare dashboard
npx wrangler secret put RESEND_API_KEY    # from resend.com → API Keys
npx wrangler secret put CONTACT_TO        # the address that receives the messages
npm run deploy                            # prints the Worker URL
```

Then set `VITE_CONTACT_ENDPOINT` (the Worker URL) and `VITE_TURNSTILE_SITE_KEY` (the public
Turnstile key) for the site build.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, run `npm run dev` (serves on `http://localhost:8787`) and
point the site's `.env.local` at it. The Turnstile test keys in the examples always pass.

## Scripts

| Command             | Description             |
| ------------------- | ----------------------- |
| `npm run dev`       | Runs the Worker locally |
| `npm run deploy`    | Deploys to Cloudflare   |
| `npm test`          | Runs the unit tests     |
| `npm run typecheck` | Type-checks the Worker  |
