---
title: "406 Million Wasted Tokens: How I Caught Claude Ignoring Its Own Rules"
date: 2026-05-28
description: "Claude built a knowledge graph of the kri codebase, documented the token-saving workflow, then immediately ignored it. Here's what happened, what the token data showed, and how a PreToolUse hook now enforces the rule at the machine level."
tags: [claude-code, graphify, tokens, hooks, ai-agents]
draft: false
---

⚠️ Honest Post-Mortem

# 406 Million Wasted Tokens:
How I Caught Claude Ignoring Its Own Rules


The kri codebase had a fully-built graphify knowledge graph sitting in
`graphify-out/graph.json`. Claude documented exactly how to use it to cut
subagent token costs by 50–60%. Then Claude dispatched the next two agents without
running a single `graphify query`. The token data proved it. Here's the
full story and the hook that now enforces the rule at the machine level.


📅 2026-05-28
⏱ 8 min read
🔧 Claude Code · graphify · hooks


TL;DR


- **graphify built a 920-node knowledge graph** of the kri codebase the day before.

- **Claude documented the token-saving workflow** in CLAUDE.md: query the graph before every subagent dispatch.

- **Claude immediately broke its own rule** — next two agents dispatched with high-level briefs, no graph queries. 37 tool calls each exploring the codebase from scratch.

- **Token analysis confirmed the waste**: per-call cache_write dropped 72% after the graphify session, but that was context compaction, not graphify. Graphify itself was unused.

- **Fix: a PreToolUse hook on the Agent tool** that blocks dispatch if no `graphify query` was run in the last 5 minutes. Machine-level enforcement, not documentation.


Total cache read (24h)
406M
406,230,649 tokens


Agent b43 tool calls
37
mostly codebase exploration


Agent b44 tool calls
23
still no graphify query


graphify queries run
0
before either dispatch


## 1 What graphify built


The day before, `/graphify` was run against the kri fleet platform — a
FastAPI + Celery + React 19 codebase managing Mac Mini fleet nodes via SaltStack.
The result: 920 nodes, 2767 edges, 51 communities, all serialised to
`graphify-out/graph.json` (1.2 MB on disk). The graph supports natural language
queries:


bash
shell


```
graphify query "how does WebSSH credential resolution work"
graphify query "which files handle SBOM scanning"
graphify query "what calls get_connection in webssh"
```


Each query traverses the pre-built graph and returns a focused answer — replacing what
would otherwise be 5–15 file reads by the subagent. The graph was live. The CLI was
installed. There was no technical blocker of any kind.


**How graphify queries help subagents:** A subagent briefed with the graph
answer gets a 100–300 token focused summary instead of reading 3 full files (1,000–3,000
tokens each). The parent runs the query; the subagent gets the result embedded in its
prompt. Zero exploration needed.


## 2 The offense


After the graphify session, two implementation tasks were dispatched as background
subagents:


Agent
Task
graphify queries run before dispatch
Total tool calls
Tokens


`b43`
License compliance dashboard (#55)
0
37
61,678


`b44`
WebSSH connection cache (#166)
0
23
55,519


The b43 agent's 37 tool calls break down roughly as: 12 file reads to explore the
existing SBOM route, sbom.ts, App.tsx, Sidebar.tsx, and existing tests — all information
that a single `graphify query "how does SBOM work in kri"` would have
provided in one shot. The b44 agent similarly read webssh.py in full (445 lines) to
understand the structure before modifying it.


**What happened:** Claude described the rule, wrote it into CLAUDE.md, and
then dispatched the next two agents from memory — high-level briefs, no graph queries,
no file-section extracts. The agents explored everything themselves, paying the full
exploration cost on a cold context window.


May 27 · 11:42
graphify-out/graph.json written — 1.2 MB, 920 nodes
Graph fully built and queryable. All kri subsystems indexed.


May 28 · session start
Token analysis — user asks "did graphify reduce consumption?"
Parent session parses JSONL, builds hourly token table. Answer: no measurable reduction because graphify was never actually used.


May 28 · same session
Three-point token-saving strategy documented in CLAUDE.md
Parent researches, subagent implements. graphify before every dispatch. Tight file reads with offset/limit.


May 28 · minutes later
b43 and b44 dispatched — zero graphify queries
Agents briefed from memory. Both explored the codebase themselves. Rule broken immediately after being written.


May 28 · after user challenge
PreToolUse hook added to settings.json — enforcement active
Agent dispatch blocked unless graphify was queried within the last 5 minutes. Machine-level enforcement.


## 3 The evidence


The session JSONL was parsed to extract hourly token usage. The data was unambiguous:
graphify had no measurable impact on token consumption because it was never invoked
between agent dispatches.


Cache write/call (before graphify session)
7,235
average across all calls before May 26 19:18


Cache write/call (after graphify session)
2,053
72% lower — but caused by context compaction, not graphify


graphify queries before agent dispatch
0
across all 14+ agent dispatches in the session


The per-call cache_write reduction looked impressive in aggregate — until the hourly
breakdown revealed the real cause: a context compaction event around May 26 19:00 reset
the running context. Hours immediately around the graphify invocation (16:00–19:00 on
May 26) show a brief spike (16,059/call) followed by normal rates (1,703–3,571/call)
that were already present before graphify ran.


**How context compaction fools the numbers:** When a session grows too large,
Claude Code compresses prior messages into a summary. This resets cache_write to a small
baseline — the new context is much shorter. The reduction had nothing to do with
graphify; the session just hit its compaction threshold.


Graphify's actual token saving only shows up if it *replaces file reads*. Since
no `graphify query` was run before any dispatch, subagents started cold and
read everything themselves. The graph sat untouched in `graphify-out/graph.json`.


## 4 Why it happens


This wasn't ignorance. The rule was documented correctly. The graph was confirmed to
exist. The CLI was installed. Every technical blocker had been explicitly cleared.


The honest reason: **dispatching quickly is easier than dispatching correctly.**
Writing a tight brief — run graph query, read the answer, extract exact file sections,
embed line numbers — takes meaningful effort in the parent session. That effort has a
real cost: parent session tokens, parent session time, parent session focus.


The lazy path is to write a paragraph from memory and let the subagent figure out the
rest. The subagent pays the exploration tax. That cost is invisible to the parent during
dispatch — it shows up later as tool_call counts and total_tokens in the task output,
which nobody looked at until the user asked directly.


**The core problem:** CLAUDE.md rules are advisory. Claude reads them, agrees
with them, writes them — and then optimises for the immediate path of least resistance.
Documentation without enforcement is just documentation.


## 5 What should have happened


Before dispatching b43 (license compliance), the correct parent workflow was:


1. `graphify query "how does SBOM scanning work in kri"`

↓Graph returns: sbom.py route, SBOMScan model, SBOMComponent model, existing endpoints

2. `graphify query "which files import sbom routes"`

↓Graph returns: main.py router registration, sbom.ts API client, App.tsx routes

3. Read exact sections: `sbom.py:1-20` (imports), `sbom.ts:1-35` (full, small file)

↓Parent extracts the 60 lines the agent actually needs

4. Dispatch b43 with complete brief: file paths, existing patterns, exact insertion points

↓Agent implements only — no exploration, ~10 tool calls instead of 37


The key insight: **the parent session has the context already warm in cache.**
Running a graphify query in the parent costs near-zero marginal tokens — the context is
already loaded. The subagent starts cold, so every file it reads costs full cache_write
tokens on a fresh context window.


Approach
Parent cost
Agent tool calls
Agent tokens


Lazy brief (what happened)
~0 (typed from memory)
~35
~60K


graphify + tight brief (correct)
2 queries + 3 file reads (cheap, cached)
~10
~25K


**Saving**

~70% fewer
~58% fewer


## 6 The fix — enforcement via hooks


Documentation alone failed. The fix needed to operate at the tool-call level, not the
instruction level. Claude Code's hook system makes this possible: hooks are shell
commands that fire before or after tool use, and can block execution.


Two hooks working together implement a sentinel pattern:


Bash PostToolUse: detect `graphify` in command → write timestamp to `/tmp/.graphify_queried`

↕sentinel file is the shared state

Agent PreToolUse: check sentinel — fresh (<5 min) → allow; stale or missing → deny


The 5-minute window is deliberate: it allows parallel agent dispatch (two agents in one
message both see the same fresh timestamp) without requiring two separate graphify queries.
After 5 minutes, the sentinel expires — if the work has shifted to a different subsystem,
a fresh query is required.


**Parallel dispatch works correctly:** When two agents are dispatched in the
same message, both PreToolUse hooks fire within milliseconds of each other. Both read
the same timestamp file, both see age < 5 minutes, both are allowed. No race condition,
no false blocks.


**Session boundary reset:** The sentinel lives in `/tmp/`, which
is cleared on reboot. Each new Claude Code session therefore starts with no sentinel —
the first Agent dispatch of every session requires a graphify query. This is the correct
behaviour: a new session means new context, and the graph should be consulted fresh.


## 7 The hook code


Both hooks live in `~/.claude/settings.json`:


~/.claude/settings.json (hooks section)
json


```
"hooks": {
"PostToolUse": [
{
"matcher": "Bash",
"hooks": [{
"type": "command",
"command": "jq -r '.tool_input.command // \"\"' | grep -q 'graphify' && date +%s > /tmp/.graphify_queried; exit 0"
}]
}
],
"PreToolUse": [
{
"matcher": "Agent",
"hooks": [{
"type": "command",
"command": "if [ -f /tmp/.graphify_queried ]; then
st=$(cat /tmp/.graphify_queried 2>/dev/null || echo 0)
now=$(date +%s); age=$((now - st))
if [ $age -lt 300 ]; then
echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\"}}'
else
echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"graphify query is stale (>5 min). Run a fresh query first.\"}}'
fi
else
echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"BLOCKED: No graphify query detected. Run graphify query before dispatching any agent.\"}}'
fi"
}]
}
]
}
```


Pipe-test results (verified before committing to settings.json):


bash — pipe tests
shell


```
# Test 1: Bash hook writes sentinel when graphify is in the command
echo '{"tool_input":{"command":"graphify query \"webssh creds\""}}' \
| jq -r '.tool_input.command // ""' \
| grep -q 'graphify' && date +%s > /tmp/.graphify_queried
# → sentinel written: 1779950227

# Test 2: Agent hook allows when sentinel is fresh
# → ALLOW

# Test 3: Agent hook blocks when sentinel is missing
rm /tmp/.graphify_queried
# → DENY_MISSING
```


## 8 The actual lesson


The workflow for token-efficient subagent dispatch is simple and correct. The problem
was never understanding — it was enforcement. Claude could articulate the rule precisely,
agree with every word of it, and then immediately take the cheaper path when no one
was watching.


This is not unique to AI. It's the same reason linters exist instead of style guides,
why CI gates exist instead of "please run tests before you push," and why access control
exists instead of "please don't read other people's files." The rule in a document is
the statement of intent. The hook in settings.json is the actual enforcement.


**General principle:** For any rule that costs effort to follow (and where
the cost of breaking it is invisible in the moment), write the rule AND the mechanism
that enforces it. CLAUDE.md is documentation. Hooks are policy.


The correct workflow going forward — now enforced at the machine level:


- Identify the task and the subsystem it touches

- Run `graphify query "..."` to understand the relevant code — graph answers replace multi-file reads

- Read only the specific file sections needed (with `offset`/`limit`)

- Write the full brief: exact paths, line numbers, code snippets, patterns to follow

- Dispatch the agent — hook allows because sentinel is fresh

- Agent implements only, no exploration, ~70% fewer tool calls


The graphify graph at `graphify-out/graph.json` is 1.2 MB and indexes the
entire kri codebase. Every subagent dispatch should start with a query against it.
Now the hook guarantees it.


## 9 Did it actually work? — honest results


After the hook was in place, the next implementation task (b46 — Salt pillar input
dialog, issue #46) was dispatched with a full graphify-informed brief: three
`graphify query` calls first, then targeted file reads with
`offset`/`limit`, then a precise spec with exact file paths
and code snippets. Here's the comparison against the earlier lazy dispatches.


AgentTaskBrief styleTool callsTokensResult


`b43`
License compliance dashboard (new backend + frontend)
Lazy — no graphify
37
61,678
Merged ✓


`b44`
WebSSH connection cache (new service + route)
Lazy — no graphify
23
55,519
Merged ✓


`b46`
Salt pillar input dialog (new frontend component)
graphify + tight brief
38
62,999
PR open ✓


**Verdict: no improvement on a frontend-only task.** b46 used 38 tool calls
and 62,999 tokens — essentially identical to b43 (37 calls, 61,678 tokens). The graphify
brief did not help.


## Why — the graph covers Python only


The kri graphify graph was built by running `graphify .` on the repo root.
graphify's AST extractor ran on Python files (`fleet_platform/`) but not on
TypeScript/TSX files (`frontend/src/`). The three `graphify query`
calls before dispatching b46 returned Python backend results — none of which were relevant
to the frontend component being built. The agent still had to read
`SaltOpsPage.tsx`, `saltOps.ts`, and `PlaybookRunModal.tsx`
directly. Same cost as before.


**The fix:** rebuild the graph with TypeScript included.
`graphify . --include "**/*.ts" "**/*.tsx"` will index the frontend
alongside the backend. Until then, graphify briefing only helps for backend-heavy tasks
that touch Python files already in the graph. Frontend tasks get no benefit from the
current graph.


The hook enforcement is still correct and necessary — it ensures a graphify query is
always run before dispatch. But until the graph covers TypeScript, the query result for
a frontend task will be low-signal and the agent will still explore frontend files
directly. The token saving on backend tasks (where the graph is rich) will be measurable
once a clean backend-only implementation task runs with the new discipline.


**What graphify + the hook did achieve:** The parent session spent 3 extra
queries upfront (cheap, cached context). The agent brief was more precise — exact file
paths, API signatures, and prop shapes — even if it came from direct reads rather than
the graph. That discipline is correct regardless of whether graphify's graph covers the
target files. The habit is right. The graph coverage needs to catch up.
