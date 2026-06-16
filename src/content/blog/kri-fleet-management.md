---
title: "kri: Building an Enterprise Fleet Management Platform for Mac Mini Build Infrastructure"
date: 2026-05-15
description: "kri: Building an Enterprise Fleet Management Platform for Mac Mini Build Infrastructure"
tags: [kri, devops, fleet-management]
draft: false
---



Open Source · DevOps
    
## kri: Building an Enterprise Fleet
Management Platform for Mac&nbsp;Mini
Build Infrastructure

    How we built a full-stack fleet control plane — Salt, Ansible, FastAPI, React, TimescaleDB — that turns a rack of headless Mac Minis into a managed, observable, drift-detecting build fleet.

    
      
        
        May 2026
      
      
        
        15 min read
      
    
    
      macOS
      Salt
      Ansible
      FastAPI
      React
      PostgreSQL
      TimescaleDB
      Celery
      Docker
    
  

  
  
    
## 1 The Problem: N Mac Minis, Zero Visibility

    A iOS/macOS build fleet sounds simple: a few Mac Minis running Xcode, Jenkins agents, and signing tools. In practice, a fleet of even six machines quickly becomes a management nightmare — each one an island of configuration drift, manual SSH sessions, and tribal knowledge.

    Before kri, the workflow looked like this: **need to check what version of Homebrew is on mac-mini-04?** SSH in. Need to push an updated cert? SSH in, scp, sudo. **Which nodes are online right now?** Ping them one by one. Did the Xcode update actually land on all nodes? Nobody knows for certain.

    
      
      
        
          
        

        
        Before kri — every node is an island

        
        
          
          mac-mini
          -01
          
        
        
          
          mac-mini
          -02
          
        
        
          
          mac-mini
          -03 (offline?)
          
        
        
          
          mac-mini
          -04
          
        
        
          
          mac-mini
          -05 (stale)
          
        

        
        ?
        ?
        !
        ?
        ?

        
        
          
          👤
          ops engineer
          manually SSHing everywhere
        

        
        
          - 
          
          
          
          
        
      
      Five Mac Minis, five SSH sessions, zero centralised state. One is offline — or maybe just slow to respond. Nobody knows.

    

    The operational problems compound quickly: **package drift** (each node runs slightly different Homebrew versions after ad-hoc installs), **no audit trail** (who ran what and when), **no SBOM** (what is actually installed on each node?), and **no bootstrap automation** (standing up a new node takes an afternoon of manual work).

    kri is the answer to all of these. It is a full control plane — a FastAPI backend, a React dashboard, SaltStack for ongoing configuration management, Ansible for bootstrap automation, and TimescaleDB for time-series drift history — containerised with Docker Compose and designed to run on a small management server (another Mac Mini, a Linux box, anything).

  

  
  
    
## 2 Architecture Overview

    The kri stack is seven services in a single Docker Compose file. The browser talks to nginx (baked into the frontend container), which reverse-proxies the React SPA and forwards `/api/*` to the FastAPI container. Long-running operations — bootstrap, drift, SBOM indexing, playbook runs — are dispatched to Celery workers via Redis. The Salt master runs as a sidecar, maintaining persistent ZeroMQ connections to minions across your LAN.

    
      
      
        
          
            
          
          
            
          
          
            
          
          
        

        
        
          
          Browser
          React + TanStack Query
        

        
        
          
          HTTP
        

        
          
          nginx
          port 80 → api:8000
        

        
        
          
          /api/*
        

        
          
          FastAPI
          api container · port 8000
          21 routers · JWT auth
        

        
        
          
        

        
        
          
          PostgreSQL
          + TimescaleDB · fleet_demo
        

        
          
          Redis 7.4
          queue + JWT revocation
        

        
        
          
          
        

        
        
          
          Celery Worker
          queues: default · drift · sbom · maintenance
        

        
        
          
        

        
        
          
        

        
        
          
          Ansible Runner
          bootstrap playbooks · SSH
        

        
          
          Salt Master
          ports 4505/4506 · ZeroMQ
        

        
        
          
          
        

        
        
          
          
        

        
        
          
          Mac Minis (SSH)
        
        
          
          bootstrap
        

        
          
          Mac Minis
        
        
          
          Salt minions
        

        
        
          
          grains → /api/v1/ingest
        
      
      Full kri architecture. Browser talks to nginx; nginx proxies the React SPA and `/api/*` to FastAPI. Celery workers pull from Redis queues and dispatch to Ansible (bootstrap) or Salt (config management). Mac Minis send grains back via the ingest endpoint.

    

    The services in the Docker Compose file (`deploy/docker-compose.yml`) are: **db** (TimescaleDB on PostgreSQL 17), **redis** (7.4-alpine with authentication), **api** (FastAPI via uvicorn), **worker** (Celery, four queues), **beat** (Celery scheduler for periodic tasks), **salt-master** (saltstack/salt, ZeroMQ on 4505/4506), and **frontend** (React SPA behind nginx, port 80).

    The API container and the worker share the same Docker image — the same codebase, just different entry points. Both mount the Salt PKI volume so that accepted key files are shared between the API (which reads/writes keys via the `/api/v1/salt/keys` router) and the Salt master (which authenticates minions against those files).

  

  
  
    
## 3 Bootstrap Flow: From Unknown to Fleet Member

    Standing up a new Mac Mini in kri takes one click. The bootstrap process is a sequence of automated steps that goes from *"we know the IP"* to *"minion authenticated, grains flowing, node visible in dashboard"*. Here is the sequence:

    
      
      
        
          
          
            
          
        

        
        

        
        
          
          🖱️
          Click
          + Bootstrap
          Node
        

        
          
        

        
          
          🔐
          Ansible SSH
          connects to
          target IP
        

        
          
        

        
          
          ⚙️
          Salt minion
          installed +
          configured
        

        
          
        

        
          
          📡
          Grains pushed
          → /api/v1
          /ingest/grains
        

        
          
        

        
          
          🖥️
          Node appears
          in fleet
          dashboard
        

        
          
        

        
          
          🔑
          Salt key pending
          admin accepts
          in Minion Keys UI
        

        
        
          Step 1
          Step 2
          Step 3
          Step 4
          Step 5
          Step 6
        
      
      Bootstrap is a one-click operation. Steps 2–4 run asynchronously in the Celery worker. The UI streams live Ansible output during the process.

    

    A critical detail: on re-bootstrap, kri automatically deletes the node's previously accepted Salt key before queuing the Ansible task. This prevents the *"cached the public key"* authentication loop where a re-imaged Mac Mini presents a new keypair but the master still has the old accepted key on disk. The response tells the operator exactly what happened:

    fleet_platform/api/routes/ansible.py — bootstrap endpoint
    @router.post("/bootstrap", response_model=BootstrapResponse, status_code=202)
@limiter.limit("10/minute")
async def bootstrap(
    request: Request,
    payload: BootstrapRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_role("operator", "admin")),
):
    # Validate minion_id format: [a-zA-Z0-9._-] only
    if not _MINION_ID_RE.match(payload.minion_id):
        raise HTTPException(status_code=422, ...)

    # 409 if already bootstrapping — prevents double-queue
    if node and node.bootstrap_status == "bootstrapping":
        raise HTTPException(status_code=409, detail="Node is already being bootstrapped")

    # Delete the old accepted Salt key to prevent auth loop on re-bootstrap
    _accepted_key = Path(_pki_base) / "minions" / payload.minion_id
    if _accepted_key.exists():
        _accepted_key.unlink()
        salt_key_deleted = True

    task = bootstrap_node.delay(
        str(node.id), payload.target_ip,
        ssh_username=payload.ssh_username,
        ssh_password=payload.ssh_password,
    )
    return BootstrapResponse(node_id=node.id, job_id=task.id, ...)

    The node must belong to at least one group before bootstrapping is allowed. This ensures that SSH credentials — stored encrypted with Fernet at the group level — are available to the Ansible runner. The group model is the administrative boundary around a set of nodes.

  

  
  
    
## 4 Drift Detection: Baseline vs Reality

    Drift detection is kri's most operationally valuable feature. It works by comparing a **baseline** — a snapshot of the intended state, pinned from a known-good node — against the **actual state** reported by each node's Salt grains on every check-in. The result is a numeric drift score: 0 means perfectly aligned, higher numbers mean more divergence.

    
      
      
        
          
        

        
        
          
          Baseline (Expected)
          🔒

          
          
            brew: node@20.11.0
            brew: python@3.12.2
            brew: git@2.44.0
            brew: curl@8.6.0
            Xcode: 15.3
            macOS: 14.4.1
          
        

        
        
          
          Node State (Actual)
          📡

          
          
            brew: node@20.11.0
            brew: python@3.12.2
            brew: git@2.44.0
            brew: curl@8.7.1 ⬆
            Xcode: 15.2 (stale)
            macOS: 14.4.1
          
        

        
        
        
        
        

        
        
        

        
        
          
          Drift Score
          55
        

        
        Drift Engine — comparing baseline vs live node state
        
          ✓ match
          ✗ drift
        
      
      Two packages diverged: curl bumped a minor version, Xcode is one release behind. The drift engine produces a score of 55. The `compute_drift` Celery task fires automatically after every grain ingest.

    

    The ingest endpoint triggers drift computation on every grain check-in via a Celery task. Drift data is stored in TimescaleDB as a time-series, meaning you can trend drift scores over time — a useful signal for understanding whether your fleet is drifting further apart or converging after a remediation run.

    
## Grain extraction: the ingest endpoint

    The `_extract_node_updates` function is responsible for translating raw Salt grains — the facts the minion reports about itself — into structured node fields. It handles IP address resolution, hostname sanitisation (including filtering out reverse-DNS artefacts from Tailscale), and hardware metadata:

    fleet_platform/api/routes/ingest.py — grain extraction
    def _extract_node_updates(grains: dict) -> dict:
    ip: str | None = None
    _skip_prefixes = ("127.", "169.254.", "::1", "fe80")

    ip4 = grains.get("ip4_interfaces", {})
    for iface, addrs in ip4.items():
        if iface in ("lo", "lo0"):
            continue
        for addr in addrs:
            if not any(addr.startswith(p) for p in _skip_prefixes):
                ip = addr; break

    # Hostname priority:
    # 1. `host` grain — uname -n, always reliable
    # 2. `fqdn` — only if NOT a reverse-DNS artefact (.ip6.arpa)
    # 3. `id` grain — minion ID, always present as last resort
    raw_host = grains.get("host") or ""
    raw_fqdn = grains.get("fqdn") or ""
    fqdn_valid = raw_fqdn and not raw_fqdn.lower().endswith(
        (".ip6.arpa", ".in-addr.arpa")
    )
    hostname = raw_host or (raw_fqdn if fqdn_valid else None) or grains.get("id")

    return {
        "hostname":       hostname,
        "ip_address":     ip,
        "os_version":     grains.get("osrelease"),
        "hardware_model": grains.get("productname"),
        "cpu_cores":      grains.get("num_cpus"),
        "ram_gb":         grains.get("mem_total", 0) / 1024 if grains.get("mem_total") else None,
        "storage_gb":     _extract_storage_gb(grains),
        "status":         "online",
    }
  

  
  
    
## 5 Salt Key Lifecycle

    SaltStack's security model requires that a minion's public key be explicitly accepted by the master before any communication can happen. kri enforces a **no-auto-accept policy**: keys always land in *pending* and require an administrator action. This is the correct posture for a production fleet — it prevents rogue minions from connecting without authorisation.

    
      
      
        
          
          
            
          
        

        
        
          
          Bootstrap triggered
          Ansible run queued in Celery
        

        
          
        

        
        
          
          Old key auto-deleted
          /etc/salt/pki/master/minions/{id}
        

        
          
        

        
        
          
          Ansible SSH bootstrap
          installs salt-minion + new keypair
        

        
          
        

        
        
          
          New key arrives
          in pending queue
        

        
          
        

        
        
          
          Admin reviews Minion Keys
          POST /api/v1/salt/keys/{id}/accept
        

        
          
        

        
        
          
          Node authenticated ✓
          Salt commands now work
        
      
      The full Salt key lifecycle. kri never auto-accepts — every key requires a deliberate accept action from an operator or admin.

    

    The Salt key API is intentionally thin — it reads directly from the Salt PKI directory mounted as a shared volume, mirroring what `salt-key -L` would show. This avoids any state synchronisation problem: the source of truth is always the filesystem the Salt master itself reads.

    fleet_platform/api/routes/salt_keys.py — key management
    @router.post("/keys/{minion_id}/accept")
async def accept_key(
    minion_id: str,
    _: dict = Depends(require_role("operator", "admin")),
):
    "Accept a pending minion key — moves file from minions_pre/ to minions/"
    _validate_minion_id(minion_id)
    dirs = _dirs()
    src = dirs["pending"] / minion_id
    if not src.exists():
        raise HTTPException(status_code=404, detail=f"No pending key for '{minion_id}'")
    dirs["accepted"].mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dirs["accepted"] / minion_id))
    return {"status": "accepted", "minion_id": minion_id}

@router.delete("/keys/{minion_id}")
async def delete_key(
    minion_id: str,
    _: dict = Depends(require_role("admin")),
):
    "Delete a key from any status bucket (accepted, pending, rejected, denied)"
    _validate_minion_id(minion_id)
    for path in _dirs().values():
        target = path / minion_id
        if target.exists():
            target.unlink()
            return {"status": "deleted", "minion_id": minion_id}
    raise HTTPException(status_code=404, detail=f"No key found for '{minion_id}'")

    
      **Why not use `salt-key` CLI via subprocess?** We considered it. The problem is that the Salt master container may not be reachable from the API container via subprocess, and shelling out into another container is fragile. Reading/writing the shared PKI volume directly is simpler, faster, and has no external dependency beyond the shared Docker volume mount.

    
  

  
  
    
## 6 Security Architecture

    kri is designed to manage infrastructure that signs iOS apps and has privileged SSH access to build machines. Security is a first-class concern, not an afterthought. Here is the full security stack:

    
      
        Fernet encryption at rest
        SSH passwords, SSH keys, playbook source tokens, and all node secrets are encrypted with Fernet (symmetric, authenticated) before being written to PostgreSQL. The key lives in the environment, never in the database.

      
      
        JWT + Redis revocation
        Access tokens are JWTs (short-lived). Refresh tokens are stored in Redis with a TTL. Logout invalidates the Redis entry immediately — no waiting for the JWT to expire naturally.

      
      
        WebSSH with command blocking
        The WebSSH terminal (proxied via the `/api/v1/webssh` router) supports a configurable denylist of commands. Dangerous operations can be blocked at the proxy level without touching the target node's sudoers.

      
      
        SBOM + CVE scanning (Trivy)
        Every node reports its installed packages via Salt grains. kri indexes these as a Software Bill of Materials and can run Trivy CVE scans against the SBOM, surfacing vulnerable packages in the dashboard.

      
      
        Salt minion key approval gate
        No minion is ever auto-accepted. Every new key lands in *pending* and requires an explicit admin action. This prevents rogue or mis-configured machines from joining the Salt bus.

      
      
        Pre-push credential hooks
        Git pre-push hooks (committed into the repo) scan staged diffs for secrets using `detect-secrets`. A push that contains a credential pattern is blocked before it reaches the remote.

      
    

    
      **Node tokens:** Each Mac Mini authenticates to the ingest endpoint using a per-node token (bcrypt-hashed in PostgreSQL, transmitted via the `X-Node-Token` header). This token is generated at bootstrap time and written to the node's Salt pillar. The API never stores the plaintext token after generation.

    

    The FastAPI app itself applies rate limiting (via slowapi) to all ingest and bootstrap endpoints, CORS is restricted to the configured frontend origin, and the Swagger UI is disabled in production (only available when `is_development=True`).

  

  
  
    
## 7 API Router Structure

    The FastAPI application (`fleet_platform/api/main.py`) registers 21 routers at startup. Each router is a focused module with a single responsibility. The full list gives a clear picture of kri's surface area:

    
      
        
          
            Router
            Prefix
            Purpose
          
        
        
          health`/health`Liveness / readiness probe
          auth`/api/v1/auth`Login, refresh, logout, user management
          nodes`/api/v1/nodes`Node CRUD, tags, facts history
          ingest`/api/v1/ingest`Grain ingest, execution results, SBOM upload
          fleet`/api/v1/fleet`Fleet summary, status aggregates
          groups`/api/v1/groups`Node grouping, group SSH credentials
          baselines`/api/v1/baselines`Baseline snapshots, pinning, comparison
          drift`/api/v1/drift`Per-node drift scores and history
          ansible`/api/v1/ansible`Bootstrap, playbook discovery and execution
          salt_keys`/api/v1/salt`Minion key list, accept, reject, delete
          salt_ops`/api/v1/salt-ops`Ad-hoc Salt command execution
          sbom`/api/v1/sbom`SBOM records, CVE scan results
          webssh`/api/v1/webssh`WebSocket SSH terminal proxy
          vnc`/api/v1/vnc`VNC proxy (screen sharing)
          security`/api/v1/security`Secrets scanning, security policies
          audit`/api/v1/audit`Audit log of all admin actions
          node_secrets`/api/v1/node-secrets`Per-node encrypted secrets
          group_secrets`/api/v1/group-secrets`Group-scoped encrypted secrets
          alerts`/api/v1/alerts`Drift/SBOM alert rules
          ios_tracking`/api/v1/ios`Xcode version, cert expiry, signing identities
          platform_settings`/api/v1/settings`Runtime config panel, playbook sources
        
      
    

    All routers are async-first. Database sessions are injected via `get_db` (SQLAlchemy async session factory), authentication is enforced with `require_role("viewer" | "operator" | "admin")` dependency injection, and the unhandled exception handler logs structured errors (via structlog) and returns a consistent `{"error": {"code": ..., "message": ...}}` envelope.

  

  
  
    
## 8 Tech Stack Rationale

    Every technology choice in kri came with a deliberate trade-off evaluation. Here is the honest account:

    
      
        
          
            Technology
            Why chosen
            Trade-off accepted
          
        
        
          
            FastAPI
            Async-first (native asyncio), auto-generates OpenAPI docs, Pydantic v2 for schema validation, excellent ecosystem
            Python async has gotchas; CPU-bound tasks must be offloaded to Celery (we do)
          
          
            PostgreSQL + TimescaleDB
            TimescaleDB hypertables give us automatic partitioning for time-series drift/SBOM data without a separate TSDB. Standard Postgres SQL for everything else
            Heavier than SQLite; requires a real DB server, but appropriate for production fleet data
          
          
            Celery + Redis
            Distributed task queue with proper retry semantics, multiple named queues (drift, sbom, maintenance, default), and built-in result backend. Redis also serves as the JWT revocation store — dual use
            Redis is an additional service to operate; we accept this because we need it for JWT revocation anyway
          
          
            SaltStack
            Pull-based architecture: minions maintain long-lived ZeroMQ connections to the master and react to commands without requiring inbound firewall rules. Excellent macOS grain support
            Salt's learning curve is steep; we wrap most operations behind the kri API so operators never touch `salt` CLI directly
          
          
            Ansible
            Idiomatic bootstrap automation — SSH-based, agentless, mature macOS support via community.general. The salt-minion install playbook is simple YAML any engineer can read and audit
            Ansible is push-based: bootstrap requires SSH access. After bootstrap, Salt takes over for ongoing management
          
          
            React + TanStack Query
            TanStack Query provides background refetch, stale-while-revalidate, and optimistic updates out of the box. The fleet dashboard stays live without manual polling code
            React bundle size; acceptable because this is an internal tool, not a consumer app
          
          
            Python (backend)
            Not CPU-bound (all heavy work is in Ansible/Salt/Celery), native macOS system integration via pyobjc if needed, vast ecosystem for security tooling (cryptography, bcrypt, detect-secrets)
            GIL limits true CPU parallelism — mitigated by Celery workers and async I/O for everything else
          
          
            uv (package manager)
            10–100x faster than pip for dependency resolution and install. Lockfile-based reproducible builds. Drop-in replacement for pip in Docker layers
            Newer tool — some CI environments may need `pip install uv` first
          
        
      
    

    
      **Why Python for the backend?** The common objection is performance. kri's API is not CPU-bound — it spends its time waiting on database queries, Redis calls, and dispatching Celery tasks. Async FastAPI handles hundreds of concurrent requests efficiently in this I/O-bound regime. The work that is CPU-intensive (Ansible playbooks, Salt state execution, Trivy scans) runs in the worker container and never blocks the API event loop.

    
  

  
  
    
## 9 What's Next

    kri is under active development. The roadmap for the next quarter, in rough priority order:

    
      
        
          
          
            **Node Secrets → Salt Pillar injection**
            Encrypted per-node secrets (API keys, signing certificates) automatically injected into the Salt pillar at bootstrap time, so playbooks can reference them as `{{ pillar['secret_name'] }}` without anyone manually managing pillar files.
          
        

        - 
          
          
            **Scheduled Salt state execution**
            Celery Beat already runs periodic tasks. The next step is a scheduler UI where admins can define *"run state X on group Y every 6 hours"* — continuous desired-state enforcement, not just drift reporting.
          
        

        - 
          
          
            **iOS-specific tracking improvements**
            The `/api/v1/ios` router already exists. Next: Xcode version matrix across the fleet, code signing certificate expiry alerts (30-day, 7-day, 1-day thresholds), and Jenkins agent status tracking per node.
          
        

        - 
          
          
            **Deployment history timeline**
            A per-node timeline view showing all bootstrap runs, playbook executions, Salt state applications, and drift score changes on a single axis — full operational history in one place.
          
        

        - 
          
          
            **Alert webhooks**
            The alerts router exists but currently only surfaces alerts in the dashboard. Slack and PagerDuty webhook delivery for drift threshold breaches and CVE discoveries is the obvious next step.
          
        

      
    
  

  

  
    Built with **kri** — Mac Mini fleet management platform · May 2026

    Part of an ongoing series on AI-assisted infrastructure engineering.
