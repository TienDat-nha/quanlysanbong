---
name: codex-bugfix-prompt
description: Use when the user wants Codex to draft or sharpen a prompt for fixing bugs, cleaning up related code, or doing a safe refactor in this sanbong frontend repo. This skill turns vague bug reports, QA notes, or tickets into execution-ready prompts grounded in the repo's React controller-model-view structure, booking and payment flows, route and auth rules, and company-style engineering constraints.
---

# Codex Bugfix Prompt

## Overview

This skill writes paste-ready prompts for Codex that optimize for root-cause fixes, clean code, limited blast radius, and verifiable outcomes in this repo.

Read [project-architecture.md](./references/project-architecture.md) before drafting prompts that touch routes, auth, booking, payments, admin portals, or shared models.

Read [prompt-templates.md](./references/prompt-templates.md) when the user wants example prompt shapes or you need a stronger starting template.

## When To Use

- The user says "viet prompt cho Codex", "soan prompt fix bug", "refactor cho sach", or asks for a prompt that another Codex agent can execute.
- The input is a QA ticket, bug report, console error, reproduction note, or a vague complaint that needs to become an execution-ready Codex prompt.
- The user wants Codex to stay close to the current project structure instead of rewriting architecture.

## Workflow

1. Reduce the bug report to facts.
- Capture observed behavior, expected behavior, user role, route or page, impacted domain, and any error message.
- If key facts are missing, keep the prompt moving by adding an `Assumptions` block instead of pretending certainty.

2. Map the issue to the repo surface area.
- Use the repo reference to name the most relevant files and layers.
- Prefer the runtime path actually used by the app, not stale or duplicate folders.

3. Write one execution-ready prompt.
- Use direct imperative language.
- Keep code identifiers, commands, and file paths literal.
- Write natural Vietnamese by default unless the user asks for English.

4. Make the prompt root-cause oriented.
- Ask Codex to reproduce or infer the failure path, identify the cause, implement the smallest safe fix, and clean only code coupled to that fix.
- Ban broad rewrites, speculative refactors, and unrelated formatting churn.

5. Demand verification.
- Always include concrete validation such as `npm run build`, targeted tests when possible, and a short manual verification checklist.
- If tests are missing, ask Codex to add only the smallest high-value coverage it can support.

## Prompt Structure

Produce prompts with these sections in this order:

- `Objective`
- `Observed behavior`
- `Expected behavior`
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

## Output Rules

- Return the final prompt first.
- After the prompt, add a short note only if the user explicitly asks why the prompt is structured that way.
- Do not bury the prompt in long prose.
- Do not output multiple radically different prompts unless the user explicitly asks for options.
