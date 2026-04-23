# Design System: Contract Hub

> **Stitch Prompt File** — Single source of truth for generating screens via Google Stitch.
> All values are calibrated for a B2B legal operations dashboard serving Corporate Carbon Group Australia.

---

## 1. Visual Theme & Atmosphere

A **precision-calibrated legal operations workspace** — the kind of software trusted counsel uses without question. The atmosphere evokes a well-organised barristers' chambers: authoritative slate-and-white architecture, unhurried negative space, and a single confident emerald accent that signals action without shouting. Every surface earns its presence.

**Density:** 6/10 — Balanced. Enough breathing room to process dense legal data without feeling like a lifestyle app.
**Variance:** 5/10 — Controlled asymmetric. Sidebar-anchored layouts with left-aligned hierarchy. No centered hero sections.
**Motion:** 4/10 — Fluid but restrained. Spring-physics transitions, skeletal loaders, no cinematic choreography. Legal context demands sobriety.

The overall impression: **Serious software that respects the user's time and intelligence.**

---

## 2. Color Palette & Roles

- **Slate Canvas** (`#F8FAFC`) — Primary page background. Cooler and more professional than pure white.
- **Pure Surface** (`#FFFFFF`) — Card, panel, and input fill. Creates subtle elevation against the canvas.
- **Onyx Ink** (`#0F172A`) — Primary text, headings. Slate-950 depth — never pure black.
- **Steel Text** (`#64748B`) — Secondary text, metadata, timestamps, helper labels.
- **Ghost Text** (`#94A3B8`) — Placeholder text, disabled states, tertiary labels.
- **Structure Line** (`rgba(148,163,184,0.3)`) — All dividers, card borders, input outlines. Barely-there 1px lines.
- **Deep Slate** (`#0F172A`) — Sidebar background. Same as Onyx Ink — creates seamless visual continuity.
- **Sidebar Surface** (`#1E293B`) — Sidebar section headers, hover states. Slate-800.
- **Active Rail** (`#10B981`) — Single accent. Emerald-500. Used exclusively for: active nav indicator, primary buttons, positive status badges, focus rings. No other color gets this role.
- **Caution Amber** (`#F59E0B`) — Pending/warning states only. Not decorative.
- **Alert Crimson** (`#EF4444`) — Error and rejection states only.
- **Resolved Jade** (`#10B981`) — Completed/approved status badges. Same hue as Active Rail at lower saturation context.

**Banned:** Purple anywhere. Neon blue anywhere. Gradient backgrounds. Mixed warm/cool gray — use Slate throughout. Pure `#000000`.

---

## 3. Typography Rules

- **Display / Page Titles:** `Geist` Sans — `font-weight: 700`, `letter-spacing: -0.03em`, `line-height: 1.1`. Scale: `1.75rem` (28px). Used for page headings and section headers.
- **Subheadings / Card Titles:** `Geist` Sans — `font-weight: 600`, `letter-spacing: -0.02em`. Scale: `1rem`–`1.125rem`.
- **Body / Descriptions:** `Geist` Sans — `font-weight: 400`, `line-height: 1.6`, `max-width: 65ch`. Color: Steel Text (`#64748B`).
- **Labels / Navigation:** `Geist` Sans — `font-weight: 500`, `font-size: 0.8125rem` (13px), `letter-spacing: 0.01em`.
- **Data / Numbers / IDs:** `Geist Mono` — All contract numbers, dates, monetary values, status counts, and timestamps use monospace. `font-variant-numeric: tabular-nums`.
- **Metadata:** `Geist Mono` — `font-size: 0.75rem` (12px), Ghost Text color.

**Font Loading:** Both `Geist` and `Geist Mono` are already configured via `--font-geist-sans` and `--font-geist-mono` in `globals.css`. The `body` must use `font-family: var(--font-geist-sans)` — **never `Arial` or `Helvetica`**.

**Banned:** `Inter`. `Arial`. `Helvetica` as final fallback in production. Generic serifs (`Times New Roman`, `Georgia`). Decorative display fonts. Serif fonts anywhere in this dashboard.

---

## 4. Component Stylings

### Sidebar Navigation
Left-anchored, `16rem` wide, Deep Slate (`#0F172A`) background. Full viewport height.
- **Logo area:** `4rem` tall, bottom border `Structure Line`. Icon: 2rem × 2rem, Active Rail fill, `0.5rem` radius. Product name in `Geist` 700, tagline in Ghost Text 11px Geist Mono.
- **Nav items:** `0.75rem` vertical padding, `1rem` horizontal padding. `0.375rem` border-radius. Icon `1.125rem` square, `stroke-width: 1.5`.
  - **Default:** Ghost Text color. No background.
  - **Hover:** Sidebar Surface (`#1E293B`) background. White text.
  - **Active:** Sidebar Surface background. White text. **3px left border-left in Active Rail (`#10B981`)**. No full-width color fill.
- **Footer:** User avatar (initials fallback, `2rem` circle), name in white 13px, email in Ghost Text 11px Geist Mono. Clerk UserButton inline.
- **Org label:** `Corporate Carbon Group Australia` in Ghost Text 10px Geist Mono, centered, above footer.

### Radius System (Canonical)
To preserve a unified "softer legal workspace" language across every surface:
- **Cards, panels, modals, popovers:** `1.25rem` (`rounded-[1.25rem]`). This is the default card radius across every page.
- **Inputs, selects, textareas:** `0.75rem` (`rounded-xl`).
- **Buttons (primary / secondary / destructive):** Pill (`rounded-full`).
- **Icon-only buttons:** `0.5rem` (`rounded-lg`).
- **Badges / Status Pills:** Full pill (`rounded-full`).
- **Nav items:** `0.375rem` (`rounded-md`) — intentionally tighter than cards to create hierarchy.

### Dashboard Stat Cards
4-column grid on desktop, 2-column on tablet, 1-column on mobile.
- White surface. `1.25rem` border-radius. `Structure Line` border (`1px`). `1.25rem` padding.
- **Icon container:** `2.25rem`–`2.5rem` square, `0.75rem` radius (`rounded-xl`), `#F8FAFC` (slate-50) fill. Icon in Steel Text.
- **Value:** `Geist Mono` `font-size: 1.5rem`–`1.75rem`, `font-weight: 700`, Onyx Ink. Tabular nums.
- **Label:** Geist Sans `0.6875rem`, uppercase, `letter-spacing: 0.08em`, Steel Text.
- **Delta badge:** Full pill (`rounded-full`). Positive: `#F0FDF4` bg / `#15803D` text. Negative: `#FEF2F2` bg / `#B91C1C` text. Font: `Geist Mono` `0.6875rem` (11px).
- **No dark/inverted hero stat variant.** All stat cards share the same white surface — hierarchy is established via column span and value scale, not by inverting the background.

### Quick Action Tiles
2-column grid on mobile, 4-column on desktop.
- White surface. `1.25rem` radius. `Structure Line` border. `1.25rem` padding. `gap: 1rem`.
- **Icon container:** `2.5rem` square, `0.5rem` radius. Each action gets one intentional color (not rainbow: use Emerald, Slate-600, Amber, and a second Emerald variant with opacity).
- **Label:** Geist Sans `0.875rem`, `font-weight: 500`, Onyx Ink.
- **Hover:** Border transitions to Active Rail at `0.5` opacity. Whisper `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`. No glow.
- **Active press:** `transform: translateY(1px)` tactile push. `transition: 80ms`.

### Activity Feed
Not cards — a **bordered list with vertical timeline connector**.
- Container: White surface, `Structure Line` border, `1.25rem` radius.
- **Header row:** `1.5rem` horizontal padding, `1rem` vertical. `font-weight: 600` title. `Structure Line` bottom border.
- **Row:** `1.5rem` horizontal padding, `1rem` vertical. `divide-y Structure Line`.
- **Status indicator:** `0.5rem` × `0.5rem` circle — not a filled dot. Use `outline: 2px solid [status-color]` with transparent fill for pending, solid fill for completed.
- **Action text:** Geist Sans `0.875rem` `font-weight: 500`, Onyx Ink.
- **Description:** Geist Sans `0.8125rem`, Steel Text, truncate at `32ch` on mobile.
- **Timestamp:** `Geist Mono` `0.75rem`, Ghost Text. Right-aligned.
- **Hover:** `#F8FAFC` row background.

### Buttons
- **Primary:** Active Rail (`#10B981`) fill. White text. `Geist Sans` `0.875rem` `font-weight: 600`. **Pill radius (`rounded-full`)**. `0.625rem 1.25rem` padding. Hover: darkens to `#059669`. `active:scale-[0.98]` tactile push. Transition `300ms cubic-bezier(0.32,0.72,0,1)`. No outer glow.
- **Secondary / Ghost:** `Structure Line` border, transparent fill. Onyx Ink text. Pill radius. Same padding. Hover: `#F8FAFC` background.
- **Destructive:** Alert Crimson fill variant, pill radius.
- **Icon Button:** `2.25rem` square, `0.5rem` radius (`rounded-lg`). No label. Ghost variant default. Always accompanied by a `title`/`aria-label`.
- **Disabled:** `opacity: 0.4`. No interaction.
- **Focus:** All buttons show `focus-visible:ring-2 focus-visible:ring-[#10B981]` with `ring-offset-2`.

### Inputs & Forms
- **Label:** Above input. `Geist Sans` `0.8125rem` `font-weight: 500`. Onyx Ink. `0.375rem` margin-bottom.
- **Input:** White fill. `Structure Line` border. `0.75rem` radius (`rounded-xl`). `0.625rem 0.875rem` padding. Geist Sans `0.875rem`.
- **Focus:** `2px` ring in Active Rail. `outline-offset: 2px`. Border transitions to Active Rail.
- **Helper text:** Steel Text `0.75rem`, below input.
- **Error text:** Alert Crimson `0.75rem`, below input. Left `2px` border-left Active Rail becomes Crimson on error.
- **No floating labels.** Label always above.

### Badges & Status Pills
- Shape: Pill (`border-radius: 9999px`). `0.25rem 0.625rem` padding. `Geist Mono` `0.6875rem` `font-weight: 500`. Uppercase, `letter-spacing: 0.05em`.
- Completed: `#F0FDF4` bg, `#15803D` text.
- In Progress: `#EFF6FF` bg, `#1D4ED8` text.
- Pending: `#FFFBEB` bg, `#B45309` text.
- Rejected: `#FEF2F2` bg, `#B91C1C` text.

### Skeletal Loaders
Match exact layout dimensions of the component being loaded. Use shimmer animation: `background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)`. `background-size: 200%`. `animation: shimmer 1.4s ease infinite`. No circular spinners anywhere.

### Empty States
Composed layout: centered SVG illustration (line-art style, Slate-300 stroke), heading in Geist `font-weight: 600` Onyx Ink, description in Steel Text `0.875rem`, single primary action button. Minimum `12rem` height. No "No data found." plain text.

---

## 5. Layout Principles

**Grid-first, sidebar-anchored architecture.**

- **App shell:** Fixed sidebar `16rem` left. Main content area: `flex-1`, `min-h-[100dvh]`, `overflow-y: auto`. Never `h-screen`.
- **Content container:** `max-width: 1400px`, centered with `margin: 0 auto`. `padding: 2rem` desktop, `1rem` mobile.
- **Page header zone:** Always left-aligned. `margin-bottom: 2rem`. Title + subtitle stacked. No centered page headers.
- **Section grids:** CSS Grid. Never `calc()` percentage hacks. Use `grid-template-columns: repeat(auto-fill, minmax(..., 1fr))`.
- **Stats grid:** `grid-cols-4` → `grid-cols-2` → `grid-cols-1`. `gap: 1rem`.
- **Two-column layouts:** `grid-cols-[2fr,1fr]` for content + sidebar panels. Never equal 50/50 splits for mixed-density content.
- **No overlapping elements.** Every element occupies its own spatial zone.
- **No 3-equal-column feature rows.** Use 2-col zig-zag, asymmetric grid, or grouped lists.

**Spacing scale (8px base):** `0.5rem` (4px) micro · `1rem` (8px) tight · `1.5rem` (12px) compact · `2rem` (16px) base · `3rem` (24px) section · `4rem` (32px) block · `6rem` (48px) page section gap.

---

## 6. Responsive Rules

- **Breakpoints:** Mobile `< 768px`, Tablet `768px–1024px`, Desktop `> 1024px`.
- **Sidebar collapse:** Below `768px`, sidebar is fixed `translate-x(-100%)` by default, toggled by hamburger. Backdrop overlay `bg-black/50`. No layout shift on desktop.
- **All grids:** Collapse to single column below `768px`. No exceptions.
- **No horizontal scroll:** Overflow on mobile is a failure condition.
- **Typography scaling:** Page titles use `clamp(1.25rem, 3vw, 1.75rem)`. Body minimum `0.875rem` / `14px`.
- **Touch targets:** All interactive elements minimum `44px` tap target height.
- **Table overflow:** Data tables wrap in `overflow-x: auto` container on mobile.

---

## 7. Motion & Interaction

**Philosophy:** Purposeful motion only. No animation for its own sake. Legal professionals do not want sparkles.

- **Transitions:** `transition: all 120ms ease` for color/border changes. `transition: transform 80ms ease` for push effects.
- **Spring physics (modals, drawers, popovers):** `stiffness: 100, damping: 22`. Weighty, not bouncy.
- **Sidebar mobile slide:** `transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1)`.
- **Skeleton shimmer:** `animation: shimmer 1.4s ease infinite`. Hardware-accelerated via `transform: translateX()`.
- **Staggered list mounts:** Activity feed rows stagger with `animation-delay: calc(var(--index) * 40ms)`. `opacity: 0 → 1`, `transform: translateY(6px) → translateY(0)`.
- **Stat counters:** Count up from 0 on mount using `requestAnimationFrame`. `Geist Mono` ensures no layout shift during counting.
- **Perpetual pulse:** Pending status dots use `animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite`.
- **Animate exclusively via `transform` and `opacity`.** Never animate `top`, `left`, `width`, `height`, `margin`, or `padding`.
- **No grain/noise filters.** No glassmorphism. No backdrop blur on main content (only on modals if needed).

---

## 8. Anti-Patterns (Strictly Banned)

The following patterns are AI design tells and are absolutely forbidden:

- **No emojis** anywhere in the UI — not in nav, not in empty states, not in toasts.
- **No `Arial` or `Helvetica`** as the primary body font — use `Geist Sans` via the CSS variable.
- **No `Inter`** font — Geist is already configured and superior for this context.
- **No pure black (`#000000`)** — use Onyx Ink (`#0F172A`).
- **No neon/outer glow shadows** — no `box-shadow: 0 0 20px rgba(16,185,129,0.5)` or similar.
- **No oversaturated accent colors** — Active Rail (`#10B981`) is the only accent. No rainbow quick-action colors.
- **No gradient text on headings** — Onyx Ink only.
- **No custom mouse cursors**.
- **No overlapping elements** — clean spatial separation always.
- **No 3-column equal card feature rows**.
- **No "Acme Corp" or "John Doe"** placeholder names in production-facing UI. Use real entity names or redacted tokens.
- **No fake round numbers** (`100%`, `99.99%`) in stats.
- **No AI copywriting clichés:** "Elevate", "Seamless", "Unleash", "Next-Gen", "Empower", "Streamline".
- **No filler scroll prompts:** "Scroll to explore", bouncing chevrons, "Swipe down" indicators.
- **No circular loading spinners** — skeletal loaders only.
- **No generic purple in the UI** — purple is reserved for nothing in this system.
- **No `h-screen`** — use `min-h-[100dvh]` to prevent iOS Safari catastrophic jump.
- **No `calc()` percentage layout hacks** — use CSS Grid with explicit column definitions.
- **No mixed gray families** — Slate throughout. No warm gray (`stone`, `zinc`) mixing.
