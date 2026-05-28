---
title: "How a Routine apt upgrade Silently Broke GNOME Thumbnails for a Week"
date: 2026-05-23
description: "A May 15 gdk-pixbuf security patch rebuilt the loader cache on disk while Nautilus was running with the old one in memory. Tracker3's database went corrupt. Ubuntu 24.04's AppArmor silently blocked bwrap. Three independent failures. Zero user-visible errors. Eight days of broken thumbnails."
tags: [linux, ubuntu, debugging, gnome, apparmor]
draft: false
---

A May 15 gdk-pixbuf security patch rebuilt the loader cache on disk while Nautilus was still running with the old one in memory. Tracker3's database went corrupt. And underneath both of those — Ubuntu 24.04's AppArmor was silently blocking `bwrap`, the sandbox that `libgnome-desktop 44` wraps around every thumbnailer call. Three independent failures. Zero user-visible errors. Eight days of broken thumbnails.


## ① How GNOME Thumbnail Generation Works


There are more moving parts in the thumbnail pipeline than most users realise. Understanding them makes the failure obvious in hindsight.


Animation — normal thumbnail pipeline from file on disk to Nautilus display


① Browse
② Render PNG
③ Queue Job
④ Write to Cache
⑤ Display


File on disk
image / video / PDF
any format


- Thumbnailer gdk-pixbuf ffmpegthumbnailer heif-thumbnailer Tracker3 tracker-miner-fs-3 thumbnail job queue NEW in GNOME 46 Thumbnail Factory gnome-thumbnail-factory writes PNG to cache 📁 Nautilus Renders Thumbnail Failure path → fail/ written, never retried ▲ Tracker3 breaks here → all thumbnails stall packet travelling through pipeline success → cached in large/ failure → written to fail/ Tracker3 (GNOME 46 addition) The critical detail: **in GNOME 46, Nautilus routes thumbnail job requests through Tracker3**. This is a newer coupling that didn't exist in GNOME 42/43. If Tracker's SQLite database can't be opened, the entire queue stalls — and every failed request gets written to `~/.cache/thumbnails/fail/` as a permanent block. ## ② The Timeline of Failure 8 May 2026 · 07:39 gnome-shell → 46.0-0ubuntu6~24.04.14 Routine security update. No thumbnail impact on its own — but this version tightens the Tracker3 integration. 15 May 2026 · 08:05 heif-gdk-pixbuf + heif-thumbnailer upgraded Post-install hook rewrites `loaders.cache` on disk. Nautilus is already running and never reads it again until restarted. Thumbnail generation for HEIF and related formats begins silently failing with no user-visible error. Between May 15–22 Tracker3 database becomes corrupt `~/.cache/tracker3/files/meta.db` can no longer be opened. Journal: *"Could not open sqlite3 database: unable to open database file."* All thumbnail job requests now return a D-Bus error and immediately write fail entries. Fail cache grows silently in the background. 22 May · First diagnosis 1,754 fail entries found — all external drives `show-image-thumbnails` changed to `always`, fail cache cleared. Local thumbnails recover briefly, but Tracker3 is still broken and refills the cache overnight. 23 May · 07:54 — morning Fail cache back to 7,907 entries EOG also reporting "Thumbnail creation failed." dconf database recreated (indicates a background GNOME settings event). Tracker3 still throwing database errors on every Nautilus browse. 23 May · Partial fix tracker3 reset + fail cache cleared + Nautilus restarted Tracker3 rebuilds clean. Fail cache wiped. But thumbnails still fail — EOG logging "Thumbnail creation failed" continuously. Root cause not yet fully identified. 23 May · Deeper diagnosis bwrap sandbox identified as the real blocker `GnomeDesktopThumbnailFactory` tested directly via Python — throws `g-spawn-exit-error-quark: Child process exited with code 1`. Traced to `bwrap: setting up uid map: Permission denied`. Ubuntu 24.04 AppArmor restricts unprivileged user namespaces; `bwrap` needs them to create its sandbox around every thumbnailer call. 23 May · Full fix applied sysctl kernel.apparmor_restrict_unprivileged_userns=0 Unprivileged user namespaces enabled. `bwrap` can now create sandboxes. Fail cache cleared. Thumbnails generate for all file types — images, videos, PDFs. Fix made permanent via `/etc/sysctl.d/60-userns.conf`. ## ③ Root Cause 1 — gdk-pixbuf Loader Hot-Swap When `apt upgrade` installs a new `heif-gdk-pixbuf`, the post-install script calls `update-gdk-pixbuf-loaders`, which rewrites the loaders cache file on disk. This is correct behaviour. The problem is that any process that already read that file at startup gets no notification — it keeps its in-memory copy unchanged. Animation — on-disk loader cache (updated) vs in-memory state (stale) On disk — updated 15 May 08:05 /usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders.cache image/jpeg → gdk-pixbuf 2.42.10+dfsg ✓ image/heic → heif-gdk-pixbuf 1.17.6 ✓ ← updated image/webp → webp-pixbuf 0.0.5 ✓ video/mp4 → ffmpegthumbnailer 2.2.2 ✓ ✓ correct — freshly written by post-install hook diverged no restart In memory — Nautilus (already running) loaded at launch · never reloaded at runtime image/jpeg → gdk-pixbuf 2.42.10+dfsg image/heic → heif-gdk-pixbuf 1.17.4.2 ← STALE STALE image/webp → webp-pixbuf 0.0.5 video/mp4 → ffmpegthumbnailer 2.2.2 ✗ heif requests fail silently — old ABI, new binary on-disk — correct after upgrade in-memory — stale, never reloaded diverged at upgrade, fixed only by restart **Why silent?** gdk-pixbuf doesn't crash when a loader version is mismatched — it returns a null pixbuf and the thumbnail factory silently writes the result to the fail cache. No desktop notification, no terminal error, no log entry the average user would see. ## ④ Root Cause 2 — Tracker3 Database Corruption In GNOME 46, Nautilus tightly integrates with Tracker3 for file search — and, less obviously, for the thumbnail job queue. When Nautilus needs a thumbnail it doesn't have cached, it posts the request via D-Bus to Tracker3. If Tracker can't open its SQLite database, the request immediately returns an error and a fail entry is written. Animation — Nautilus ↔ Tracker3 D-Bus failure loop and fail counter Nautilus sends thumbnail request via D-Bus to Tracker3 On Every Browse D-Bus Call Tracker3 tracker-miner-fs-3 meta.db — CORRUPT unable to open database returns DBUS_ERROR immediately no thumbnail generated DBUS_ERROR Write Fail Entry Fail Cache ~/.cache/thumbnails/ fail/gnome-thumbnail-factory/ entries accrued: 1,754 3,891 7,907 permanent — never retried journalctl --user errors nautilus[…]: Could not open sqlite3 meta.db thumbnail request D-Bus error (corrupt DB) fail entry written — permanent, never retried **The compounding effect:** Nautilus runs as a background `--gapplication-service` daemon even between user sessions. With Tracker3 broken, every background file-monitoring event tried to generate thumbnails, failed, and wrote fail entries — growing from 1,754 to 7,907 entries overnight without the user doing anything. ## ⑤ The Fail Cache Death Spiral The fail cache is designed as a performance optimisation: don't waste CPU retrying files that can never be thumbnailed. But when the failure reason is transient (a broken DB, a stale loader), the optimisation becomes a trap. Animation — the retry-block loop and why only deleting fail/ escapes it every subsequent browse → same result — forever, until fail/ is deleted Browse folder Nautilus requests thumbnail for file Check fail cache MD5 of file URI looked up in fail/ MISS Try generate → fails → new fail entry HIT Skip silently no thumbnail shown no error, no notification only escape Delete the fail cache rm -rf ~/.cache/thumbnails/fail/ then fix the root cause (Tracker3 + Nautilus restart) Nautilus retries all files fresh ✓ no reboot required · takes <10 seconds permanent fail hit — no retry new fail entry written on MISS only escape: delete fail cache ## ⑥ The Fix — Three Commands, Under 10 Seconds Command 1 tracker3 reset -s -r Kills the miner daemon and wipes the corrupt SQLite database. Tracker rebuilds meta.db clean on next start. Command 2 tracker3 daemon -s Starts a fresh Tracker3 daemon with a new empty database. Thumbnail job queue is operational again. Command 3a rm -rf ~/.cache/thumbnails/fail/ Removes 7,907 permanent failure records. Nautilus will retry every file from scratch on next browse. Command 3b nautilus -q && restart Kills the running process (with stale loaders) and spawns a fresh one that reads the current gdk-pixbuf loaders cache. ``` # 1. Reset Tracker3 — kills miner, wipes corrupt meta.db tracker3 reset -s -r # 2. Start fresh Tracker3 daemon tracker3 daemon -s # 3. Wipe all fail entries (permanent failure records) rm -rf ~/.cache/thumbnails/fail/ # 4. Restart Nautilus — picks up current gdk-pixbuf loaders nautilus -q nohup nautilus --gapplication-service &>/dev/null & ``` Animation — fix sequence with progress tracker3 reset kills tracker-miner-fs-3 wipes corrupt meta.db ✓ tracker3 daemon -s fresh empty database job queue restored ✓ rm fail cache 7,907 entries wiped retry blocks removed ✓ 🖼 Thumbnails working fresh loaders · Tracker3 healthy ✓ all file types generate correctly reset daemon start cache clear done ✓ step complete pipeline restored ## ⑥ Root Cause 3 — The One That Kept It Broken Even after fixing Tracker3 and restarting Nautilus, thumbnails kept failing. The thumbnailer binaries worked perfectly from the terminal. Something was breaking them exclusively when called by the GNOME thumbnail factory. Here is exactly what and why. ### What changed in libgnome-desktop 44 Starting with **libgnome-desktop 44**, the `GnomeDesktopThumbnailFactory` — the component that orchestrates thumbnail generation across all of GNOME — was updated to run every thumbnailer inside a **bubblewrap (`bwrap`) sandbox**. This was a deliberate security improvement: if a malicious or malformed file exploits a bug in a thumbnailer, the damage is contained inside an isolated namespace. The factory now does this internally on every thumbnail request: ``` # What gnome-desktop does under the hood — every time: bwrap --ro-bind /usr /usr --proc /proc --dev /dev \ --tmpfs /tmp -- gdk-pixbuf-thumbnailer -s 256 %u %o ``` ### Why it fails on Ubuntu 24.04 `bwrap` creates an isolated sandbox using **Linux user namespaces**. Creating a user namespace requires either a setuid binary or the kernel allowing unprivileged processes to create their own namespaces. Ubuntu 24.04 (kernel 6.x) locks this down via **AppArmor**: **The actual error — buried in the factory, never surfaced to the user:** `bwrap: setting up uid map: Permission denied` Exit code 1. The factory sees a failed subprocess, writes a fail entry to `~/.cache/thumbnails/fail/`, and moves on silently. No desktop notification. No error dialog. Nothing. This is why clearing the fail cache and fixing Tracker3 wasn't enough — the underlying `bwrap` call was failing before the thumbnailer even started. Every single thumbnail attempt, for every file type, on every browse, was silently blocked at the sandbox layer. ### The fix — one sysctl Allow unprivileged processes to create user namespaces. This re-enables the `bwrap` sandbox that gnome-desktop needs: ``` # Apply immediately (no reboot needed) sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 # Make it survive reboots echo 'kernel.apparmor_restrict_unprivileged_userns=0' | \ sudo tee /etc/sysctl.d/60-userns.conf ``` Then clear the fail cache (which accumulated all the bwrap failures) and let Nautilus regenerate everything fresh: ``` rm -rf ~/.cache/thumbnails/fail/ nautilus -q && nohup nautilus --gapplication-service &>/dev/null & ``` **Is this a security risk?** Slightly. Unprivileged user namespaces are a prerequisite for some container escapes and privilege escalation techniques. Ubuntu 24.04 restricts them by default for this reason. However, many legitimate system tools — including `bwrap`, `flatpak`, `podman`, and Chrome's sandbox — require them. If you run a desktop machine and not a hardened server, this is the accepted trade-off. For servers, consider option B instead: `sudo chmod u+s /usr/bin/bwrap` to give only `bwrap` the privilege it needs. ### Why this was so hard to spot Three reasons this went undiagnosed for 8 days: The thumbnailer binaries work perfectly from the terminal — the failure only happens inside the factory's sandboxed subprocess call.

- The factory writes a fail entry and continues — there is no log line, no notification, and no visible error at any level the user can see.

- The first two root causes (stale loader, corrupt Tracker3) masked this one — fixing them appeared to help briefly, then thumbnails would fail again because the sandbox was still blocked.


## ⑦ Prevention


### Keep Tracker3 healthy

If Nautilus feels sluggish or thumbnails stop working, check Tracker first. A corrupt database silently blocks all thumbnail generation with no visible error.


```
tracker3 status
# On any error → reset (takes 3 seconds, rebuilds cleanly)
tracker3 reset -s -r
```


### Restart Nautilus after gdk-pixbuf upgrades


Any upgrade that touches a package triggering `update-gdk-pixbuf-loaders` invalidates the in-memory loader map. Nautilus never reloads it — only a restart picks up the new loaders.


```
grep -i 'gdk-pixbuf\|thumbnailer' /var/log/dpkg.log | tail -20
# If you see a recent hit → restart Nautilus
nautilus -q && nohup nautilus --gapplication-service &>/dev/null &
```


### Choose the right thumbnail scope


The `show-image-thumbnails` setting controls which files Nautilus will attempt to thumbnail. Mismatches between this setting and which drives are mounted are the primary cause of fail cache accumulation.


```
# local-only (default) — no fail cache pollution from unmounted drives
gsettings set org.gnome.nautilus.preferences show-image-thumbnails 'local-only'

# always — includes mounted external drives
gsettings set org.gnome.nautilus.preferences show-image-thumbnails 'always'
```


**Architecture note:** The freedesktop.org thumbnail spec defines a shared repository (`.sh_thumbnails/`) on each removable volume so thumbnails travel with the drive and fail records don't pollute the local cache. GNOME reads from `.sh_thumbnails/` but doesn't write to it automatically. Until that's implemented, `local-only` is the cleanest setting if you want zero fail-cache noise from unmounted drives.
