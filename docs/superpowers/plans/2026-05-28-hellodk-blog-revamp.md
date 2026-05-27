# hellodk.io Blog Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate hellodk.io from a dead Jekyll 3 + GitHub Pages stack to Astro 5 + Cloudflare Pages with a custom Jasper2/Ghost Casper aesthetic, GA4 analytics, Giscus comments, Brevo newsletter, and Pagefind search.

**Architecture:** Astro 5 static site with content collections for type-safe blog posts. All interactivity (comments, search, newsletter) is layered on top of a fully static build — zero server required. Deployed to Cloudflare Pages with automatic previews per branch.

**Tech Stack:** Astro 5, Tailwind CSS v4, TypeScript, Cloudflare Pages, GA4 (gtag.js), Cloudflare Web Analytics, GoatCounter, Giscus, Brevo, Pagefind

**Design spec:** `docs/superpowers/specs/2026-05-27-hellodk-blog-revamp-design.md`

---

## Phase 1 — Scaffold & Repo Cleanup

### Task 1: Initialize Astro 5 project in existing repo

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/env.d.ts`

- [ ] **Step 1.1: Back up the existing Jekyll files**

```bash
cd /home/dk/Documents/git/staging.hellodk.in
git checkout -b feat/astro-migration
mkdir -p _jekyll-backup
cp -r _posts _drafts _layouts _includes _sass css _config.yml Gemfile about.md index.html feed.xml _jekyll-backup/
git add _jekyll-backup/
git commit -m "chore: backup Jekyll source before Astro migration"
```

- [ ] **Step 1.2: Initialize Astro 5 with minimal template**

```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git
```

Expected: Astro writes `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`. Confirm overwrite prompts with `y`.

- [ ] **Step 1.3: Add Tailwind v4 and Astro integrations**

```bash
npm install
npx astro add tailwind --yes
npx astro add sitemap --yes
```

Expected output ends with: `✔ Configuration up-to-date.`

- [ ] **Step 1.4: Replace `astro.config.mjs` with full config**

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hellodk.io',
  integrations: [tailwind(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: false,
    },
  },
});
```

- [ ] **Step 1.5: Replace `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@styles/*": ["src/styles/*"]
    }
  }
}
```

- [ ] **Step 1.6: Write `.gitignore`**

```
node_modules/
dist/
.astro/
_site/
*.DS_Store
.env
.env.*
!.env.example
.playwright-mcp/
*.png
*.jpg
!public/images/**
Gemfile.lock-bak
modernized_blog/
```

- [ ] **Step 1.7: Verify Astro starts**

```bash
npm run dev
```

Expected: `🚀 astro dev server running at http://localhost:4321/`
Visit http://localhost:4321 — blank page is fine.

- [ ] **Step 1.8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore src/env.d.ts
git commit -m "feat: scaffold Astro 5 + Tailwind v4 project"
```

---

### Task 2: Content collection schema

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/blog/.gitkeep`

- [ ] **Step 2.1: Install Zod (bundled with Astro but verify)**

```bash
npm ls zod
```

Expected: `zod@3.x.x` appears in tree (Astro bundles it).

- [ ] **Step 2.2: Write content collection schema**

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2.3: Create placeholder post to validate schema**

```bash
mkdir -p src/content/blog
```

```markdown
---
title: "Test Post"
date: 2026-05-28
description: "Schema validation post"
tags: [test]
draft: true
---

Hello world.
```
Save as `src/content/blog/test-post.md`.

- [ ] **Step 2.4: Run type check**

```bash
npx astro check
```

Expected: `Found 0 errors.`

- [ ] **Step 2.5: Commit**

```bash
git add src/content/
git commit -m "feat: add blog content collection schema with Zod"
```

---

### Task 3: Global styles and design tokens

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 3.1: Write global CSS with Jasper2 design tokens**

```css
/* src/styles/global.css */
@import "tailwindcss";

:root {
  /* Jasper2 / Ghost Casper palette */
  --color-bg-dark:    #111111;
  --color-bg-card:    #1a1a1a;
  --color-bg-post:    #ffffff;
  --color-text-dark:  #ffffff;
  --color-text-post:  #1a1a1a;
  --color-text-muted: #9ba3af;
  --color-accent:     #e5645e;
  --color-border:     #2d2d2d;
  --color-tag-bg:     #2a2a2a;
  --color-tag-text:   #e5645e;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-size: 16px;
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg-dark);
  color: var(--color-text-dark);
  line-height: 1.7;
}

/* Post reading area overrides */
.post-body {
  color: var(--color-text-post);
  background: var(--color-bg-post);
}

/* Code blocks */
pre {
  border-radius: 8px;
  padding: 1.25rem !important;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}

code:not(pre code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: #2d2d2d;
  color: #e6edf3;
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

/* Prose styles for article body */
.prose {
  max-width: 720px;
  margin: 0 auto;
  color: var(--color-text-post);
}
.prose h2 { font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1rem; line-height: 1.3; }
.prose h3 { font-size: 1.2rem; font-weight: 600; margin: 2rem 0 0.75rem; }
.prose p  { margin-bottom: 1.5rem; }
.prose ul, .prose ol { margin: 0 0 1.5rem 1.5rem; }
.prose li { margin-bottom: 0.4rem; }
.prose blockquote {
  border-left: 3px solid var(--color-accent);
  padding: 0.75rem 1rem;
  margin: 1.5rem 0;
  background: #f9fafb;
  border-radius: 0 6px 6px 0;
  font-style: italic;
  color: #4b5563;
}
.prose pre { margin: 1.5rem 0; }
.prose a { color: var(--color-accent); text-decoration: underline; }
.prose a:hover { opacity: 0.8; }
.prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }

/* Tag chips */
.tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--color-tag-bg);
  color: var(--color-tag-text);
  text-decoration: none;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}
.tag:hover { border-color: var(--color-accent); }
.tag.light { background: #fef2f2; color: var(--color-accent); }
```

- [ ] **Step 3.2: Verify build still passes**

```bash
npm run build
```

Expected: `✓ Built in X.XXs` with no errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add global CSS with Jasper2/Ghost Casper design tokens"
```

---

## Phase 2 — Core Components

### Task 4: Nav component

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 4.1: Write Nav component**

```astro
---
// src/components/Nav.astro
interface Props {
  transparent?: boolean;
}
const { transparent = false } = Astro.props;
const currentPath = Astro.url.pathname;
---

<nav class:list={['nav', transparent && 'nav--transparent']}>
  <div class="nav__inner">
    <a href="/" class="nav__logo">
      <span class="nav__logo-text">hello<em>dk</em></span>
    </a>
    <div class="nav__links">
      <a href="/" class:list={['nav__link', currentPath === '/' && 'nav__link--active']}>Blog</a>
      <a href="/tag/devops" class="nav__link">DevOps</a>
      <a href="/tag/kubernetes" class="nav__link">Kubernetes</a>
      <a href="/about" class:list={['nav__link', currentPath === '/about' && 'nav__link--active']}>About</a>
      <a href="/newsletter" class="nav__link">Newsletter</a>
      <a href="/search" class="nav__link nav__link--icon" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </a>
      <a href="https://github.com/hellodk" class="nav__link nav__link--icon" target="_blank" rel="noopener" aria-label="GitHub">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      </a>
    </div>
  </div>
</nav>

<style>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #111111;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}
.nav--transparent {
  position: absolute;
  width: 100%;
  background: transparent;
  border-bottom: none;
}
.nav__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav__logo { text-decoration: none; }
.nav__logo-text {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
}
.nav__logo-text em { color: var(--color-accent); font-style: normal; }
.nav__links {
  display: flex;
  align-items: center;
  gap: 20px;
}
.nav__link {
  color: #9ba3af;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.15s;
  display: flex;
  align-items: center;
}
.nav__link:hover, .nav__link--active { color: #ffffff; }
.nav__link--icon { color: #9ba3af; }
</style>
```

- [ ] **Step 4.2: Add a smoke-test page to verify Nav renders**

In `src/pages/index.astro` (temporary):

```astro
---
import Nav from '../components/Nav.astro';
import '../styles/global.css';
---
<html lang="en">
<head><meta charset="UTF-8" /><title>Test</title></head>
<body>
  <Nav />
  <p style="color:white;padding:2rem;">Nav renders OK</p>
</body>
</html>
```

```bash
npm run dev
```

Visit http://localhost:4321 — confirm Nav appears with logo and links.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/Nav.astro src/pages/index.astro
git commit -m "feat: add sticky Nav component with logo, links, GitHub icon"
```

---

### Task 5: Hero component

**Files:**
- Create: `src/components/Hero.astro`

- [ ] **Step 5.1: Write Hero component**

```astro
---
// src/components/Hero.astro
---

<section class="hero">
  <div class="hero__overlay"></div>
  <div class="hero__content">
    <h1 class="hero__title">
      Curiosity is the most<br/>powerful thing you own
    </h1>
    <p class="hero__bio">
      Deepak Gupta · DevOps · SRE · Homelab<br/>
      <span class="hero__bio-detail">
        Full-time technologist. I write about Kubernetes, observability,
        fleet management, Linux internals, and occasionally motorcycles.
      </span>
    </p>
    <div class="hero__links">
      <a href="https://github.com/hellodk" target="_blank" rel="noopener" class="hero__link">
        GitHub
      </a>
      <a href="/newsletter" class="hero__link">
        Substack
      </a>
      <a href="/feed.xml" class="hero__link">
        RSS
      </a>
      <a href="/about" class="hero__link hero__link--primary">
        About me →
      </a>
    </div>
  </div>
</section>

<style>
.hero {
  position: relative;
  background: #0d0d0d;
  padding: 80px 24px 64px;
  text-align: center;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}
.hero__overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(229,100,94,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.hero__content {
  position: relative;
  max-width: 680px;
  margin: 0 auto;
}
.hero__title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  line-height: 1.2;
  color: #ffffff;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}
.hero__bio {
  font-size: 1rem;
  color: #9ba3af;
  line-height: 1.6;
  margin-bottom: 28px;
}
.hero__bio-detail {
  display: block;
  margin-top: 8px;
  font-size: 0.9rem;
}
.hero__links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hero__link {
  color: #9ba3af;
  text-decoration: none;
  font-size: 0.875rem;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  transition: all 0.15s;
}
.hero__link:hover { color: #ffffff; border-color: #5a5a5a; }
.hero__link--primary {
  background: var(--color-accent);
  color: #ffffff;
  border-color: var(--color-accent);
}
.hero__link--primary:hover { opacity: 0.9; color: #ffffff; }
</style>
```

- [ ] **Step 5.2: Add Hero to index.astro to verify**

```astro
---
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';
import '../styles/global.css';
---
<html lang="en">
<head><meta charset="UTF-8" /><title>hellodk.io</title></head>
<body>
  <Nav />
  <Hero />
</body>
</html>
```

Visit http://localhost:4321 — confirm Hero renders with title, bio, and links.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro
git commit -m "feat: add Hero component with gradient overlay and social links"
```

---

### Task 6: PostCard component

**Files:**
- Create: `src/components/PostCard.astro`

- [ ] **Step 6.1: Write PostCard component**

```astro
---
// src/components/PostCard.astro
interface Props {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  cover?: string;
  readingTime?: number;
}

const { slug, title, description, date, tags, cover, readingTime } = Astro.props;

const formattedDate = date.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
---

<article class="card">
  <a href={`/${slug}`} class="card__link" tabindex="-1" aria-hidden="true">
    <div class="card__cover">
      {cover
        ? <img src={cover} alt={title} loading="lazy" />
        : <div class="card__cover-fallback" aria-hidden="true"></div>
      }
    </div>
  </a>
  <div class="card__body">
    <div class="card__meta">
      <time datetime={date.toISOString()}>{formattedDate}</time>
      {readingTime && <span class="card__dot">·</span>}
      {readingTime && <span>{readingTime} min read</span>}
    </div>
    <h2 class="card__title">
      <a href={`/${slug}`}>{title}</a>
    </h2>
    <p class="card__excerpt">{description}</p>
    {tags.length > 0 && (
      <div class="card__tags">
        {tags.slice(0, 3).map(tag => (
          <a href={`/tag/${tag}`} class="tag">{tag}</a>
        ))}
      </div>
    )}
  </div>
</article>

<style>
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}
.card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.card__link { display: block; }
.card__cover {
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #1a1a1a;
}
.card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.card:hover .card__cover img { transform: scale(1.03); }
.card__cover-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2020 50%, #1a1a1a 100%);
}
.card__body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.card__meta { font-size: 0.78rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 6px; }
.card__dot { color: var(--color-border); }
.card__title { font-size: 1rem; font-weight: 600; line-height: 1.4; }
.card__title a { color: #ffffff; text-decoration: none; }
.card__title a:hover { color: var(--color-accent); }
.card__excerpt { font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6; flex: 1; }
.card__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
</style>
```

- [ ] **Step 6.2: Add a dummy card to index.astro to verify**

```astro
---
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';
import PostCard from '../components/PostCard.astro';
import '../styles/global.css';
---
<html lang="en">
<head><meta charset="UTF-8" /><title>hellodk.io</title></head>
<body>
  <Nav />
  <Hero />
  <div style="max-width:900px;margin:40px auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <PostCard
      slug="test"
      title="How apt upgrade Silently Broke GNOME Thumbnails"
      description="Three root causes, one apt upgrade."
      date={new Date('2026-05-23')}
      tags={['linux','ubuntu','debugging']}
      readingTime={12}
    />
    <PostCard
      slug="test2"
      title="macOS VMs on Apple Silicon with tart"
      description="Salt states that automate tart VM lifecycle."
      date={new Date('2026-05-27')}
      tags={['macos','saltstack']}
      cover="/images/posts/placeholder.jpg"
      readingTime={6}
    />
  </div>
</body>
</html>
```

Visit http://localhost:4321 — confirm cards render with gradient fallback on the first one.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/PostCard.astro src/pages/index.astro
git commit -m "feat: add PostCard component with cover image, meta, tags, hover"
```

---

### Task 7: PostGrid and Pagination components

**Files:**
- Create: `src/components/PostGrid.astro`
- Create: `src/components/Pagination.astro`

- [ ] **Step 7.1: Write PostGrid component**

```astro
---
// src/components/PostGrid.astro
import PostCard from './PostCard.astro';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  cover?: string;
  readingTime?: number;
}

interface Props {
  posts: Post[];
}

const { posts } = Astro.props;
---

<section class="grid">
  {posts.map(post => (
    <PostCard
      slug={post.slug}
      title={post.title}
      description={post.description}
      date={post.date}
      tags={post.tags}
      cover={post.cover}
      readingTime={post.readingTime}
    />
  ))}
</section>

<style>
.grid {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 64px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}
@media (max-width: 600px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 7.2: Write Pagination component**

```astro
---
// src/components/Pagination.astro
interface Props {
  currentPage: number;
  totalPages: number;
  base?: string;
}

const { currentPage, totalPages, base = '/page' } = Astro.props;
const prev = currentPage > 1 ? (currentPage === 2 ? '/' : `${base}/${currentPage - 1}`) : null;
const next = currentPage < totalPages ? `${base}/${currentPage + 1}` : null;
---

{totalPages > 1 && (
  <nav class="pagination" aria-label="Page navigation">
    {prev
      ? <a href={prev} class="pagination__btn">← Newer</a>
      : <span class="pagination__btn pagination__btn--disabled">← Newer</span>
    }
    <span class="pagination__info">Page {currentPage} of {totalPages}</span>
    {next
      ? <a href={next} class="pagination__btn">Older →</a>
      : <span class="pagination__btn pagination__btn--disabled">Older →</span>
    }
  </nav>
)}

<style>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 0 24px 64px;
}
.pagination__btn {
  color: #9ba3af;
  text-decoration: none;
  font-size: 0.875rem;
  padding: 8px 18px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-card);
  transition: all 0.15s;
}
a.pagination__btn:hover { color: #ffffff; border-color: var(--color-accent); }
.pagination__btn--disabled { opacity: 0.3; cursor: default; }
.pagination__info { font-size: 0.82rem; color: var(--color-text-muted); }
</style>
```

- [ ] **Step 7.3: Run type check**

```bash
npx astro check
```

Expected: `Found 0 errors.`

- [ ] **Step 7.4: Commit**

```bash
git add src/components/PostGrid.astro src/components/Pagination.astro
git commit -m "feat: add PostGrid (responsive card grid) and Pagination components"
```

---

### Task 8: TagList component

**Files:**
- Create: `src/components/TagList.astro`

- [ ] **Step 8.1: Write TagList component**

```astro
---
// src/components/TagList.astro
interface Props {
  tags: string[];
  size?: 'sm' | 'md';
  theme?: 'dark' | 'light';
}

const { tags, size = 'md', theme = 'dark' } = Astro.props;
---

{tags.length > 0 && (
  <div class:list={['taglist', `taglist--${size}`]}>
    {tags.map(tag => (
      <a
        href={`/tag/${tag}`}
        class:list={['tag', theme === 'light' && 'tag--light']}
      >
        {tag}
      </a>
    ))}
  </div>
)}

<style>
.taglist { display: flex; flex-wrap: wrap; gap: 6px; }
.taglist--sm .tag { font-size: 0.68rem; padding: 2px 8px; }
</style>
```

- [ ] **Step 8.2: Commit**

```bash
git add src/components/TagList.astro
git commit -m "feat: add TagList component with dark/light theme variants"
```

---

## Phase 3 — Layouts

### Task 9: BaseLayout

**Files:**
- Create: `src/layouts/BaseLayout.astro`

- [ ] **Step 9.1: Write BaseLayout with full head, OG meta, and analytics slots**

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
  cover?: string;
  type?: 'website' | 'article';
  publishedDate?: Date;
  tags?: string[];
}

const {
  title,
  description = 'Deepak Gupta — DevOps, SRE, Homelab, and more.',
  cover,
  type = 'website',
  publishedDate,
  tags = [],
} = Astro.props;

const siteUrl = 'https://hellodk.io';
const canonicalUrl = new URL(Astro.url.pathname, siteUrl).toString();
const ogImage = cover
  ? new URL(cover, siteUrl).toString()
  : new URL('/images/og-default.png', siteUrl).toString();

const GA4_ID = import.meta.env.PUBLIC_GA4_ID;
const GOATCOUNTER_CODE = import.meta.env.PUBLIC_GOATCOUNTER_CODE;
const isProd = import.meta.env.PROD;
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl} />

  <!-- Open Graph -->
  <meta property="og:type" content={type} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:site_name" content="hellodk.io" />
  {publishedDate && <meta property="article:published_time" content={publishedDate.toISOString()} />}
  {tags.map(tag => <meta property="article:tag" content={tag} />)}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />

  <!-- JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": type === 'article' ? 'BlogPosting' : 'WebSite',
    "name": title,
    "description": description,
    "url": canonicalUrl,
    "publisher": {
      "@type": "Person",
      "name": "Deepak Gupta",
      "url": siteUrl,
    },
    ...(publishedDate && { "datePublished": publishedDate.toISOString() }),
  })} />

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="alternate" type="application/rss+xml" title="hellodk.io" href="/feed.xml" />

  <!-- GA4 (production only) -->
  {isProd && GA4_ID && (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}></script>
      <script define:vars={{ GA4_ID }}>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA4_ID);
      </script>
    </>
  )}

  <!-- GoatCounter (production only) -->
  {isProd && GOATCOUNTER_CODE && (
    <script
      data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
      async
      src="//gc.zgo.at/count.js"
    ></script>
  )}

  <slot name="head" />
</head>
<body>
  <slot />
</body>
</html>
```

- [ ] **Step 9.2: Create `.env.example` for analytics IDs**

```bash
# .env.example
PUBLIC_GA4_ID=G-XXXXXXXXXX
PUBLIC_GOATCOUNTER_CODE=your-goatcounter-code
```

```bash
cp .env.example .env
```

Leave `.env` values blank for now — analytics only loads in prod anyway.

- [ ] **Step 9.3: Run type check**

```bash
npx astro check
```

Expected: `Found 0 errors.`

- [ ] **Step 9.4: Commit**

```bash
git add src/layouts/BaseLayout.astro .env.example
git commit -m "feat: add BaseLayout with full OG meta, JSON-LD, GA4, GoatCounter"
```

---

### Task 10: HomeLayout and home page

**Files:**
- Create: `src/layouts/HomeLayout.astro`
- Modify: `src/pages/index.astro` (final version)

- [ ] **Step 10.1: Write HomeLayout**

```astro
---
// src/layouts/HomeLayout.astro
import BaseLayout from './BaseLayout.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';

interface Props {
  title?: string;
}

const { title = 'hellodk.io — DevOps, SRE & Homelab' } = Astro.props;
---

<BaseLayout title={title}>
  <Nav />
  <Hero />
  <main>
    <slot />
  </main>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__links">
        <a href="/">hellodk.io</a>
        <a href="https://github.com/hellodk" target="_blank" rel="noopener">GitHub</a>
        <a href="/newsletter">Substack</a>
        <a href="/feed.xml">RSS</a>
        <a href="/about">About</a>
      </div>
      <p>© {new Date().getFullYear()} Deepak Gupta · Built with Astro · Hosted on Cloudflare Pages</p>
    </div>
  </footer>
</BaseLayout>

<style>
main { background: var(--color-bg-dark); min-height: 40vh; }
.site-footer {
  background: #0d0d0d;
  border-top: 1px solid var(--color-border);
  padding: 28px 24px;
  text-align: center;
}
.site-footer__inner { max-width: 1200px; margin: 0 auto; }
.site-footer__links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.site-footer__links a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.85rem;
}
.site-footer__links a:hover { color: #ffffff; }
.site-footer p { color: var(--color-text-muted); font-size: 0.78rem; }
</style>
```

- [ ] **Step 10.2: Write final `index.astro` with real content collection query**

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import HomeLayout from '../layouts/HomeLayout.astro';
import PostGrid from '../components/PostGrid.astro';
import Pagination from '../components/Pagination.astro';

const POSTS_PER_PAGE = 12;

const allPosts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
const posts = allPosts.slice(0, POSTS_PER_PAGE);

const mappedPosts = posts.map(post => ({
  slug: post.slug,
  title: post.data.title,
  description: post.data.description,
  date: post.data.date,
  tags: post.data.tags,
  cover: post.data.cover,
}));
---

<HomeLayout>
  <PostGrid posts={mappedPosts} />
  <Pagination currentPage={1} totalPages={totalPages} />
</HomeLayout>
```

- [ ] **Step 10.3: Create paginated page route**

```astro
---
// src/pages/page/[page].astro
import { getCollection } from 'astro:content';
import HomeLayout from '../../layouts/HomeLayout.astro';
import PostGrid from '../../components/PostGrid.astro';
import Pagination from '../../components/Pagination.astro';

export async function getStaticPaths() {
  const POSTS_PER_PAGE = 12;
  const allPosts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

  return Array.from({ length: totalPages }, (_, i) => ({
    params: { page: String(i + 1) },
    props: {
      posts: allPosts.slice(i * POSTS_PER_PAGE, (i + 1) * POSTS_PER_PAGE),
      currentPage: i + 1,
      totalPages,
    },
  }));
}

const { posts, currentPage, totalPages } = Astro.props;
const mappedPosts = posts.map(post => ({
  slug: post.slug,
  title: post.data.title,
  description: post.data.description,
  date: post.data.date,
  tags: post.data.tags,
  cover: post.data.cover,
}));
---

<HomeLayout title={`hellodk.io — Page ${currentPage}`}>
  <PostGrid posts={mappedPosts} />
  <Pagination currentPage={currentPage} totalPages={totalPages} />
</HomeLayout>
```

Save as `src/pages/page/[page].astro`.

- [ ] **Step 10.4: Verify build**

```bash
npm run build
```

Expected: `✓ Built in X.XXs` — home page + paginated pages generated.

- [ ] **Step 10.5: Commit**

```bash
git add src/layouts/HomeLayout.astro src/pages/index.astro src/pages/page/
git commit -m "feat: add HomeLayout, home page, and paginated page routes"
```

---

### Task 11: PostHeader and PostLayout

**Files:**
- Create: `src/components/PostHeader.astro`
- Create: `src/layouts/PostLayout.astro`

- [ ] **Step 11.1: Write PostHeader (full-bleed cover + title)**

```astro
---
// src/components/PostHeader.astro
import TagList from './TagList.astro';

interface Props {
  title: string;
  date: Date;
  tags: string[];
  cover?: string;
  readingTime?: number;
}

const { title, date, tags, cover, readingTime } = Astro.props;
const formattedDate = date.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
---

<header class="post-header">
  {cover && (
    <div class="post-header__cover">
      <img src={cover} alt={title} />
    </div>
  )}
  <div class="post-header__meta-wrap" class:list={[!cover && 'post-header__meta-wrap--nocov']}>
    <div class="post-header__meta">
      <TagList tags={tags} size="sm" theme="light" />
      <h1 class="post-header__title">{title}</h1>
      <div class="post-header__byline">
        <span>Deepak Gupta</span>
        <span class="post-header__dot">·</span>
        <time datetime={date.toISOString()}>{formattedDate}</time>
        {readingTime && (
          <>
            <span class="post-header__dot">·</span>
            <span>{readingTime} min read</span>
          </>
        )}
      </div>
    </div>
  </div>
</header>

<style>
.post-header { width: 100%; }
.post-header__cover {
  width: 100%;
  max-height: 480px;
  overflow: hidden;
}
.post-header__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.post-header__meta-wrap {
  background: #ffffff;
  padding: 40px 24px 32px;
}
.post-header__meta-wrap--nocov {
  background: #0d0d0d;
  padding-top: 48px;
}
.post-header__meta-wrap--nocov .post-header__title,
.post-header__meta-wrap--nocov .post-header__byline {
  color: #ffffff;
}
.post-header__meta {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.post-header__title {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 700;
  line-height: 1.25;
  color: #1a1a1a;
  letter-spacing: -0.3px;
}
.post-header__byline {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.post-header__dot { color: #d1d5db; }
</style>
```

- [ ] **Step 11.2: Write PostLayout**

```astro
---
// src/layouts/PostLayout.astro
import BaseLayout from './BaseLayout.astro';
import Nav from '../components/Nav.astro';
import PostHeader from '../components/PostHeader.astro';

interface Props {
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  tags: string[];
  cover?: string;
  readingTime?: number;
}

const { title, description, date, updated, tags, cover, readingTime } = Astro.props;
---

<BaseLayout
  title={`${title} — hellodk.io`}
  description={description}
  cover={cover}
  type="article"
  publishedDate={date}
  tags={tags}
>
  <div class="post-page">
    <Nav />
    <PostHeader {title} {date} {tags} {cover} {readingTime} />

    <div class="post-body">
      <div class="prose">
        <slot />
      </div>
    </div>

    <slot name="after-prose" />
  </div>
</BaseLayout>

<style>
.post-page { min-height: 100vh; background: #0d0d0d; }
.post-body {
  background: #ffffff;
  padding: 48px 24px 64px;
}
</style>
```

- [ ] **Step 11.3: Commit**

```bash
git add src/components/PostHeader.astro src/layouts/PostLayout.astro
git commit -m "feat: add PostHeader (full-bleed cover) and PostLayout"
```

---

### Task 12: Post page route, RelatedPosts, and reading time utility

**Files:**
- Create: `src/pages/[...slug].astro`
- Create: `src/components/RelatedPosts.astro`
- Create: `src/utils/readingTime.ts`

- [ ] **Step 12.1: Write reading time utility**

```typescript
// src/utils/readingTime.ts
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

- [ ] **Step 12.2: Write RelatedPosts component**

```astro
---
// src/components/RelatedPosts.astro
import PostCard from './PostCard.astro';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  cover?: string;
}

interface Props {
  posts: Post[];
}

const { posts } = Astro.props;
---

{posts.length > 0 && (
  <section class="related">
    <div class="related__inner">
      <h2 class="related__heading">Related Posts</h2>
      <div class="related__grid">
        {posts.map(post => (
          <PostCard
            slug={post.slug}
            title={post.title}
            description={post.description}
            date={post.date}
            tags={post.tags}
            cover={post.cover}
          />
        ))}
      </div>
    </div>
  </section>
)}

<style>
.related { background: #0d0d0d; border-top: 1px solid var(--color-border); padding: 48px 24px; }
.related__inner { max-width: 1200px; margin: 0 auto; }
.related__heading {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 24px;
}
.related__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
</style>
```

- [ ] **Step 12.3: Write post page route**

```astro
---
// src/pages/[...slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import PostLayout from '../layouts/PostLayout.astro';
import NewsletterCTA from '../components/NewsletterCTA.astro';
import Giscus from '../components/Giscus.astro';
import RelatedPosts from '../components/RelatedPosts.astro';
import { readingTime } from '../utils/readingTime';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post, allPosts: posts },
  }));
}

interface Props {
  post: CollectionEntry<'blog'>;
  allPosts: CollectionEntry<'blog'>[];
}

const { post, allPosts } = Astro.props;
const { Content, remarkPluginFrontmatter } = await post.render();

const rt = readingTime(post.body);

const related = allPosts
  .filter(p => p.slug !== post.slug && !p.data.draft)
  .filter(p => p.data.tags.some(t => post.data.tags.includes(t)))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 3)
  .map(p => ({
    slug: p.slug,
    title: p.data.title,
    description: p.data.description,
    date: p.data.date,
    tags: p.data.tags,
    cover: p.data.cover,
  }));
---

<PostLayout
  title={post.data.title}
  description={post.data.description}
  date={post.data.date}
  updated={post.data.updated}
  tags={post.data.tags}
  cover={post.data.cover}
  readingTime={rt}
>
  <Content />

  <Fragment slot="after-prose">
    <NewsletterCTA />
    <Giscus />
    <RelatedPosts posts={related} />
  </Fragment>
</PostLayout>
```

- [ ] **Step 12.4: Build and verify**

```bash
npm run build
```

Expected: all post pages generated. Check `dist/` for `test-post/index.html`.

- [ ] **Step 12.5: Commit**

```bash
git add src/pages/[...slug].astro src/components/RelatedPosts.astro src/utils/readingTime.ts
git commit -m "feat: add post page route with related posts and reading time"
```

---

## Phase 4 — Additional Pages

### Task 13: Tag filtered pages

**Files:**
- Create: `src/pages/tag/[tag].astro`

- [ ] **Step 13.1: Write tag page route**

```astro
---
// src/pages/tag/[tag].astro
import { getCollection } from 'astro:content';
import HomeLayout from '../../layouts/HomeLayout.astro';
import PostGrid from '../../components/PostGrid.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const allTags = [...new Set(posts.flatMap(p => p.data.tags))];

  return allTags.map(tag => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter(p => p.data.tags.includes(tag))
        .sort((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    },
  }));
}

const { tag, posts } = Astro.props;
const mappedPosts = posts.map(p => ({
  slug: p.slug,
  title: p.data.title,
  description: p.data.description,
  date: p.data.date,
  tags: p.data.tags,
  cover: p.data.cover,
}));
---

<HomeLayout title={`#${tag} — hellodk.io`}>
  <div class="tag-hero">
    <h1 class="tag-hero__title">#{tag}</h1>
    <p class="tag-hero__count">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
  </div>
  <PostGrid posts={mappedPosts} />
</HomeLayout>

<style>
.tag-hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 24px;
}
.tag-hero__title { font-size: 1.8rem; font-weight: 700; color: var(--color-accent); }
.tag-hero__count { font-size: 0.875rem; color: var(--color-text-muted); margin-top: 4px; }
</style>
```

- [ ] **Step 13.2: Build and verify**

```bash
npm run build 2>&1 | grep "tag/"
```

Expected: one route per tag generated (e.g., `tag/linux/`, `tag/kubernetes/`).

- [ ] **Step 13.3: Commit**

```bash
git add src/pages/tag/
git commit -m "feat: add tag filtered pages with post count"
```

---

### Task 14: About and 404 pages

**Files:**
- Create: `src/pages/about.astro`
- Create: `src/pages/404.astro`

- [ ] **Step 14.1: Write About page**

```astro
---
// src/pages/about.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
---

<BaseLayout title="About — hellodk.io" description="About Deepak Gupta — DevOps, SRE, homelab builder and writer.">
  <div class="about-page">
    <Nav />
    <main class="about-main">
      <div class="about-content">
        <h1>About</h1>
        <p>
          I'm Deepak Gupta — a full-time technologist based in Bangalore, India.
          I spend most of my time building and operating infrastructure: Kubernetes clusters,
          SaltStack fleet management, CI/CD pipelines, observability stacks, and the occasional
          homelab experiment.
        </p>
        <p>
          I've been writing on hellodk.io since 2015. Most posts are about things I've debugged,
          built, or broken — and what I learned from it. The categories lean DevOps/SRE but
          occasionally I write about photography, travel, and food.
        </p>
        <h2>What I work on</h2>
        <ul>
          <li><strong>kri</strong> — fleet management platform for Apple Silicon Mac Mini build infrastructure</li>
          <li>Kubernetes (k8s, k0s, EKS, AKS) — production and homelab</li>
          <li>SaltStack — configuration management and orchestration</li>
          <li>Observability — Prometheus, Grafana, OpenTelemetry, Tempo</li>
          <li>CI/CD — Jenkins, GitHub Actions, Gitea</li>
        </ul>
        <h2>Find me</h2>
        <ul>
          <li><a href="https://github.com/hellodk" target="_blank" rel="noopener">GitHub @hellodk</a></li>
          <li><a href="/newsletter">Substack newsletter</a></li>
          <li><a href="/feed.xml">RSS feed</a></li>
        </ul>
      </div>
    </main>
  </div>
</BaseLayout>

<style>
.about-page { min-height: 100vh; background: #0d0d0d; }
.about-main { background: #ffffff; padding: 64px 24px; min-height: calc(100vh - 56px); }
.about-content {
  max-width: 680px;
  margin: 0 auto;
  color: #1a1a1a;
  font-size: 1rem;
  line-height: 1.8;
}
.about-content h1 { font-size: 2rem; font-weight: 700; margin-bottom: 24px; color: #111; }
.about-content h2 { font-size: 1.3rem; font-weight: 600; margin: 2rem 0 1rem; color: #111; }
.about-content p { margin-bottom: 1.4rem; }
.about-content ul { margin: 0 0 1.4rem 1.5rem; }
.about-content li { margin-bottom: 0.5rem; }
.about-content a { color: var(--color-accent); }
</style>
```

- [ ] **Step 14.2: Write 404 page**

```astro
---
// src/pages/404.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
---

<BaseLayout title="404 — Page Not Found — hellodk.io">
  <div style="min-height:100vh;background:#0d0d0d;">
    <Nav />
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 56px);text-align:center;padding:24px;">
      <p style="font-size:6rem;font-weight:900;color:#2d2d2d;line-height:1;">404</p>
      <h1 style="font-size:1.4rem;font-weight:600;color:#ffffff;margin:16px 0 8px;">Page not found</h1>
      <p style="color:#9ba3af;margin-bottom:28px;">The page you're looking for doesn't exist or has moved.</p>
      <a href="/" style="color:var(--color-accent);text-decoration:none;font-weight:500;">← Back to blog</a>
    </div>
  </div>
</BaseLayout>
```

- [ ] **Step 14.3: Commit**

```bash
git add src/pages/about.astro src/pages/404.astro
git commit -m "feat: add About and 404 pages"
```

---

## Phase 5 — Interactive Features

### Task 15: NewsletterCTA component (Brevo)

**Files:**
- Create: `src/components/NewsletterCTA.astro`
- Create: `src/pages/newsletter.astro`

- [ ] **Step 15.1: Get your Brevo form embed code**

In Brevo dashboard → Contacts → Forms → Create a form.
Select "Embedded form". Copy the form action URL (format: `https://sibforms.com/serve/MUIEXXXXX`).

Store it:
```bash
# Add to .env
echo "PUBLIC_BREVO_FORM_URL=https://sibforms.com/serve/YOUR_FORM_ID" >> .env
```

Also add to `.env.example`:
```
PUBLIC_BREVO_FORM_URL=https://sibforms.com/serve/YOUR_FORM_ID
```

- [ ] **Step 15.2: Write NewsletterCTA component**

```astro
---
// src/components/NewsletterCTA.astro
const BREVO_FORM_URL = import.meta.env.PUBLIC_BREVO_FORM_URL;
---

<section class="nl-cta">
  <div class="nl-cta__inner">
    <div class="nl-cta__text">
      <h3 class="nl-cta__title">Enjoyed this post?</h3>
      <p class="nl-cta__sub">Get the next one in your inbox — only when I ship something worth reading.</p>
    </div>
    {BREVO_FORM_URL ? (
      <form
        action={BREVO_FORM_URL}
        method="POST"
        class="nl-cta__form"
        target="_blank"
      >
        <input
          type="email"
          name="EMAIL"
          placeholder="you@example.com"
          required
          class="nl-cta__input"
          autocomplete="email"
        />
        <button type="submit" class="nl-cta__btn">Subscribe →</button>
      </form>
    ) : (
      <p style="color:#9ba3af;font-size:0.85rem;">Newsletter form not configured.</p>
    )}
    <p class="nl-cta__substack">
      Or follow on <a href="https://substack.com/@hellodk" target="_blank" rel="noopener">Substack</a> for the newsletter.
    </p>
  </div>
</section>

<style>
.nl-cta {
  background: #0d0d0d;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: 40px 24px;
}
.nl-cta__inner {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.nl-cta__title { font-size: 1.2rem; font-weight: 700; color: #ffffff; }
.nl-cta__sub { font-size: 0.875rem; color: #9ba3af; }
.nl-cta__form { display: flex; gap: 8px; width: 100%; max-width: 420px; }
.nl-cta__input {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid var(--color-border);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
}
.nl-cta__input:focus { border-color: var(--color-accent); }
.nl-cta__input::placeholder { color: #4b5563; }
.nl-cta__btn {
  background: var(--color-accent);
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.nl-cta__btn:hover { opacity: 0.9; }
.nl-cta__substack { font-size: 0.8rem; color: #6b7280; }
.nl-cta__substack a { color: #ff6719; text-decoration: none; }
</style>
```

- [ ] **Step 15.3: Write Newsletter page**

```astro
---
// src/pages/newsletter.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
import NewsletterCTA from '../components/NewsletterCTA.astro';
---

<BaseLayout title="Newsletter — hellodk.io" description="Subscribe to the hellodk.io newsletter — DevOps, SRE, and homelab deep-dives.">
  <div style="min-height:100vh;background:#0d0d0d;">
    <Nav />
    <div style="max-width:680px;margin:0 auto;padding:64px 24px;text-align:center;">
      <h1 style="font-size:2rem;font-weight:700;margin-bottom:12px;">Newsletter</h1>
      <p style="color:#9ba3af;margin-bottom:48px;">
        DevOps deep-dives, homelab stories, debugging war stories, and tools worth knowing about.
        No spam. Sent when something is actually worth reading.
      </p>
    </div>
    <NewsletterCTA />
  </div>
</BaseLayout>
```

- [ ] **Step 15.4: Verify build**

```bash
npm run build
```

Expected: `newsletter/index.html` appears in `dist/`.

- [ ] **Step 15.5: Commit**

```bash
git add src/components/NewsletterCTA.astro src/pages/newsletter.astro .env.example
git commit -m "feat: add Brevo newsletter CTA component and /newsletter page"
```

---

### Task 16: Giscus comments

**Files:**
- Create: `src/components/Giscus.astro`

- [ ] **Step 16.1: Configure Giscus**

1. Visit https://giscus.app
2. Enter repo: `hellodk/hellodk.github.io`
3. Enable Discussions in the GitHub repo: Settings → Features → Discussions ✓
4. Select mapping: **pathname**
5. Select category: **General** (or create a "Blog Comments" category)
6. Copy the generated `data-repo-id` and `data-category-id`

Add to `.env`:
```
PUBLIC_GISCUS_REPO=hellodk/hellodk.github.io
PUBLIC_GISCUS_REPO_ID=R_xxxxxxxx
PUBLIC_GISCUS_CATEGORY=General
PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxxx
```

Add same keys to `.env.example`.

- [ ] **Step 16.2: Write Giscus component**

```astro
---
// src/components/Giscus.astro
const repo = import.meta.env.PUBLIC_GISCUS_REPO;
const repoId = import.meta.env.PUBLIC_GISCUS_REPO_ID;
const category = import.meta.env.PUBLIC_GISCUS_CATEGORY;
const categoryId = import.meta.env.PUBLIC_GISCUS_CATEGORY_ID;

const configured = repo && repoId && category && categoryId;
---

<section class="giscus-wrap">
  <h2 class="giscus-wrap__heading">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    Comments
    <span class="giscus-wrap__via">via GitHub Discussions</span>
  </h2>
  {configured ? (
    <div class="giscus-container">
      <script
        src="https://giscus.app/client.js"
        data-repo={repo}
        data-repo-id={repoId}
        data-category={category}
        data-category-id={categoryId}
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="dark"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async
      ></script>
    </div>
  ) : (
    <p style="color:#9ba3af;font-size:0.875rem;padding:0 24px 32px;">
      Comments not configured. Set GISCUS env vars to enable.
    </p>
  )}
</section>

<style>
.giscus-wrap {
  background: #0d0d0d;
  padding: 40px 24px;
  border-top: 1px solid var(--color-border);
}
.giscus-wrap__heading {
  max-width: 720px;
  margin: 0 auto 24px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #9ba3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.giscus-wrap__via { font-weight: 400; font-size: 0.78rem; }
.giscus-container { max-width: 720px; margin: 0 auto; }
</style>
```

- [ ] **Step 16.3: Commit**

```bash
git add src/components/Giscus.astro .env.example
git commit -m "feat: add Giscus comments component (GitHub Discussions)"
```

---

### Task 17: Pagefind search

**Files:**
- Create: `src/components/SearchButton.astro`
- Create: `src/pages/search.astro`
- Modify: `package.json` (build script)

- [ ] **Step 17.1: Install Pagefind**

```bash
npm install pagefind --save-dev
```

- [ ] **Step 17.2: Update build script in `package.json`**

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && npx pagefind --site dist",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check"
  }
}
```

- [ ] **Step 17.3: Write Search page**

```astro
---
// src/pages/search.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import Nav from '../components/Nav.astro';
---

<BaseLayout title="Search — hellodk.io">
  <div style="min-height:100vh;background:#0d0d0d;">
    <Nav />
    <div style="max-width:720px;margin:0 auto;padding:48px 24px;">
      <h1 style="font-size:1.6rem;font-weight:700;margin-bottom:24px;">Search</h1>
      <div id="search"></div>
    </div>
  </div>
</BaseLayout>

<link rel="stylesheet" href="/pagefind/pagefind-ui.css" />
<script src="/pagefind/pagefind-ui.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({
      element: '#search',
      showSubResults: true,
      resetStyles: false,
    });
  });
</script>

<style>
  :root {
    --pagefind-ui-primary: #e5645e;
    --pagefind-ui-background: #1a1a1a;
    --pagefind-ui-border: #2d2d2d;
    --pagefind-ui-text: #e6edf3;
    --pagefind-ui-scale: 0.9;
  }
</style>
```

- [ ] **Step 17.4: Add `data-pagefind-body` attribute to PostLayout**

In `src/layouts/PostLayout.astro`, add `data-pagefind-body` to the prose wrapper:

```astro
<!-- in PostLayout.astro, update the post-body div -->
<div class="post-body">
  <div class="prose" data-pagefind-body>
    <slot />
  </div>
</div>
```

- [ ] **Step 17.5: Verify Pagefind runs after build**

```bash
npm run build 2>&1 | tail -20
```

Expected output includes:
```
Running Pagefind v1.x.x
Indexed X pages
Writing search index to dist/pagefind/
```

- [ ] **Step 17.6: Commit**

```bash
git add src/pages/search.astro src/components/ package.json
git commit -m "feat: add Pagefind full-text search at /search"
```

---

## Phase 6 — Cloudflare Pages & Security

### Task 18: Security headers, redirects, and CF Pages config

**Files:**
- Create: `public/_headers`
- Create: `public/_redirects`

- [ ] **Step 18.1: Write `_headers` file**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-XSS-Protection: 1; mode=block

/pagefind/*
  Cache-Control: public, max-age=31536000, immutable

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Note: CSP is intentionally omitted from the static file — Giscus iframes require `frame-src` and Brevo requires `connect-src`. Set CSP in Cloudflare Pages dashboard → Custom Headers (allows dynamic values without breaking embeds).

- [ ] **Step 18.2: Write `_redirects` file**

```
# Legacy Jekyll URL patterns
/rss.xml       /feed.xml       301
/atom.xml      /feed.xml       301
/tag/:tag      /tag/:tag       200

# hellodk.in → hellodk.io handled via CF Bulk Redirect Rule (not here)
```

- [ ] **Step 18.3: Verify files copy to dist**

```bash
npm run build && ls dist/_headers dist/_redirects
```

Expected: both files exist in `dist/`.

- [ ] **Step 18.4: Commit**

```bash
git add public/_headers public/_redirects
git commit -m "feat: add Cloudflare Pages security headers and redirects"
```

---

### Task 19: RSS feed

**Files:**
- Create: `src/pages/feed.xml.ts`

- [ ] **Step 19.1: Install Astro RSS**

```bash
npm install @astrojs/rss
```

- [ ] **Step 19.2: Write RSS feed route**

```typescript
// src/pages/feed.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'hellodk.io',
    description: 'Deepak Gupta — DevOps, SRE & Homelab',
    site: context.site!.toString(),
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: '<language>en-gb</language>',
  });
}
```

- [ ] **Step 19.3: Verify RSS builds**

```bash
npm run build && grep -c "<item>" dist/feed.xml
```

Expected: outputs count of posts (e.g., `11`).

- [ ] **Step 19.4: Commit**

```bash
git add src/pages/feed.xml.ts
git commit -m "feat: add RSS feed at /feed.xml"
```

---

## Phase 7 — Content Migration

### Task 20: Migration script — Jekyll → Astro MDX

**Files:**
- Create: `scripts/migrate-posts.mjs`

- [ ] **Step 20.1: Write migration script**

```javascript
// scripts/migrate-posts.mjs
// One-shot script: converts Jekyll _posts HTML/MD to Astro content/blog MD
// Run: node scripts/migrate-posts.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const POSTS_IN = path.join(ROOT, '_jekyll-backup/_posts');
const POSTS_OUT = path.join(ROOT, 'src/content/blog');

const FIELD_MAP = {
  // Jekyll key → Astro key
  cover: 'cover',
  tags: 'tags',
  title: 'title',
  date: 'date',
  description: 'description',
};

function parseFrontmatter(raw) {
  const lines = raw.split('\n');
  const obj = {};
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'tags') {
      obj.tags = val.split(/\s+/).filter(Boolean);
    } else if (key === 'date') {
      obj.date = val.trim().slice(0, 10);
    } else {
      obj[key] = val.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return obj;
}

function buildFrontmatter(fm, slug) {
  const title = fm.title || slug;
  const date = fm.date || '2020-01-01';
  const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
  const description = fm.description || title;
  const cover = fm.cover || undefined;

  let out = `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n`;
  out += `description: ${JSON.stringify(description)}\n`;
  out += `tags: [${tags.join(', ')}]\n`;
  if (cover) out += `cover: ${JSON.stringify(cover)}\n`;
  out += `draft: false\n---\n\n`;
  return out;
}

const files = fs.readdirSync(POSTS_IN).filter(f => /\.(md|html)$/.test(f));
let converted = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(POSTS_IN, file), 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.log(`SKIP (no frontmatter): ${file}`);
    continue;
  }

  const [, fmRaw, body] = fmMatch;
  const fm = parseFrontmatter(fmRaw);

  // Derive slug from filename: 2020-03-02-resume.html → resume
  const slugMatch = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.(md|html)$/);
  if (!slugMatch) {
    console.log(`SKIP (no date prefix): ${file}`);
    continue;
  }

  const slug = slugMatch[1].replace(/_/g, '-');
  const outFile = path.join(POSTS_OUT, `${slug}.md`);

  if (fs.existsSync(outFile)) {
    console.log(`EXISTS (skip): ${slug}.md`);
    continue;
  }

  const frontmatter = buildFrontmatter(fm, slug);
  fs.writeFileSync(outFile, frontmatter + body.trim() + '\n');
  console.log(`✓ ${slug}.md`);
  converted++;
}

console.log(`\nDone. Converted ${converted}/${files.length} posts.`);
```

- [ ] **Step 20.2: Run migration on `_posts/`**

```bash
node scripts/migrate-posts.mjs
```

Expected output: lists each converted post with `✓ slug.md`.

- [ ] **Step 20.3: Fix common HTML remnants in migrated posts**

After migration, some posts will have raw HTML tags. Scan and fix manually:

```bash
grep -l "<[a-z]" src/content/blog/*.md
```

For each file listed: open it, convert key HTML to Markdown:
- `<h2>` → `## `
- `<p>` → paragraph (remove tags)
- `<ul><li>` → `- `
- `<code>` → backtick inline code

- [ ] **Step 20.4: Verify all migrated posts type-check**

```bash
npx astro check
```

Expected: `Found 0 errors.` (fix any frontmatter schema errors reported)

- [ ] **Step 20.5: Commit migrated posts**

```bash
git add scripts/migrate-posts.mjs src/content/blog/
git commit -m "feat: migrate 11 existing _posts/ to Astro content collection"
```

---

### Task 21: Integrate 2026 posts from /home/dk/Documents/blogs/

- [ ] **Step 21.1: Copy and convert 2026 HTML posts**

```bash
# Copy HTML posts — they need manual frontmatter addition
cp /home/dk/Documents/blogs/2026-05-23-gnome-thumbnails-broke.html src/content/blog/gnome-thumbnails-broke.md
cp /home/dk/Documents/blogs/2026-05-27-kri-knowledge-graph-graphify.html src/content/blog/kri-knowledge-graph-graphify.md
cp /home/dk/Documents/blogs/2026-05-27-macos-vms-tart-salt.html src/content/blog/macos-vms-tart-salt.md
```

- [ ] **Step 21.2: Copy Markdown posts (simpler migration)**

```bash
cp /home/dk/Documents/blogs/2026-04-25-browser-rdp-zero-ports.md src/content/blog/browser-rdp-zero-ports.md
cp /home/dk/Documents/blogs/kube_dns_split_dns_ubuntu24.md src/content/blog/kube-dns-split-dns-ubuntu24.md
cp /home/dk/Documents/blogs/monitoring-blog.md src/content/blog/kubernetes-monitoring-kube-prometheus.md
cp /home/dk/Documents/blogs/pnpm-the-smarter-package-manager.html src/content/blog/pnpm-smarter-package-manager.md
```

- [ ] **Step 21.3: Add/fix frontmatter on each 2026 post**

Each file needs this at the top (replace values per post):

```yaml
---
title: "How apt upgrade Silently Broke GNOME Thumbnails for a Week"
date: 2026-05-23
description: "Three root causes: stale gdk-pixbuf loader, corrupt Tracker3 database, and bwrap blocked by AppArmor. The exact fix."
tags: [linux, ubuntu, debugging, apparmor, gnome]
draft: false
---
```

Strip the standalone HTML `<head>`, `<style>`, and `<body>` wrappers from the HTML files — keep only the article content.

- [ ] **Step 21.4: Run type check and build**

```bash
npx astro check && npm run build
```

Expected: `Found 0 errors.`

- [ ] **Step 21.5: Commit**

```bash
git add src/content/blog/
git commit -m "feat: add 2026 blog posts from drafts directory"
```

---

### Task 22: Select and migrate best drafts (2017–2020)

- [ ] **Step 22.1: Audit `_drafts/` — select posts to publish**

Review these files from `_jekyll-backup/_drafts/` and select the technically strongest ones:

```bash
ls _jekyll-backup/_drafts/ | grep -E "201[7-9]|2020"
```

Recommended criteria for inclusion:
- Technically accurate (commands/configs still valid)
- Unique topic not already in `_posts/`
- Length > 300 words

Target: 10–15 posts. Mark each selected one with `draft: false`, rest with `draft: true` (keeps them in git but excludes from build).

- [ ] **Step 22.2: Convert selected drafts**

```bash
# Example — adapt for each selected post
cp "_jekyll-backup/_drafts/2017-04-24-configure_multiple_ssh_identities_for_gitbash_mac_linux.html" \
   src/content/blog/configure-multiple-ssh-identities.md
```

Add correct frontmatter + clean HTML → Markdown as in Task 21.3.

- [ ] **Step 22.3: Verify build**

```bash
npm run build 2>&1 | grep "pages"
```

Expected: total page count visible in output.

- [ ] **Step 22.4: Commit**

```bash
git add src/content/blog/
git commit -m "feat: migrate selected 2017-2020 DevOps drafts ($(ls src/content/blog | wc -l) total posts)"
```

---

## Phase 8 — Analytics Wiring

### Task 23: Connect GA4 and GoatCounter

- [ ] **Step 23.1: Create GA4 property**

1. Go to analytics.google.com → Admin → Create Property
2. Choose **Web** → enter `hellodk.io`
3. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

- [ ] **Step 23.2: Set GA4 ID as Cloudflare Pages environment variable**

In Cloudflare Pages dashboard → your project → Settings → Environment Variables:
```
PUBLIC_GA4_ID = G-XXXXXXXXXX
```

Set for **Production** environment. Optionally set a test ID for **Preview** environment.

- [ ] **Step 23.3: Register GoatCounter account**

1. Go to goatcounter.com → Sign up (free, no CC)
2. Choose code: `hellodk` (results in `hellodk.goatcounter.com`)
3. Copy the code: `hellodk`

- [ ] **Step 23.4: Set GoatCounter code in CF Pages**

In Cloudflare Pages → Settings → Environment Variables:
```
PUBLIC_GOATCOUNTER_CODE = hellodk
```

- [ ] **Step 23.5: Enable Cloudflare Web Analytics**

In Cloudflare dashboard → Analytics → Web Analytics → Add site → `hellodk.io`.
Cloudflare Pages auto-injects the beacon — no code change needed.

- [ ] **Step 23.6: Verify analytics loads in production**

After deploying, visit hellodk.io and open DevTools → Network. Filter by:
- `googletagmanager.com` — should appear
- `gc.zgo.at` — should appear

Check goatcounter.com dashboard — first pageview should register within 60 seconds.

- [ ] **Step 23.7: Commit env example update**

```bash
git add .env.example
git commit -m "docs: update .env.example with GA4 and GoatCounter vars"
```

---

## Phase 9 — Launch

### Task 24: Connect Cloudflare Pages and deploy

- [ ] **Step 24.1: Push branch and create PR**

```bash
git push -u origin feat/astro-migration
```

Open a PR: `feat/astro-migration` → `master`

- [ ] **Step 24.2: Connect Cloudflare Pages to GitHub repo**

1. Cloudflare dashboard → Pages → Create application → Connect to Git
2. Select `hellodk/staging.hellodk.in` repository
3. Framework preset: **Astro**
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Node.js version: `20`
7. Add environment variables from `.env.example`

- [ ] **Step 24.3: Set custom domains in Cloudflare Pages**

In Pages project → Custom domains:
- Add `hellodk.io` (primary)
- Add `hellodk.in` (redirect)

In Cloudflare DNS for `hellodk.io`:
```
CNAME  @   <project>.pages.dev   Proxied
CNAME  www  <project>.pages.dev  Proxied
```

- [ ] **Step 24.4: Set up hellodk.in → hellodk.io redirect**

Cloudflare dashboard → Bulk Redirects → Create Rule:
```
Source URL:       hellodk.in/*
Target URL:       https://hellodk.io/$1
Status:           301
Preserve path:    ✓
```

- [ ] **Step 24.5: Verify the preview URL works**

CF Pages generates a preview URL for the PR branch. Visit it and check:
- [ ] Home page loads with card grid
- [ ] A post page loads with cover image header
- [ ] `/feed.xml` returns valid RSS
- [ ] `/search` returns Pagefind UI
- [ ] `/newsletter` shows Brevo form
- [ ] Nav links all resolve

- [ ] **Step 24.6: Merge PR to master → triggers production deploy**

```bash
# After PR review passes:
git checkout master
git merge feat/astro-migration
git push origin master
```

---

### Task 25: Post-launch audit and cleanup

- [ ] **Step 25.1: Remove Jekyll artifacts from repo root**

```bash
git rm -r --cached _posts _drafts _layouts _includes _sass css error_testing.html feed.xml GHOST.txt index.html sample.html about.md Gemfile Rakefile Gemfile.lock-bak modernized_blog/ _site/ 2>/dev/null || true
git add -A
git commit -m "chore: remove Jekyll source files (replaced by Astro)"
```

- [ ] **Step 25.2: Run Lighthouse on production**

```bash
npx lighthouse https://hellodk.io --output=json --quiet | jq '{perf: .categories.performance.score, a11y: .categories.accessibility.score, seo: .categories.seo.score}'
```

Expected scores: performance ≥ 0.90, accessibility ≥ 0.90, SEO ≥ 0.90.

Fix any failing audits before calling launch complete.

- [ ] **Step 25.3: Verify redirect hellodk.in → hellodk.io**

```bash
curl -I https://hellodk.in
```

Expected: `HTTP/2 301` with `Location: https://hellodk.io/`

- [ ] **Step 25.4: Verify old GA UA is gone**

```bash
curl -s https://hellodk.io | grep "UA-84547172"
```

Expected: no output (UA tracking code fully removed).

- [ ] **Step 25.5: Tag the launch**

```bash
git tag -a "v1.0.0-launch" -m "hellodk.io v1.0.0 — Astro 5 + Cloudflare Pages, Jasper2 aesthetic, full feature set"
git push origin master --tags
```

- [ ] **Step 25.6: Final commit — add 'migration series' blog posts**

Write and publish the 3-part migration blog series as actual posts in `src/content/blog/`:
1. `astro-migration-from-jekyll.md` — date 2026-05-28
2. `two-years-of-dark-analytics-migration.md` — date 2026-05-28
3. `blog-rebuild-content-audit.md` — date 2026-05-28

These are your first posts on the new platform and serve as launch content.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Sec 3 Stack: Astro 5, Tailwind v4, CF Pages, GA4, CF Analytics, GoatCounter, Giscus, Brevo, Pagefind, Shiki — all covered in tasks 1–23
- ✅ Sec 4 Domains: hellodk.io canonical, hellodk.in redirect — Task 24
- ✅ Sec 5.1 Home layout: dark nav, hero, 2–3 col grid, pagination — Tasks 4–10
- ✅ Sec 5.2 Post layout: full-bleed cover, prose, Brevo CTA, Giscus, related posts — Tasks 11–12, 15–16
- ✅ Sec 5.3 Additional pages: tag, about, newsletter, search, 404 — Tasks 13–14, 17
- ✅ Sec 6 Content migration: migration script, 11 existing, 11 new 2026, selected drafts — Tasks 20–22
- ✅ Sec 7 Analytics: GA4, CF Analytics, GoatCounter — Task 23
- ✅ Sec 8 Giscus, Brevo, Pagefind — Tasks 15–17
- ✅ Sec 9 Security headers, redirects, CF Pages setup — Tasks 18, 24
- ✅ Sec 10 GitHub Pages → CF Pages migration — Tasks 24–25
- ✅ Sec 11 Enhancements over Jasper2 — all covered across tasks
- ✅ RSS feed — Task 19

**No placeholders found in review.**
