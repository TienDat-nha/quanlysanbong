---
name: codex-bugfix-prompt
description: Draft or sharpen a single execution-ready Codex prompt for fixing bugs, cleaning directly related code, or doing a narrow safe refactor in this sanbong frontend repo. Use when the input is a QA note, bug ticket, console error, regression report, or a vague complaint that must become a root-cause-oriented prompt aligned with the repo's React controller-model-view structure, route and auth flow, booking and payment logic, and company-style delivery constraints.
---

# Codex Bugfix Prompt

## Overview

Write one paste-ready prompt for Codex that drives a root-cause fix, narrow cleanup, limited blast radius, and verifiable outcomes in this repo.

Read [project-architecture.md](./references/project-architecture.md) before drafting prompts that touch routes, auth, booking, payments, admin portals, or shared models.

Read [delivery-standards.md](./references/delivery-standards.md) when the user wants the fix to be "dut diem", "clean code", "safe refactor", or explicitly aligned with company project standards.

Read [prompt-templates.md](./references/prompt-templates.md) when the user wants example prompt shapes or you need a stronger starting template.

## Workflow

1. Reduce the bug report to facts.
- Capture observed behavior, expected behavior, user role, route or page, impacted domain, trigger steps, and any error message.
- If key facts are missing, keep the prompt moving by adding an `Assumptions` block instead of pretending certainty.

2. Map the issue to the repo surface area.
- Use the repo reference to name the most relevant files and layers.
- Prefer the runtime path actually used by the app, not stale or duplicate folders.

3. Write one execution-ready prompt.
- Use direct imperative language.
- Keep code identifiers, commands, and file paths literal.
- Write natural Vietnamese by default unless the user asks for English.
- Return the final prompt first, not a long explanation about the prompt.

4. Make the prompt root-cause oriented.
- Ask Codex to reproduce or infer the failure path, identify the cause, implement the smallest safe fix, and clean only code coupled to that fix.
- Ban broad rewrites, speculative refactors, and unrelated formatting churn.

5. Demand verification.
- Always include concrete validation such as `npm run build`, targeted tests when possible, and a short manual verification checklist.
- If tests are missing, ask Codex to add only the smallest high-value coverage it can support.

6. Make the prompt company-usable.
- Require Codex to respect the controller/model/view split and the current routing and auth flow.
- Require a short end summary covering root cause, files changed, validation, and remaining risk.
- Keep cleanup close to the fix: dead branches, duplicate conditions, confusing naming, or tiny extraction only when it directly reduces regression risk.

## Prompt Structure

Produce prompts with these sections in this order:

- `Objective`
- `Observed behavior`
- `Expected behavior`
- `Assumptions` when facts are missing
- `Relevant repo context`
- `Files to inspect first`
- `Constraints`
- `Required actions`
- `Acceptance criteria`
- `Validation`

## Repo-Specific Rules To Bake Into Prompts

- Respect the current React plus controller/model/view split instead of collapsing logic into one large component.
- Prefer fixing logic in the layer where the bug originates:
  - UI rendering in `views` or `components`
  - orchestration and state in `controllers` or hooks
  - data normalization, route helpers, text helpers, or API behavior in `models`
- Avoid editing unrelated untracked or user-modified files.
- Preserve Vietnamese product text unless the bug is an encoding or content issue.
- Watch for UTF-8 or mojibake problems in payment-related strings and surface them explicitly when relevant.
- When the issue touches booking or payment state, ask Codex to inspect localStorage, API normalization, status mapping, and route transitions together instead of patching only the visible symptom.
- When the user asks for "clean code", constrain cleanup to dead branches, duplicated logic, naming clarity, or extraction directly adjacent to the fix.
- Ask Codex to name the root cause explicitly instead of describing only the visible symptom.
- Ask Codex to keep the final patch small enough for straightforward review by a company team.

## Output Rules

- Return the final prompt first.
- After the prompt, add a short note only if the user explicitly asks why the prompt is structured that way.
- Do not bury the prompt in long prose.
- Do not output multiple radically different prompts unless the user explicitly asks for options.
- Do not weaken the prompt with vague wording like "check around" or "clean up if needed"; use specific actions and guardrails.
