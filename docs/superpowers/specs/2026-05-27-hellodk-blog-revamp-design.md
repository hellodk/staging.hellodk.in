# hellodk.io Blog Revamp — Design Spec

**Date:** 2026-05-27  
**Author:** Deepak Gupta (hellodk)  
**Status:** Approved — ready for implementation planning

---

## 1. Goals

| Goal | Detail |
|------|--------|
| Personal brand / authority | Establish hellodk as a known DevOps/SRE voice |
| Product/SaaS promotion | Blog as marketing channel for kri fleet platform and future tools |
| Monetization | Ads, sponsorships, affiliate links over time |
| Portfolio + community | Newsletter, Substack, Giscus comments, RSS following |

---

## 2. Current State Problems

| # | Issue | Severity |
|---|-------|----------|
| 1 | UA-84547172-1 (Universal Analytics) sunset July 2023 — zero data collected for 2 years | Critical |
| 2 | Jekyll 3.x — no component model, no MDX, 2015-era DX | High |
| 3 | jQuery 1.11.3 — known XSS vulnerabilities | High |
| 4 | Gemfile.lock deleted — unlocked dependencies, supply chain risk | High |
| 5 | No comments, no newsletter, no search | High |
| 6 | GitHub Pages — 100GB/month bandwidth cap, Jekyll-only, no preview branches | Medium |
| 7 | Stale AdSense code — old format, no HTTPS prefix | Medium |
| 8 | Hardcoded `<link rel="next" href="page2/">` in head.html | Medium |
| 9 | Template leftover in LD+JSON: `"publisher": "Finding The Way Home head.html"` | Medium |
| 10 | `.DS_Store` committed, no `.gitignore` | Low |
| 11 | No security headers (CSP, X-Frame-Options, HSTS) | Low |

---

## 3. Target Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Astro 5** | Modern SSG, component islands, MDX, first-class CF Pages support |
| Styling | **Tailwind CSS v4** | Utility-first, pairs with Astro natively |
| Hosting | **Cloudflare Pages** | Free, unlimited bandwidth, 330+ PoPs, preview branches, security headers |
| Analytics 1 | **GA4 (gtag.js)** | Replaces dead UA, standard tracking |
| Analytics 2 | **Cloudflare Web Analytics** | Privacy-first, cookieless, free on CF Pages |
| Analytics 3 | **GoatCounter** | Lightweight third source, free for personal sites |
| Comments | **Giscus** | GitHub Discussions, free, no CC, interactive |
| Newsletter | **Brevo embed form** | User has existing Brevo account |
| Newsletter cross-post | **Substack** | Cross-post long-form, link from every post |
| Search | **Pagefind** | Static, runs in browser, zero infra, free |
| Syntax highlighting | **Shiki** | Astro built-in, replaces Pygments |
| OG images | **Satori / @vercel/og** | Auto-generated per post at build time |

---

## 4. Domains

- **hellodk.io** — canonical primary domain
- **hellodk.in** — redirects to hellodk.io (Cloudflare redirect rule)
- Both point to Cloudflare Pages deployment
- Old `staging.hellodk.in` repo becomes the new Astro repo (same Git, new build system)
- Cloudflare Pages preview branches replace the old staging workflow

---

## 5. Visual Design

**Aesthetic:** Jasper2 / Ghost Casper — dark moody home, clean white articles.

### 5.1 Home Page Layout

```
┌─────────────────────────────────────────────────────┐
│  [hellodk] nav links              RSS  Search  GH   │  dark nav bar, sticky
├─────────────────────────────────────────────────────┤
│                                                     │
│       Curiosity is the most powerful thing you own  │
│           Deepak Gupta · DevOps · SRE · Homelab    │  dark hero, blurred bg
│           [GitHub] [Substack] [RSS]                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [cover]        [cover]        [cover]              │
│  Post Title     Post Title     Post Title           │  2–3 col card grid
│  date · Nmin    date · Nmin    date · Nmin          │
│                                                     │
│  [cover]        [cover]                             │
│  ...            ...                                 │
│                                                     │
│              [← Older]  [Newer →]                   │
└─────────────────────────────────────────────────────┘
```

### 5.2 Post Page Layout (full-width, no sidebar)

```
┌─────────────────────────────────────────────────────┐
│  ← All Posts                       [hellodk] nav    │
├─────────────────────────────────────────────────────┤
│  [Full-bleed cover image]                           │
├─────────────────────────────────────────────────────┤
│       Post Title — large, centered                  │
│       Author · Date · Reading time · [tags]         │
│                                                     │
│  Article body — clean, wide reading column          │
│  Code blocks — Shiki dark theme, copy button        │
│  Callout boxes — green tip, orange warning          │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ 📬 Get the next post in your inbox        │      │  Brevo embed
│  │ [email]              [Subscribe]          │      │
│  │ Or follow on Substack →                  │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  [Share: Twitter · LinkedIn · Copy link]            │
│                                                     │
│  💬 Comments via Giscus (GitHub Discussions)        │
│                                                     │
├─────────────────────────────────────────────────────┤
│  dark bg — Related Posts grid (2–3 cards)           │
└─────────────────────────────────────────────────────┘
```

### 5.3 Additional Pages

| Page | Path | Notes |
|------|------|-------|
| Blog list | `/` | Home — paginated card grid |
| Single post | `/[slug]` | Full-width article |
| Tag filtered | `/tag/[tag]` | Same card grid, filtered |
| About | `/about` | Personal page, updated content |
| Newsletter | `/newsletter` | Brevo form + Substack embed |
| Search | `/search` | Pagefind modal (also CMD+K) |
| 404 | `/404` | Custom error page |

### 5.4 Color Tokens

```css
/* Dark mode (default — matches Jasper2) */
--bg-hero:   #0D0D0D;   /* hero, nav, card grid bg */
--bg-post:   #FFFFFF;   /* article reading area */
--text-hero: #FFFFFF;
--text-body: #111827;
--accent:    #E5645E;   /* Ghost/Casper signature warm red */
--muted:     #9BA3AF;
--border:    #2D2D2D;

/* Card covers: full-bleed image, no color overlay needed */
```

---

## 6. Content Migration Plan

### 6.1 Tiers

| Tier | Source | Action | Count |
|------|--------|--------|-------|
| **Publish immediately** | `/home/dk/Documents/blogs/*.html` and `*.md` | Convert to Astro MDX, publish | 11 posts |
| **Migrate + keep** | `_posts/*.html` and `*.md` | Convert frontmatter, clean HTML → Markdown | 11 posts |
| **Review + select** | `_drafts/` 2017–2020 DevOps/SRE content | Pick best ~15, convert | ~15 posts |
| **Archive** | `_drafts/` 2014–2015 placeholder/template posts | Exclude from build, keep in git | ~25 posts |

### 6.2 Frontmatter Standard (new)

```yaml
---
title: "Post Title Here"
date: 2026-05-23
updated: 2026-05-27        # optional
tags: [linux, ubuntu, debugging]
description: "1–2 sentence SEO description shown on cards and in meta"
cover: /images/posts/slug-name.jpg   # optional — fallback gradient if missing
draft: false
---
```

### 6.3 The Migration as a Blog Series

| Post | Title |
|------|-------|
| 1 | *"Why I moved hellodk.io from Jekyll to Astro + Cloudflare Pages"* |
| 2 | *"Two years of dark: from Universal Analytics to GA4 + Cloudflare"* |
| 3 | *"Rebuilding my blog in public — content audit and what I kept"* |

---

## 7. Analytics Setup

### 7.1 GA4 (replaces dead UA)

- Property: create new GA4 property in Google Analytics
- Implementation: `gtag.js` in Astro `<head>` via layout component
- Config key: `site.googleAnalyticsId` in `astro.config.mjs`
- Conditional: only loads in production (`import.meta.env.PROD`)

### 7.2 Cloudflare Web Analytics

- Enable in Cloudflare Pages project settings (one click)
- Zero-JS, cookieless, GDPR-safe
- No config needed beyond enabling

### 7.3 GoatCounter

- Register at goatcounter.com (free, no CC)
- Add `<script>` tag via Astro layout
- Gives a third independent data source

---

## 8. Interactive Features

### 8.1 Giscus Comments

- GitHub Discussions on `hellodk/hellodk.github.io` repo
- Enable Discussions in repo settings
- Configure at giscus.app — generates a `<script>` tag
- Rendered as Astro island (client-side, lazy-loaded)
- Requires GitHub login to comment — filters spam

### 8.2 Brevo Newsletter

- Embed Brevo-generated form code in:
  - End of every post (before comments)
  - Dedicated `/newsletter` page
- Form captures email → Brevo list → user sends newsletters manually
- Substack link always adjacent: "Or follow on Substack →"

### 8.3 Pagefind Search

- Runs `pagefind` as a post-build step: `astro build && pagefind --site dist`
- Indexes all post content at build time
- CMD+K modal using Pagefind UI component
- Zero server, zero cost

---

## 9. Hosting & Deployment

### 9.1 Cloudflare Pages Setup

```
Repository:  github.com/hellodk/staging.hellodk.in (renamed or new)
Branch:      master → production
Build cmd:   astro build && pagefind --site dist
Output dir:  dist
Node ver:    20
```

### 9.2 Security Headers (`_headers` file)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://gc.zgo.at https://giscus.app; frame-src https://giscus.app; connect-src 'self' https://api.brevo.com
```

### 9.3 Redirects (`_redirects` file)

```
# hellodk.in → hellodk.io (handled via Cloudflare domain redirect rules)
/rss.xml    /feed.xml    301
/atom.xml   /feed.xml    301
/tag/*      /tag/:splat  200
```

### 9.4 Preview Branches

Every `git push` to a non-master branch gets a unique preview URL from Cloudflare Pages. This replaces the old `staging.hellodk.in` staging workflow entirely.

---

## 10. GitHub Pages → Cloudflare Pages Migration

| Step | Action |
|------|--------|
| 1 | Create Cloudflare Pages project, connect GitHub repo |
| 2 | Set custom domains: hellodk.io (primary), hellodk.in (redirect) |
| 3 | Add redirect rule: hellodk.in → hellodk.io |
| 4 | Remove GitHub Pages CNAME and settings from repo |
| 5 | Fix CNAME file (currently malformed with `https://` prefix) |
| 6 | Add `.gitignore` — exclude `.DS_Store`, `_site/`, `dist/`, `node_modules/` |

---

## 11. Enhancements Over Jasper2

| Feature | Jasper2 | New hellodk.io |
|---------|---------|----------------|
| Cover images on cards | ✅ | ✅ |
| Dark card grid home | ✅ | ✅ |
| Full-width post, no sidebar | ✅ | ✅ |
| Newsletter embed | Basic Ghost | **Brevo form + Substack link** |
| Comments | None | **Giscus (GitHub Discussions)** |
| Search | None | **Pagefind CMD+K modal** |
| Analytics | None | **GA4 + CF Analytics + GoatCounter** |
| Reading time | None | **On every card and post header** |
| Dark/light toggle | Dark only | **Both, persisted via localStorage** |
| Auto OG images | None | **Satori — generated at build time** |
| Tags filtered view | Basic | **Card grid filtered by tag** |
| Security headers | None | **Full `_headers` file on CF Pages** |
| RSS + Sitemap | Basic | **Astro-generated, complete** |
| Preview branches | None (staging repo) | **CF Pages per-branch previews** |

---

## 12. Out of Scope (this phase)

- Paid memberships / paywalled content
- Ghost CMS self-hosted (reconsidered if Astro proves limiting)
- Custom Cloudflare Worker functions
- Multilingual support
- E-commerce / product sales pages (future phase)
