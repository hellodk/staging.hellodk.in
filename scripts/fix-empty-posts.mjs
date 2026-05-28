// fix-empty-posts.mjs — re-extracts body from original Jekyll HTML files
// for posts that were migrated with empty bodies
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const POSTS_OUT = path.join(ROOT, 'src/content/blog');

// Map: slug → source file (relative to ROOT)
const SOURCES = {
  'configure-multiple-ssh-identities': '_jekyll-backup/_drafts/2017-04-24-configure_multiple_ssh_identities_for_gitbash_mac_linux.html',
  'detecting-dead-tcp-connections':    '_jekyll-backup/_drafts/2017-04-24-detecting-dead-tcp-connections.html',
  'haproxy-for-beginners':             '_jekyll-backup/_drafts/2017-04-20-ha_proxy_for_beginners.html',
  'yum-commands-quick-reference':      '_jekyll-backup/_drafts/2017-06-10-yum_commands_quick_reference.html',
  'mysql-master-master-replication':   '_jekyll-backup/_drafts/2017-06-21-mysql_master_master_replication_insights.html',
  'understanding-lvm-basics':          '_jekyll-backup/_drafts/2017-08-21-understanding_basics_of_lvm.html',
  'understanding-dns':                 '_jekyll-backup/_drafts/2017-12-13-understanding_dns.html',
  'working-with-aureport':             '_jekyll-backup/_drafts/2020-03-20-working_with_aureport.html',
  'generating-ssl-certificates':       '_jekyll-backup/_drafts/2020-05-08-generating-ssl-certificates.html',
  'dns-explained':                     '_jekyll-backup/_drafts/2020-05-09-dns-explained.html',
  'vagrant-with-qemu-kvm':             '_jekyll-backup/_drafts/2020-05-29-vagrant_with_qemu_kvm.html',
  'exploring-top-command':             '_jekyll-backup/_drafts/2020-06-01-exploring_top_command_in_linux.html',
  // From _jekyll-backup/_posts/
  'creating-a-lets-encrypt-certificate': '_jekyll-backup/_posts/2020-08-20-creating-a-lets-encrypt-certificate.html',
  'libre-office-writer-watermark':     '_jekyll-backup/_posts/2020-07-06-libre-office-writer-watermark.html',
  'the-first-snowfall-encounter':      '_jekyll-backup/_posts/2019-12-21-the-first-snowfall-encounter.html',
};

function extractBodyFromJekyllHtml(raw) {
  // Jekyll partials: strip the YAML frontmatter (--- ... ---), keep the rest
  const fmMatch = raw.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  if (fmMatch) return fmMatch[1].trim();
  // No frontmatter — return as-is
  return raw.trim();
}

let fixed = 0;
for (const [slug, srcRel] of Object.entries(SOURCES)) {
  const destFile = path.join(POSTS_OUT, `${slug}.md`);
  if (!fs.existsSync(destFile)) {
    console.log(`SKIP (dest missing): ${slug}.md`);
    continue;
  }

  // Read existing frontmatter from dest
  const existing = fs.readFileSync(destFile, 'utf8');
  const fmMatch = existing.match(/^(---[\s\S]*?---\n)/);
  if (!fmMatch) {
    console.log(`SKIP (no frontmatter): ${slug}.md`);
    continue;
  }
  const frontmatter = fmMatch[1];

  // Check if it already has body content
  const bodyInDest = existing.slice(frontmatter.length).trim();
  if (bodyInDest.length > 50) {
    console.log(`OK (has content): ${slug}.md`);
    continue;
  }

  // Extract body from source
  const srcFile = path.join(ROOT, srcRel);
  if (!fs.existsSync(srcFile)) {
    console.log(`SKIP (src missing): ${srcRel}`);
    continue;
  }

  const raw = fs.readFileSync(srcFile, 'utf8');
  const body = extractBodyFromJekyllHtml(raw);

  if (!body || body.length < 20) {
    console.log(`SKIP (empty src body): ${slug}`);
    continue;
  }

  fs.writeFileSync(destFile, frontmatter + '\n' + body + '\n');
  console.log(`✓ fixed ${slug}.md (${body.length} chars)`);
  fixed++;
}

console.log(`\nFixed ${fixed} posts.`);
