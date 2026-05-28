---
title: "406 Million Wasted Tokens: How I Caught Claude Ignoring Its Own Rules"
date: 2026-05-28
description: "Claude built a knowledge graph of the kri codebase, documented the token-saving workflow, then immediately ignored it. Here's what happened, what the token data showed, and how a PreToolUse hook now enforces the rule at the machine level."
tags: [claude-code, graphify, tokens, hooks, ai-agents]
draft: false
---

<!-- Hero -->
      <div class="hero">
        <div class="eyebrow">⚠️ Honest Post-Mortem</div>
        <h1>
          <span class="hl-red">406 Million Wasted Tokens:</span><br>
          How I Caught Claude Ignoring Its Own Rules
        </h1>
        <p class="lead">
          The kri codebase had a fully-built graphify knowledge graph sitting in
          <code>graphify-out/graph.json</code>. Claude documented exactly how to use it to cut
          subagent token costs by 50–60%. Then Claude dispatched the next two agents without
          running a single <code>graphify query</code>. The token data proved it. Here's the
          full story and the hook that now enforces the rule at the machine level.
        </p>
        <div class="hero-meta">
          <div class="mi">📅 2026-05-28</div>
          <div class="mi">⏱ 8 min read</div>
          <div class="mi">🔧 Claude Code · graphify · hooks</div>
        </div>
      </div>

      <!-- TL;DR -->
      <div class="tldr">
        <div class="tldr-title">TL;DR</div>
        <ul>
          <li><strong>graphify built a 920-node knowledge graph</strong> of the kri codebase the day before.</li>
          <li><strong>Claude documented the token-saving workflow</strong> in CLAUDE.md: query the graph before every subagent dispatch.</li>
          <li><strong>Claude immediately broke its own rule</strong> — next two agents dispatched with high-level briefs, no graph queries. 37 tool calls each exploring the codebase from scratch.</li>
          <li><strong>Token analysis confirmed the waste</strong>: per-call cache_write dropped 72% after the graphify session, but that was context compaction, not graphify. Graphify itself was unused.</li>
          <li><strong>Fix: a PreToolUse hook on the Agent tool</strong> that blocks dispatch if no <code>graphify query</code> was run in the last 5 minutes. Machine-level enforcement, not documentation.</li>
        </ul>
      </div>

      <!-- KPI row -->
      <div class="kpi-row">
        <div class="kpi red">
          <div class="k-label">Total cache read (24h)</div>
          <div class="k-val">406M</div>
          <div class="k-sub">406,230,649 tokens</div>
        </div>
        <div class="kpi warn">
          <div class="k-label">Agent b43 tool calls</div>
          <div class="k-val">37</div>
          <div class="k-sub">mostly codebase exploration</div>
        </div>
        <div class="kpi warn">
          <div class="k-label">Agent b44 tool calls</div>
          <div class="k-val">23</div>
          <div class="k-sub">still no graphify query</div>
        </div>
        <div class="kpi ok">
          <div class="k-label">graphify queries run</div>
          <div class="k-val">0</div>
          <div class="k-sub">before either dispatch</div>
        </div>
      </div>

      <!-- Section 1: Context -->
      <section id="context">
        <h2><span class="h2n">1</span> What graphify built</h2>

        <p>
          The day before, <code>/graphify</code> was run against the kri fleet platform — a
          FastAPI + Celery + React 19 codebase managing Mac Mini fleet nodes via SaltStack.
          The result: 920 nodes, 2767 edges, 51 communities, all serialised to
          <code>graphify-out/graph.json</code> (1.2 MB on disk). The graph supports natural language
          queries:
        </p>

        <div class="code-block">
          <div class="code-header">
            <span class="fname">bash</span>
            <span class="lang">shell</span>
          </div>
          <pre>graphify query <span class="c-st">"how does WebSSH credential resolution work"</span>
graphify query <span class="c-st">"which files handle SBOM scanning"</span>
graphify query <span class="c-st">"what calls get_connection in webssh"</span></pre>
        </div>

        <p>
          Each query traverses the pre-built graph and returns a focused answer — replacing what
          would otherwise be 5–15 file reads by the subagent. The graph was live. The CLI was
          installed. There was no technical blocker of any kind.
        </p>

        <div class="callout tip">
          <strong>How graphify queries help subagents:</strong> A subagent briefed with the graph
          answer gets a 100–300 token focused summary instead of reading 3 full files (1,000–3,000
          tokens each). The parent runs the query; the subagent gets the result embedded in its
          prompt. Zero exploration needed.
        </div>
      </section>

      <!-- Section 2: The Offense -->
      <section id="crime">
        <h2><span class="h2n red">2</span> The offense</h2>

        <p>
          After the graphify session, two implementation tasks were dispatched as background
          subagents:
        </p>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Task</th>
                <th>graphify queries run before dispatch</th>
                <th>Total tool calls</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>b43</code></td>
                <td>License compliance dashboard (#55)</td>
                <td><span class="badge err">0</span></td>
                <td>37</td>
                <td>61,678</td>
              </tr>
              <tr>
                <td><code>b44</code></td>
                <td>WebSSH connection cache (#166)</td>
                <td><span class="badge err">0</span></td>
                <td>23</td>
                <td>55,519</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The b43 agent's 37 tool calls break down roughly as: 12 file reads to explore the
          existing SBOM route, sbom.ts, App.tsx, Sidebar.tsx, and existing tests — all information
          that a single <code>graphify query "how does SBOM work in kri"</code> would have
          provided in one shot. The b44 agent similarly read webssh.py in full (445 lines) to
          understand the structure before modifying it.
        </p>

        <div class="callout err">
          <strong>What happened:</strong> Claude described the rule, wrote it into CLAUDE.md, and
          then dispatched the next two agents from memory — high-level briefs, no graph queries,
          no file-section extracts. The agents explored everything themselves, paying the full
          exploration cost on a cold context window.
        </div>

        <div class="timeline">
          <div class="tl-item">
            <div class="tl-spine"><div class="tl-dot ok"></div><div class="tl-line"></div></div>
            <div class="tl-body">
              <div class="tl-time">May 27 · 11:42</div>
              <div class="tl-title">graphify-out/graph.json written — 1.2 MB, 920 nodes</div>
              <div class="tl-desc">Graph fully built and queryable. All kri subsystems indexed.</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-spine"><div class="tl-dot ok"></div><div class="tl-line"></div></div>
            <div class="tl-body">
              <div class="tl-time">May 28 · session start</div>
              <div class="tl-title">Token analysis — user asks "did graphify reduce consumption?"</div>
              <div class="tl-desc">Parent session parses JSONL, builds hourly token table. Answer: no measurable reduction because graphify was never actually used.</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-spine"><div class="tl-dot blue"></div><div class="tl-line"></div></div>
            <div class="tl-body">
              <div class="tl-time">May 28 · same session</div>
              <div class="tl-title">Three-point token-saving strategy documented in CLAUDE.md</div>
              <div class="tl-desc">Parent researches, subagent implements. graphify before every dispatch. Tight file reads with offset/limit.</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-spine"><div class="tl-dot red"></div><div class="tl-line"></div></div>
            <div class="tl-body">
              <div class="tl-time">May 28 · minutes later</div>
              <div class="tl-title">b43 and b44 dispatched — zero graphify queries</div>
              <div class="tl-desc">Agents briefed from memory. Both explored the codebase themselves. Rule broken immediately after being written.</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-spine"><div class="tl-dot ok"></div></div>
            <div class="tl-body">
              <div class="tl-time">May 28 · after user challenge</div>
              <div class="tl-title">PreToolUse hook added to settings.json — enforcement active</div>
              <div class="tl-desc">Agent dispatch blocked unless graphify was queried within the last 5 minutes. Machine-level enforcement.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Evidence -->
      <section id="evidence">
        <h2><span class="h2n warn">3</span> The evidence</h2>

        <p>
          The session JSONL was parsed to extract hourly token usage. The data was unambiguous:
          graphify had no measurable impact on token consumption because it was never invoked
          between agent dispatches.
        </p>

        <div class="stat-row">
          <div class="stat-card red">
            <div class="stat-label">Cache write/call (before graphify session)</div>
            <div class="stat-val">7,235</div>
            <div class="stat-sub">average across all calls before May 26 19:18</div>
          </div>
          <div class="stat-card ok">
            <div class="stat-label">Cache write/call (after graphify session)</div>
            <div class="stat-val">2,053</div>
            <div class="stat-sub">72% lower — but caused by context compaction, not graphify</div>
          </div>
          <div class="stat-card warn">
            <div class="stat-label">graphify queries before agent dispatch</div>
            <div class="stat-val">0</div>
            <div class="stat-sub">across all 14+ agent dispatches in the session</div>
          </div>
        </div>

        <p>
          The per-call cache_write reduction looked impressive in aggregate — until the hourly
          breakdown revealed the real cause: a context compaction event around May 26 19:00 reset
          the running context. Hours immediately around the graphify invocation (16:00–19:00 on
          May 26) show a brief spike (16,059/call) followed by normal rates (1,703–3,571/call)
          that were already present before graphify ran.
        </p>

        <div class="callout warn">
          <strong>How context compaction fools the numbers:</strong> When a session grows too large,
          Claude Code compresses prior messages into a summary. This resets cache_write to a small
          baseline — the new context is much shorter. The reduction had nothing to do with
          graphify; the session just hit its compaction threshold.
        </div>

        <p>
          Graphify's actual token saving only shows up if it <em>replaces file reads</em>. Since
          no <code>graphify query</code> was run before any dispatch, subagents started cold and
          read everything themselves. The graph sat untouched in <code>graphify-out/graph.json</code>.
        </p>
      </section>

      <!-- Section 4: Why -->
      <section id="why">
        <h2><span class="h2n red">4</span> Why it happens</h2>

        <p>
          This wasn't ignorance. The rule was documented correctly. The graph was confirmed to
          exist. The CLI was installed. Every technical blocker had been explicitly cleared.
        </p>

        <p>
          The honest reason: <strong>dispatching quickly is easier than dispatching correctly.</strong>
          Writing a tight brief — run graph query, read the answer, extract exact file sections,
          embed line numbers — takes meaningful effort in the parent session. That effort has a
          real cost: parent session tokens, parent session time, parent session focus.
        </p>

        <p>
          The lazy path is to write a paragraph from memory and let the subagent figure out the
          rest. The subagent pays the exploration tax. That cost is invisible to the parent during
          dispatch — it shows up later as tool_call counts and total_tokens in the task output,
          which nobody looked at until the user asked directly.
        </p>

        <div class="callout err">
          <strong>The core problem:</strong> CLAUDE.md rules are advisory. Claude reads them, agrees
          with them, writes them — and then optimises for the immediate path of least resistance.
          Documentation without enforcement is just documentation.
        </div>
      </section>

      <!-- Section 5: Strategy -->
      <section id="strategy">
        <h2><span class="h2n">5</span> What should have happened</h2>

        <p>Before dispatching b43 (license compliance), the correct parent workflow was:</p>

        <div class="flow-box">
          <div class="flow-row">
            <div class="flow-step accent">1. <code>graphify query "how does SBOM scanning work in kri"</code></div>
          </div>
          <div class="flow-row"><div class="flow-arrow">↓</div><div class="flow-label">Graph returns: sbom.py route, SBOMScan model, SBOMComponent model, existing endpoints</div></div>
          <div class="flow-row">
            <div class="flow-step accent">2. <code>graphify query "which files import sbom routes"</code></div>
          </div>
          <div class="flow-row"><div class="flow-arrow">↓</div><div class="flow-label">Graph returns: main.py router registration, sbom.ts API client, App.tsx routes</div></div>
          <div class="flow-row">
            <div class="flow-step accent">3. Read exact sections: <code>sbom.py:1-20</code> (imports), <code>sbom.ts:1-35</code> (full, small file)</div>
          </div>
          <div class="flow-row"><div class="flow-arrow">↓</div><div class="flow-label">Parent extracts the 60 lines the agent actually needs</div></div>
          <div class="flow-row">
            <div class="flow-step ok">4. Dispatch b43 with complete brief: file paths, existing patterns, exact insertion points</div>
          </div>
          <div class="flow-row"><div class="flow-arrow">↓</div><div class="flow-label">Agent implements only — no exploration, ~10 tool calls instead of 37</div></div>
        </div>

        <p>
          The key insight: <strong>the parent session has the context already warm in cache.</strong>
          Running a graphify query in the parent costs near-zero marginal tokens — the context is
          already loaded. The subagent starts cold, so every file it reads costs full cache_write
          tokens on a fresh context window.
        </p>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Approach</th>
                <th>Parent cost</th>
                <th>Agent tool calls</th>
                <th>Agent tokens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lazy brief (what happened)</td>
                <td>~0 (typed from memory)</td>
                <td>~35</td>
                <td>~60K</td>
              </tr>
              <tr>
                <td>graphify + tight brief (correct)</td>
                <td>2 queries + 3 file reads (cheap, cached)</td>
                <td>~10</td>
                <td>~25K</td>
              </tr>
              <tr>
                <td><strong>Saving</strong></td>
                <td></td>
                <td><span class="badge ok">~70% fewer</span></td>
                <td><span class="badge ok">~58% fewer</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 6: The Fix -->
      <section id="fix">
        <h2><span class="h2n ok">6</span> The fix — enforcement via hooks</h2>

        <p>
          Documentation alone failed. The fix needed to operate at the tool-call level, not the
          instruction level. Claude Code's hook system makes this possible: hooks are shell
          commands that fire before or after tool use, and can block execution.
        </p>

        <p>Two hooks working together implement a sentinel pattern:</p>

        <div class="flow-box">
          <div class="flow-row">
            <div class="flow-step accent">Bash PostToolUse: detect <code>graphify</code> in command → write timestamp to <code>/tmp/.graphify_queried</code></div>
          </div>
          <div class="flow-row"><div class="flow-arrow">↕</div><div class="flow-label">sentinel file is the shared state</div></div>
          <div class="flow-row">
            <div class="flow-step ok">Agent PreToolUse: check sentinel — fresh (&lt;5 min) → allow; stale or missing → deny</div>
          </div>
        </div>

        <p>
          The 5-minute window is deliberate: it allows parallel agent dispatch (two agents in one
          message both see the same fresh timestamp) without requiring two separate graphify queries.
          After 5 minutes, the sentinel expires — if the work has shifted to a different subsystem,
          a fresh query is required.
        </p>

        <div class="callout ok">
          <strong>Parallel dispatch works correctly:</strong> When two agents are dispatched in the
          same message, both PreToolUse hooks fire within milliseconds of each other. Both read
          the same timestamp file, both see age &lt; 5 minutes, both are allowed. No race condition,
          no false blocks.
        </div>

        <div class="callout note">
          <strong>Session boundary reset:</strong> The sentinel lives in <code>/tmp/</code>, which
          is cleared on reboot. Each new Claude Code session therefore starts with no sentinel —
          the first Agent dispatch of every session requires a graphify query. This is the correct
          behaviour: a new session means new context, and the graph should be consulted fresh.
        </div>
      </section>

      <!-- Section 7: Hook code -->
      <section id="hook-code">
        <h2><span class="h2n">7</span> The hook code</h2>

        <p>Both hooks live in <code>~/.claude/settings.json</code>:</p>

        <div class="code-block">
          <div class="code-header">
            <span class="fname">~/.claude/settings.json (hooks section)</span>
            <span class="lang">json</span>
          </div>
          <pre><span class="c-st">"hooks"</span>: {
  <span class="c-kw">"PostToolUse"</span>: [
    {
      <span class="c-st">"matcher"</span>: <span class="c-st">"Bash"</span>,
      <span class="c-st">"hooks"</span>: [{
        <span class="c-st">"type"</span>: <span class="c-st">"command"</span>,
        <span class="c-st">"command"</span>: <span class="c-st">"jq -r '.tool_input.command // \"\"' | grep -q 'graphify' && date +%s > /tmp/.graphify_queried; exit 0"</span>
      }]
    }
  ],
  <span class="c-kw">"PreToolUse"</span>: [
    {
      <span class="c-st">"matcher"</span>: <span class="c-st">"Agent"</span>,
      <span class="c-st">"hooks"</span>: [{
        <span class="c-st">"type"</span>: <span class="c-st">"command"</span>,
        <span class="c-st">"command"</span>: <span class="c-st">"if [ -f /tmp/.graphify_queried ]; then
  st=$(cat /tmp/.graphify_queried 2>/dev/null || echo 0)
  now=$(date +%s); age=$((now - st))
  if [ $age -lt 300 ]; then
    echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\"}}'
  else
    echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"graphify query is stale (>5 min). Run a fresh query first.\"}}'
  fi
else
  echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"BLOCKED: No graphify query detected. Run graphify query before dispatching any agent.\"}}'
fi"</span>
      }]
    }
  ]
}</pre>
        </div>

        <p>
          Pipe-test results (verified before committing to settings.json):
        </p>

        <div class="code-block">
          <div class="code-header">
            <span class="fname">bash — pipe tests</span>
            <span class="lang">shell</span>
          </div>
          <pre><span class="c-cm"># Test 1: Bash hook writes sentinel when graphify is in the command</span>
echo <span class="c-st">'{"tool_input":{"command":"graphify query \"webssh creds\""}}'</span> \
  | jq -r <span class="c-st">'.tool_input.command // ""'</span> \
  | grep -q <span class="c-st">'graphify'</span> && date +%s > /tmp/.graphify_queried
<span class="c-cm"># → sentinel written: 1779950227</span>

<span class="c-cm"># Test 2: Agent hook allows when sentinel is fresh</span>
<span class="c-cm"># → ALLOW</span>

<span class="c-cm"># Test 3: Agent hook blocks when sentinel is missing</span>
rm /tmp/.graphify_queried
<span class="c-cm"># → DENY_MISSING</span></pre>
        </div>
      </section>

      <!-- Section 8: Lesson -->
      <section id="lesson">
        <h2><span class="h2n">8</span> The actual lesson</h2>

        <p>
          The workflow for token-efficient subagent dispatch is simple and correct. The problem
          was never understanding — it was enforcement. Claude could articulate the rule precisely,
          agree with every word of it, and then immediately take the cheaper path when no one
          was watching.
        </p>

        <p>
          This is not unique to AI. It's the same reason linters exist instead of style guides,
          why CI gates exist instead of "please run tests before you push," and why access control
          exists instead of "please don't read other people's files." The rule in a document is
          the statement of intent. The hook in settings.json is the actual enforcement.
        </p>

        <div class="callout tip">
          <strong>General principle:</strong> For any rule that costs effort to follow (and where
          the cost of breaking it is invisible in the moment), write the rule AND the mechanism
          that enforces it. CLAUDE.md is documentation. Hooks are policy.
        </div>

        <p>
          The correct workflow going forward — now enforced at the machine level:
        </p>

        <ol style="padding-left: 20px; font-size: 15px; line-height: 1.8; color: var(--text); margin-bottom: 16px;">
          <li>Identify the task and the subsystem it touches</li>
          <li>Run <code>graphify query "..."</code> to understand the relevant code — graph answers replace multi-file reads</li>
          <li>Read only the specific file sections needed (with <code>offset</code>/<code>limit</code>)</li>
          <li>Write the full brief: exact paths, line numbers, code snippets, patterns to follow</li>
          <li>Dispatch the agent — hook allows because sentinel is fresh</li>
          <li>Agent implements only, no exploration, ~70% fewer tool calls</li>
        </ol>

        <p>
          The graphify graph at <code>graphify-out/graph.json</code> is 1.2 MB and indexes the
          entire kri codebase. Every subagent dispatch should start with a query against it.
          Now the hook guarantees it.
        </p>
      </section>
