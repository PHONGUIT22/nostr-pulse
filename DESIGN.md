# Design System

<!-- impeccable:design-tokens -->

## Visual Lane & Brand Identity
- **Theme:** Clean, modern cypherpunk utility aesthetic. High-contrast typography, cryptographic readability, and tactile card surfaces that make protocol data accessible without visual clutter.
- **Backgrounds:** Crisp off-white (`#FDFDFD`, `bg-white`) for light-mode exploration; deep obsidian slate (`bg-slate-900`, `bg-slate-950`) for technical telemetry, trust matrices, and cryptographic inboxes.

## Color Palette & Semantic Tokens
- **Nostr Protocol Identity (Purple):** Tailwind `purple-600` (`#9333EA`) / `purple-700` — Identity badges, protocol headers, active navigation, and cryptographic DNS indicators.
- **Bitcoin Lightning Value-4-Value (Amber):** Tailwind `amber-500` (`#F7931A`) / `amber-600` — Lightning Zaps, satoshi amounts, and transaction counters.
- **Verified Builder Tier (Emerald):** Tailwind `emerald-500` / `emerald-600` — High-reputation scores (80–100), cryptographically verified NIP-05 DNS badges, and positive network proximity signals.
- **Anti-Sybil Risk & Damping (Rose):** Tailwind `rose-500` / `rose-600` — Impersonation risk warnings, unverified keys, and the strict 42-point damping clamp banner.
- **Chaumian eCash (Mint Green):** `#00D084` / Tailwind `emerald-400` — NIP-61 Cashu NutZap badges, mint status indicators, and proof-swap confirmations.
- **Neutral Structure (Slate):** Tailwind `slate-100` to `slate-950` — Borders (`border-slate-200/80`), muted subtitles (`text-slate-500`), and dark card containers (`border-slate-800`).

## Typography Hierarchy
- **Body & Interface:** Geist Sans / Inter (`--font-sans`) with clean line-height and balanced weight distribution.
- **Cryptographic & Protocol Data:** Geist Mono (`--font-mono`) for Bech32 keys (`npub1...`), 64-hex public keys, Cashu V4 binary tokens (`cashuB...`), and Lightning invoices.
- **Headings & Display:** Heavy, punchy uppercase headings with tight tracking (`font-black tracking-tight leading-[1.08] uppercase`) paired with descriptive, high-contrast subheadings.

## Component & Layout Conventions
- **Corner Radii:** Consistent generous rounding — `rounded-3xl` (24px) for major cards, `rounded-2xl` (16px) for inputs/sub-panels, and `rounded-full` for semantic pill badges.
- **Card Surfaces:** Dual-style hierarchy:
  - *Light Explorer Surface:* White canvas with subtle slate border and light shadow (`bg-white border border-slate-200/80 shadow-sm`).
  - *Dark Matrix Surface:* Deep slate container with internal glass paneling (`bg-slate-900 border border-slate-800 shadow-xl`).
- **Action Buttons:** Bold interactive buttons with tactile feedback (`hover:-translate-y-0.5`, smooth transitions, and animated icon hints).
- **Responsive Geometry:** Adaptive grid containers with dedicated mobile touch targets (48px+ min tap target) and fluid horizontal wrapping.
