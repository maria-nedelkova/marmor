# Deployment

Marmor deploys as a static site — the build output (`dist/`) is plain HTML/
CSS/JS with no server-side code, so any static host works. These notes are
written for [Vercel](https://vercel.com), since that's what this repo is
configured for.

## Build configuration

`vercel.json` in the repo root already declares everything Vercel needs:

```json
{
  "framework": null,
  "installCommand": "bun install",
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/index-(.*)\\.(js|css)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- `framework: null` — Vercel doesn't need to guess/auto-detect a framework;
  Bun's bundler output is treated as a plain static build.
- `bun run build` runs `bun run tailwind:build && bun build ./index.html
  --outdir dist --minify` (see `package.json`), producing hashed,
  cache-busted filenames — hence the long-lived immutable cache header on
  `index-*.js`/`index-*.css`. `index.html` itself is **not** matched by that
  header, so it's always revalidated and will always point at the current
  hashed bundle.

## First-time setup

1. Push the repo to GitHub (Vercel deploys from a git remote).
2. In the Vercel dashboard: **Add New… → Project**, import the GitHub repo.
3. Vercel reads `vercel.json` automatically — no manual build settings
   needed. Confirm the install/build/output fields match the JSON above if
   asked.
4. Deploy. Every push to the default branch triggers a new production
   deploy; every other branch/PR gets its own preview URL automatically.

## Custom domain

1. In the project's **Settings → Domains**, add the domain you own.
2. Vercel shows the DNS records it needs (typically an `A` record pointing
   at Vercel's IP for an apex domain, or a `CNAME` pointing at
   `cname.vercel-dns.com` for a subdomain like `www`).
3. Add those records at your domain registrar/DNS provider. Propagation can
   take anywhere from a few minutes to a few hours.
4. Vercel auto-provisions and renews an SSL certificate for the domain once
   DNS verification succeeds — no manual certificate management.

## Local sanity check before deploying

```
bun run build
bun run start   # serves dist/ locally via `bun run dist/index.html`
```

Confirms the production build actually works (as opposed to just the dev
server) before pushing — the dev server (`bun run dev`) skips minification
and uses different module resolution, so it's not a perfect stand-in for
what Vercel will actually serve.
