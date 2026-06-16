---
title: "pnpm: The Package Manager That Actually Respects Your Disk"
date: 2026-04-01
description: "pnpm: The Package Manager That Actually Respects Your Disk"
tags: [nodejs, npm, pnpm]
draft: false
---



Deep Dive · Package Managers
    
## pnpm: The Package Manager That Actually Respects Your Disk

    How a content-addressable store and hard links turned a 50 GB node_modules problem into a solved one.

    
      ~90%less disk space vs npm
      3×faster installs (cached)
      1copy of each package, ever
      0phantom dependency bugs
    
  

  
    
## The node_modules Problem You've Learned to Live With

    Every JavaScript developer has been here: you open a project folder and it's 300 MB. You have 20 projects. That's 6 GB — mostly duplicates.

    npm and Yarn both work the same way at the storage layer: every project gets its own isolated copy of every dependency. **react@18 in project A is a completely separate set of files from react@18 in project B.** Even if both projects use identical versions, the bytes are duplicated on disk twice.

    Scale that to a team with a monorepo, a CI server, and a developer laptop with 30 Node projects, and you're managing hundreds of gigabytes of redundant data.

    
      
        💾
        
## Redundant Storage

        Each project downloads and stores its own full copy of every dependency, even if identical versions exist elsewhere on the machine.

      
      
        🐌
        
## Slow Re-installs

        Delete node_modules, run npm install — it downloads everything again. No cross-project reuse of already-downloaded packages.

      
      
        👻
        
## Phantom Dependencies

        npm's flat node_modules lets code require packages it never declared. Works until a transitive dep changes version. Silent time bombs.

      
      
        🏗️
        
## Monorepo Pain

        Sharing packages across workspace packages in a monorepo requires complex hoisting workarounds and still duplicates transitive deps.

      
    
  

  
    
## The Content-Addressable Store: One Copy, Infinite Projects

    pnpm maintains a single global store at `~/.local/share/pnpm/store`. Every package version is stored exactly once. Projects get hard links — not copies.

    A **hard link** is a second directory entry pointing to the same bytes on disk. Reading the file from either location is identical — the OS sees one file. When 10 projects all use `react@18.2.0`, there is exactly one physical copy on your disk shared by all ten.

    
    
      
        

        
        npm / Yarn approach

        
        
        
          
          Project A
          react@18 (14MB)
          lodash@4 (6MB)
        
        
        
          
          Project B
          react@18 (14MB)
          lodash@4 (6MB)
        
        
        
          
          Project C
          react@18 (14MB)
          lodash@4 (6MB)
        

        
        
          
          Total: 60 MB (×3 copies)
        

        
        
        VS

        
        pnpm approach

        
        
          
          
          Global
          Store
          ~/.pnpm/store

          
          
          react@18 (14MB ×1)
          
          lodash@4 (6MB ×1)
        

        
        
          
          Project A
          
          Project B
          
          Project C
        

        
        
        
        

        
        
          hard link
          hard link
          hard link
        

        
        
        
        

        
        
          
          Total on disk: 20 MB (shared by all)
        

        
        
        
        
        
        
        
      
      npm duplicates packages per-project; pnpm stores each version once and hard-links it everywhere
    

    Because hard links share the same inode, the OS treats them as a single file. Deleting `node_modules` in one project leaves the store and all other projects completely intact. The store entry is only freed when no project references it.

  

  
    
## Real-World Disk Savings

    The savings compound as you add projects. By 10 projects the difference between npm and pnpm is measured in gigabytes.

    
    
      
        

        
        1 GB
        750 MB
        500 MB
        250 MB
        0

        
        
        
        
        
        

        
        1 project
        3 projects
        5 projects
        10 projects

        
        
        npm
        
        Yarn
        
        pnpm

        
        
          
          
          200
          
          
          190
          
          
          170
        

        
        
          
          600
          
          540
          
          190
        

        
        
          
          1000
          
          900
          
          200
        

        
        
          
          
          2000+
          
          
          
          
          1800+
          
          
          
          220
        

        
        
        
        
        
      
      Disk usage (MB) for projects sharing a common set of dependencies. pnpm barely grows with each new project.
    

    The reason pnpm's bar barely moves: the packages are already in the store. Adding a new project that uses the same dependencies costs only a few kilobytes of hard link entries — not megabytes of package files.

    "On a laptop with 20 Node projects, switching from npm to pnpm recovered 18 GB of disk space on the first run."
  

  
    
## Installation Speed: Cold Cache vs Warm Cache

    pnpm shines most on repeat installs. Once a package is in the global store, installing it into a new project is near-instant — no download, just hard link creation.

    
    
      
        

        
        Installation Time (lower = faster)

        
        First install (cold cache)

        
        npm
        
        
        ~ 8.2s

        
        Yarn
        
        
        ~ 6.0s

        
        pnpm
        
        
        ~ 3.5s

        
        
        Re-install (warm cache, packages in store)

        
        npm
        
        
        ~ 5.8s

        
        Yarn
        
        
        ~ 4.1s

        
        pnpm
        
        
        ~ 0.9s

        
        
          
          just hard links!
        

        
        
        
      
      Times are representative benchmarks for a mid-sized app (~50 deps). pnpm's warm-cache install creates hard links instead of copying files.
    

    Why is pnpm's warm-cache so fast? When you delete `node_modules` and re-run `pnpm install`, no package is downloaded. pnpm walks the `package.json`, confirms each version is in the store, and creates hard links. The entire operation is metadata manipulation — the filesystem equivalent of instant.

    npm and Yarn must still verify file integrity and re-copy files on each install, even with a populated cache.

  

  
    
## Strict Isolation: No Phantom Dependencies

    npm and Yarn hoist all packages to a flat `node_modules/`. This means your code can accidentally import a package it never declared — and your CI will explode when that transitive dep disappears.

    
    
      
        

        
        npm flat node_modules

        
        
          
          
          node_modules/

          
          ├── react/
          ├── lodash/
          ├── scheduler/ (transitive)
          ├── prop-types/ (transitive)
          ├── loose-envify/ (transitive)
          └── js-tokens/ (transitive)
        

        
        
          
          // Works! (but it's a trap)
          import { debounce } from 'lodash'
        

        
        
          
          ⚠ Phantom dep — not in package.json
        

        
        

        
        pnpm strict symlinks

        
          
          
          node_modules/

          
          ├── react/   → .pnpm/react@18/
          └── .pnpm/    (hidden store)
          ├── react@18/node_modules/
          │   ├── scheduler/
          │   └── prop-types/
          └── lodash@4/ (not declared!)
        

        
        
          
          // Blocked by pnpm
          import { debounce } from 'lodash'
        

        
        
          
          ✓ ERR: lodash not in package.json
        
      
      npm exposes transitive deps for accidental use; pnpm's symlink layout makes them invisible to your code
    

    pnpm's `node_modules` only exposes packages you actually declared. Your dependencies' dependencies are nested inside `.pnpm/` where your code cannot reach them. If you accidentally use a transitive package, pnpm will error during install — not during a production deploy six months later when a transitive dep is updated.

  

  
    
## First-Class Workspace Support for Monorepos

    pnpm's workspace support is built in — no plugins, no Lerna, no Nx required for the basics. Add a `pnpm-workspace.yaml` and all your packages share the same store, link to each other automatically, and run scripts across the entire repo.

`# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'`

    Cross-package references use the `workspace:` protocol — pnpm links them as hard-linked directory entries during development, then replaces with real version numbers during publish.

`# packages/ui/package.json
{
  "dependencies": {
    "@myapp/utils": "workspace:*"
  }
}`

    
      
        🔗
        
## workspace:* Protocol

        Local packages reference each other via symlinks during development. No manual linking, no `npm link` confusion.

      
      
        🏃
        
## Recursive Scripts

        `pnpm -r run build` runs build in every workspace package. Add `--parallel` for concurrent execution.

      
      
        🔍
        
## Filter by Package

        `pnpm --filter @myapp/ui run test` runs only in the packages you specify, with dependency awareness.

      
    
  

  
    
## Getting Started in 60 Seconds

    
## Install pnpm

`# Via npm (ironic, but it works)
npm install -g pnpm

# Or via the standalone script (no Node required)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Or with Homebrew
brew install pnpm`

    
## Migrate an Existing Project

`# Remove old lockfile and node_modules
rm -rf node_modules package-lock.json yarn.lock

# Install with pnpm — it reads your package.json
pnpm install

# A pnpm-lock.yaml is generated — commit this`

    
## Drop-In Command Replacements

    
      
        
          npm / Yarnpnpm equivalentNotes
        
        
          `npm install``pnpm install`Reads pnpm-lock.yaml
          `npm install react``pnpm add react`Adds to dependencies
          `npm install -D eslint``pnpm add -D eslint`Adds to devDependencies
          `npm run build``pnpm run build` or `pnpm build`Scripts work identically
          `npx create-next-app``pnpm dlx create-next-app`dlx = one-time exec without install
          `npm update``pnpm update`Respects semver ranges
          `npm outdated``pnpm outdated`Shows what can be updated
        
      
    

    
## Pro Commands Worth Knowing

`# See where the store lives and how big it is
pnpm store path

# Remove packages no longer referenced by any project
pnpm store prune

# Run a script across all workspace packages
pnpm -r run test

# Run only in packages that changed since git HEAD
pnpm --filter ...[HEAD~1] run build

# Show why a package is installed
pnpm why lodash

# Interactive update (choose what to bump)
pnpm update --interactive`
  

  
    
## pnpm vs npm vs Yarn: Feature Matrix

    
      
        
          FeaturenpmYarn Berrypnpm
        
        
          
            **Disk efficiency**
            Copies per project
            Cache, no hard links
            Hard links, 1 copy
          
          
            **Re-install speed**
            Re-copies all files
            Copies from cache
            Links in ms
          
          
            **Phantom deps**
            Allowed (flat)
            Blocked (PnP)
            Blocked (symlinks)
          
          
            **Workspace support**
            Workspaces (basic)
            Workspaces + PnP
            workspace:* protocol
          
          
            **Node.js compat**
            Universal
            Needs .yarnrc.yml
            Drop-in compatible
          
          
            **lockfile format**
            package-lock.json
            yarn.lock
            pnpm-lock.yaml (readable)
          
          
            **Learning curve**
            None
            High (PnP mode)
            Very low
          
        
      
    
  

  
    
      
## Try It Right Now

      pnpm is a single install command away and works with every existing Node.js project. No configuration changes needed for basic usage.

      
npm install -g pnpm
pnpm install   # drop-in for npm install
      Your package.json and existing scripts remain unchanged.

    
  

  Written for developers tired of 50 GB node_modules directories. · pnpm.io · MIT Licensed
