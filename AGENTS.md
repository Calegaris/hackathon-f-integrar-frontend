# AGENTS.md — Guidelines for AI Coding Agents

## Project Overview
- **Project**: A.R.T. (Agencia de Respuestas Tácticas / Tactical Response Agency)
- **Repository**: `hackathon-f-integrar-frontend`
- **Stack**: Next.js (App Router), TypeScript, Tailwind CSS
- **Core Mission**: Parse exported WhatsApp chat histories, compute high-precision behavioral metrics, and provide concise summaries with 3 actionable response suggestions (diplomatic, passive-aggressive, neutral).

---

## Architectural Principles & Constraints

### 1. Zero-Failure Core (Offline First)
- The core WhatsApp parser and local metrics engine must function completely client-side without relying on third-party APIs.
- Next.js route handler (`/api/analizar`) communicates with external LLM providers using environment variables only. Never expose API keys to client bundles.
- **Strict Fallback (RF-19)**: If the LLM call fails, times out (>10s), or is unconfigured, immediately fallback to rule-based template generation so the UI never displays broken states.

### 2. Metric Precision & Formatting
- **Two Decimals Rule (RF-08)**: Every calculated metric and percentage must be formatted with exactly two decimals (`0.00` or `0,00` depending on locale conventions).
- **Zero Rule (RF-25)**: No metric may render empty or blank. If a metric equals `0.00`, display a fixed humorous commentary instead of an empty slot.
- **Small Sample Guard (RF-32)**: If chat history has fewer than 5 messages, flag as insufficient evidence ("expediente archivado por falta de evidencia") and calculate only mandatory (M) baseline metrics.

### 3. Parser Contract
- Must parse standard WhatsApp export lines: `dd/mm/aa, hh:mm - Author: message`.
- Multiline messages without timestamps belong to the preceding message author.
- Automatically strip or ignore system messages (e.g., encryption notices, media omitted tokens).
- Distinguish automatically between individual chats (2 participants) and group chats (3+ participants).

### 4. UI & Aesthetics
- **Theme**: Intelligence agency dossier (tactical, confidential stamps, case numbers, clean typography).
- **Clarity over cleverness**: No intrusive commentary narrator in core metrics.
- **Copy to Clipboard (RF-21)**: Single-click copy for suggested responses with visual toast/confirmation.
- **Preloaded Examples (RF-02)**: Dedicated individual and group sample data available for instant demo runs.

---

## Code Quality & Engineering Standards

- **Conventional Commits**: Format commit messages as `type(scope): description` (e.g. `feat(parser): add multiline message aggregator`). Never add AI attributions or `Co-Authored-By` lines.
- **Component Architecture**: Keep UI components presentational and extract parsing/metric algorithms into pure, testable domain utilities under `src/lib/` or `src/utils/`.
- **Typing**: Strict TypeScript types for parsed messages, metrics payloads, and LLM API response contracts.

