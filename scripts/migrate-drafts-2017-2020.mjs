// scripts/migrate-drafts-2017-2020.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DRAFTS_IN = path.join(ROOT, '_jekyll-backup/_drafts');
const POSTS_OUT = path.join(ROOT, 'src/content/blog');

const draftFiles = [
  {
    src: '2017-04-24-configure_multiple_ssh_identities_for_gitbash_mac_linux.html',
    slug: 'configure-multiple-ssh-identities',
    date: '2017-04-24',
    tags: ['linux', 'ssh', 'git', 'devops'],
  },
  {
    src: '2017-04-24-detecting-dead-tcp-connections.html',
    slug: 'detecting-dead-tcp-connections',
    date: '2017-04-24',
    tags: ['linux', 'networking', 'tcp'],
  },
  {
    src: '2017-04-20-ha_proxy_for_beginners.html',
    slug: 'haproxy-for-beginners',
    date: '2017-04-20',
    tags: ['linux', 'haproxy', 'networking'],
  },
  {
    src: '2017-06-10-yum_commands_quick_reference.html',
    slug: 'yum-commands-quick-reference',
    date: '2017-06-10',
    tags: ['linux', 'rhel', 'centos', 'yum'],
  },
  {
    src: '2017-06-21-mysql_master_master_replication_insights.html',
    slug: 'mysql-master-master-replication',
    date: '2017-06-21',
    tags: ['mysql', 'databases', 'replication'],
  },
  {
    src: '2017-08-21-understanding_basics_of_lvm.html',
    slug: 'understanding-lvm-basics',
    date: '2017-08-21',
    tags: ['linux', 'storage', 'lvm'],
  },
  {
    src: '2017-12-13-understanding_dns.html',
    slug: 'understanding-dns',
    date: '2017-12-13',
    tags: ['linux', 'networking', 'dns'],
  },
  {
    src: '2020-03-20-working_with_aureport.html',
    slug: 'working-with-aureport',
    date: '2020-03-20',
    tags: ['linux', 'security', 'audit'],
  },
  {
    src: '2020-05-08-generating-ssl-certificates.html',
    slug: 'generating-ssl-certificates',
    date: '2020-05-08',
    tags: ['ssl', 'certificates', 'security'],
  },
  {
    src: '2020-05-09-dns-explained.html',
    slug: 'dns-explained',
    date: '2020-05-09',
    tags: ['networking', 'dns', 'devops'],
  },
  {
    src: '2020-05-29-vagrant_with_qemu_kvm.html',
    slug: 'vagrant-with-qemu-kvm',
    date: '2020-05-29',
    tags: ['vagrant', 'virtualization', 'linux'],
  },
  {
    src: '2020-06-01-exploring_top_command_in_linux.html',
    slug: 'exploring-top-command',
    date: '2020-06-01',
    tags: ['linux', 'performance', 'monitoring'],
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
  content = content.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  content = content.replace(/<br\s*\/?>/gi, '\n');

  // Remove HTML tags
  content = content.replace(/<[^>]+>/g, '');

  // Clean up whitespace
  content = content.replace(/\n\n+/g, '\n\n').trim();

  return (descContent || '') + '\n\n' + content;
}

function extractTitle(content, slug) {
  // Try to extract from HTML title tag
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1];
    // Remove common suffixes
    title = title.replace(/\s*—\s*hellodk.*$/, '');
    title = title.replace(/\s*\|\s*hellodk.*$/, '');
    title = title.replace(/\s*\|\s*.*$/, '');
    return title.trim();
  }

  // Use slug as fallback
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractDescription(content) {
  // Try meta description
  const metaMatch = content.match(/<meta name="description" content="([^"]+)"/);
  if (metaMatch) return metaMatch[1].trim();

  return '';
}

fs.mkdirSync(POSTS_OUT, { recursive: true });
let converted = 0;

for (const draft of draftFiles) {
  const srcPath = path.join(DRAFTS_IN, draft.src);
  if (!fs.existsSync(srcPath)) {
    console.log(`SKIP (not found): ${draft.src}`);
    continue;
  }

  const raw = fs.readFileSync(srcPath, 'utf8');
  const outFile = path.join(POSTS_OUT, `${draft.slug}.md`);

  if (fs.existsSync(outFile)) {
    console.log(`EXISTS (skip): ${draft.slug}.md`);
    continue;
  }

  // Extract title and description
  const title = extractTitle(raw, draft.slug);
  const description = extractDescription(raw) || title;

  // Extract body content
  const body = extractTextContent(raw);

  // Build frontmatter
  let fm = `---\n`;
  fm += `title: ${JSON.stringify(title)}\n`;
  fm += `date: ${draft.date}\n`;
  fm += `description: ${JSON.stringify(description)}\n`;
  fm += `tags: [${draft.tags.join(', ')}]\n`;
  fm += `draft: false\n`;
  fm += `---\n\n`;

  fs.writeFileSync(outFile, fm + body + '\n');
  console.log(`✓ ${draft.slug}.md`);
  converted++;
}

console.log(`\nDone. Migrated ${converted}/${draftFiles.length} drafts.`);
