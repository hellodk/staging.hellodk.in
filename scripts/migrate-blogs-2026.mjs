// scripts/migrate-blogs-2026.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BLOGS_IN = '/home/dk/Documents/blogs';
const POSTS_OUT = path.join(ROOT, 'src/content/blog');

const blogFiles = [
  {
    src: '2026-05-23-gnome-thumbnails-broke/2026-05-23-gnome-thumbnails-broke.html',
    slug: 'gnome-thumbnails-broke',
    date: '2026-05-23',
    tags: ['linux', 'ubuntu', 'debugging', 'gnome'],
  },
  {
    src: '2026-04-25-browser-rdp-zero-ports/2026-04-25-browser-rdp-zero-ports.md',
    slug: 'browser-rdp-zero-ports',
    date: '2026-04-25',
    tags: ['kubernetes', 'networking', 'rdp'],
  },
  {
    src: 'kube_dns_split_dns_ubuntu24/kube_dns_split_dns_ubuntu24.md',
    slug: 'kube-dns-split-dns-ubuntu24',
    date: '2026-05-01',
    tags: ['kubernetes', 'dns', 'ubuntu'],
  },
  {
    src: 'monitoring-blog/monitoring-blog.md',
    slug: 'kubernetes-monitoring',
    date: '2026-05-01',
    tags: ['kubernetes', 'monitoring', 'prometheus'],
  },
  {
    src: 'pnpm-the-smarter-package-manager/pnpm-the-smarter-package-manager.html',
    slug: 'pnpm-smarter-package-manager',
    date: '2026-04-01',
    tags: ['nodejs', 'npm', 'pnpm'],
  },
  {
    src: 'kri-fleet-management/kri-fleet-management.html',
    slug: 'kri-fleet-management',
    date: '2026-05-15',
    tags: ['kri', 'devops', 'fleet-management'],
  },
  {
    src: '2026-05-27-macos-vms-tart-salt/2026-05-27-macos-vms-tart-salt.html',
    slug: 'macos-vms-tart-salt',
    date: '2026-05-27',
    tags: ['macos', 'saltstack', 'virtualization'],
  },
  {
    src: '2026-05-27-kri-knowledge-graph-graphify/2026-05-27-kri-knowledge-graph-graphify.html',
    slug: 'kri-knowledge-graph-graphify',
    date: '2026-05-27',
    tags: ['kri', 'knowledge-graph', 'devops'],
  },
];

function extractTextContent(html) {
  // Extract text from meta descriptions first
  const desc = html.match(/<meta name="description" content="([^"]+)"/);
  const descContent = desc ? desc[1] : '';

  // Extract body content for HTML files - find <body> and extract meaningful text
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return descContent;

  let content = bodyMatch[1];

  // Remove script and style tags
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert common HTML tags to markdown equivalents
  content = content.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n');
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  content = content.replace(/<br\s*\/?>/gi, '\n');

  // Remove HTML tags
  content = content.replace(/<[^>]+>/g, '');

  // Clean up whitespace
  content = content.replace(/\n\n+/g, '\n\n').trim();

  return (descContent || '') + '\n\n' + content;
}

function extractTitle(content, slug) {
  // Try to extract from frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/title:\s*['"]*([^'"]*)['"]*$/m);
    if (titleMatch) return titleMatch[1].trim();
  }

  // Try to extract from HTML title tag
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1];
    // Remove " — hellodk" suffix
    title = title.replace(/\s*—\s*hellodk.*$/, '');
    // Remove common suffixes
    title = title.replace(/\s*\|\s*hellodk.*$/, '');
    return title.trim();
  }

  // Use slug as fallback
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractDescription(content) {
  // Try frontmatter first
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/description:\s*['"]*([^'"]*)['"]*$/m);
    if (descMatch) return descMatch[1].trim();
  }

  // Try meta description
  const metaMatch = content.match(/<meta name="description" content="([^"]+)"/);
  if (metaMatch) return metaMatch[1].trim();

  return '';
}

fs.mkdirSync(POSTS_OUT, { recursive: true });
let converted = 0;

for (const blog of blogFiles) {
  const srcPath = path.join(BLOGS_IN, blog.src);
  if (!fs.existsSync(srcPath)) {
    console.log(`SKIP (not found): ${blog.src}`);
    continue;
  }

  const raw = fs.readFileSync(srcPath, 'utf8');
  const outFile = path.join(POSTS_OUT, `${blog.slug}.md`);

  if (fs.existsSync(outFile)) {
    console.log(`EXISTS (skip): ${blog.slug}.md`);
    continue;
  }

  // Extract title and description
  const title = extractTitle(raw, blog.slug);
  const description = extractDescription(raw) || title;

  // Extract body content
  let body = '';
  if (blog.src.endsWith('.md')) {
    // For markdown files, extract the body after frontmatter
    const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    body = fmMatch ? fmMatch[1].trim() : raw.trim();
  } else {
    // For HTML, extract text content
    body = extractTextContent(raw);
  }

  // Build frontmatter
  let fm = `---\n`;
  fm += `title: ${JSON.stringify(title)}\n`;
  fm += `date: ${blog.date}\n`;
  fm += `description: ${JSON.stringify(description)}\n`;
  fm += `tags: [${blog.tags.join(', ')}]\n`;
  fm += `draft: false\n`;
  fm += `---\n\n`;

  fs.writeFileSync(outFile, fm + body + '\n');
  console.log(`✓ ${blog.slug}.md`);
  converted++;
}

console.log(`\nDone. Migrated ${converted}/${blogFiles.length} posts.`);
