# Launch Checklist

## Analytics Setup (do before first deploy)

### GA4
1. analytics.google.com → Admin → Create Property → Web → hellodk.io
2. Copy Measurement ID (G-XXXXXXXXXX)
3. CF Pages → Settings → Environment Variables → PUBLIC_GA4_ID = G-XXXXXXXXXX
4. Verify: DevTools → Network → filter "googletagmanager" — should load on production

### GoatCounter
1. goatcounter.com → Sign up (free, no CC) → code: hellodk
2. CF Pages → Environment Variables → PUBLIC_GOATCOUNTER_CODE = hellodk
3. Verify: visit goatcounter.com → first pageview registers within 60s

### Cloudflare Web Analytics
1. CF dashboard → Analytics → Web Analytics → Add site → hellodk.io
2. CF Pages auto-injects beacon — no code needed

## Comments (Giscus)
1. github.com/hellodk/hellodk.github.io → Settings → Features → Enable Discussions
2. giscus.app → enter repo → select mapping: pathname → category: General
3. Copy data-repo-id and data-category-id
4. CF Pages → Environment Variables → set PUBLIC_GISCUS_* vars
5. Verify: visit any post → Giscus iframe loads at bottom

## Newsletter (Brevo)
1. Brevo dashboard → Contacts → Forms → Create form → Embedded
2. Copy form action URL (https://sibforms.com/serve/...)
3. CF Pages → Environment Variables → PUBLIC_BREVO_FORM_URL = <url>
4. Verify: visit /newsletter → form submits to Brevo

## Cloudflare Pages Deployment
1. CF dashboard → Pages → Create application → Connect to Git
2. Select hellodk/staging.hellodk.in
3. Framework preset: Astro
4. Build command: npm run build
5. Build output directory: dist
6. Node.js version: 20
7. Add all env vars from .env.example (production values)

## DNS Setup
In Cloudflare DNS for hellodk.io:
```
CNAME  @    <project>.pages.dev   Proxied
CNAME  www  <project>.pages.dev   Proxied
```

## Domain Redirect (hellodk.in → hellodk.io)
CF dashboard → Bulk Redirects → Create Rule:
- Source: hellodk.in/*
- Target: https://hellodk.io/$1
- Status: 301
- Preserve path: ✓

## Post-Launch Verification
- [ ] hellodk.io loads with card grid of posts
- [ ] Individual post pages render correctly
- [ ] /feed.xml returns valid RSS
- [ ] /search shows Pagefind UI and returns results
- [ ] /newsletter shows Brevo form
- [ ] /about page loads
- [ ] Nav links all resolve
- [ ] Giscus comments load on post pages (if configured)
- [ ] GA4 firing in Network tab (production only)
- [ ] GoatCounter dashboard shows pageviews
- [ ] hellodk.in redirects to hellodk.io (301)
- [ ] curl -I https://hellodk.io shows security headers
