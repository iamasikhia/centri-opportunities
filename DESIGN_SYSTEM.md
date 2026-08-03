# Design System Reference

Extracted from the Centri Solo codebase (Next.js 16 + Tailwind CSS v4). Hand this file
to Claude in a new project as a style guide — it describes fonts, colors, backgrounds,
component patterns, and the behavioral rules that keep the UI consistent.

---

## 1. Typography

Two Google Fonts, loaded via `next/font/google` in the root layout:

```tsx
import { Figtree, Instrument_Serif } from "next/font/google"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" })
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
})

// on <html>:
className={`${figtree.variable} ${instrumentSerif.variable} h-full antialiased`}
```

```css
@theme inline {
  --font-sans: var(--font-figtree);
  --font-serif: var(--font-instrument);
}
```

**Usage rule:**
- **Figtree** (`--font-figtree`) — all body text, UI labels, buttons, nav. This is the default sans font.
- **Instrument Serif** (`--font-instrument`) — display headings only (page titles, hero copy, modal titles). Often paired with `<em>` for italic emphasis on a key phrase. Applied inline via `style={{ fontFamily: "var(--font-instrument)" }}` rather than a Tailwind class, with a fluid clamp() size:
  ```tsx
  <h1 style={{ fontFamily: "var(--font-instrument)", fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
    Page heading <em>with emphasis</em>
  </h1>
  ```
  Larger hero variant: `clamp(2.4rem, 4.5vw, 3.75rem)`.

Never use a generic sans stack or a third font — every heading is Instrument Serif, everything else is Figtree.

---

## 2. Color system

Base tokens (`:root`):

```css
:root {
  --black: #1A1A1A;
  --white: #FFFFFF;
  --bg: #FFFFFF;
  --bg-surface: #FAFAFA;
  --gray-50:  #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E5E5E5;
  --gray-400: #A3A3A3;
  --gray-600: #525252;
  --gray-800: #262626;
}
```

Practically, components use raw Tailwind arbitrary values rather than the CSS vars directly:
`#1A1A1A` (primary text/dark surfaces), `#FFFFFF`/`#111111` (card backgrounds light/dark),
`#F5F5F5`/`#1A1A1A` (subtle fills), `#E5E5E5`/`#2A2A2A` (borders), `#A3A3A3` (muted/secondary text).

**Status/accent colors** — used sparingly, only to mean something:
- Red (`red-500`/`red-600`) — urgent, overdue, destructive, rejected
- Amber (`amber-500`/`amber-600`) — pending, warning, needs attention
- Emerald/green (`emerald-500`/`green-600`) — success, confirmed, active, good
- Blue (`blue-500`/`blue-600`) — informational, links, web/external source
- **Never purple.** Explicit house rule — purple is not in the palette anywhere.

Color is a signal, not decoration: don't tint something red/amber just because it's "important" —
reserve color for the specific status it represents, and default to neutral gray/black-white otherwise.
(E.g. a count badge should be neutral even if what it's counting is urgent — only the item itself should carry the status color.)

### Three theme modes: light (default), dark, cream

Theme is stored in a cookie and applied as a class on `<html>`: `""` (light), `"dark"`, or `"cream"`.

```tsx
const themeCookie = cookieStore.get("theme")?.value ?? "cream"
const themeClass = themeCookie === "dark" ? "dark" : themeCookie === "cream" ? "cream" : ""
```

Tailwind v4 dark variant is wired to the class (not `prefers-color-scheme`):
```css
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));
```

**Cream mode** is implemented as CSS overrides that remap specific light-mode utility classes
(warm off-white instead of pure white):
```css
.cream .bg-white        { background-color: #F9F7F2; }
.cream .bg-\[\#F5F5F5\] { background-color: #EDE9E0; }
.cream .border-\[\#E5E5E5\] { background-color: #E0DCD4; }
/* ...same pattern for every surface/border shade used */
```

**Dark mode rule (important):** every single component must ship a `dark:` variant for every
color utility — background, border, and text. There is no fallback; a missing `dark:` class shows
up as a jarring white box/border in dark mode. This has been the #1 recurring bug class in this
codebase. Always pair, e.g.:
```
bg-white dark:bg-[#111111] border-[#E5E5E5] dark:border-[#2A2A2A] text-[#1A1A1A] dark:text-white
```

---

## 3. Backgrounds

### Dot-grid (primary background texture)
A subtle radial-dot pattern used behind main content areas and empty-state canvases:
```css
.dot-grid {
  background-color: #FFFFFF;
  background-image: radial-gradient(circle, #DCDCDC 1px, transparent 1px);
  background-size: 24px 24px;
}
.dark .dot-grid {
  background-color: #0D0D0D;
  background-image: radial-gradient(circle, #222222 1px, transparent 1px);
  background-size: 24px 24px;
}
.cream .dot-grid {
  background-color: #F2F0EB;
  background-image: radial-gradient(circle, #DDD9CF 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### Grain texture (adds tactile depth to solid dark panels, e.g. hero sections)
```css
.grain { position: relative; isolation: isolate; }
.grain::after {
  content: "";
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.055;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px 128px;
}
```

### Abstract circle accents (used on dark hero/marketing panels)
Large, faint, oversized concentric circles bleeding off the edges of a dark panel — pure decoration, very low opacity, never interactive:
```tsx
<div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full border border-white/5 pointer-events-none" />
<div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.03] pointer-events-none" />
```
Pattern: 2-3 circles, wildly oversized relative to their container, positioned to bleed off corners/center, `border` only (no fill), opacity between 3-5% white, `pointer-events-none`. Combine with `.grain` on the same panel.

---

## 4. Layout & component conventions

- **Corner radius:** `rounded-2xl` (1rem) is the default for cards, panels, buttons, input fields. `rounded-xl` for smaller nested elements (icon containers, small buttons). `rounded-full` for pills/badges/avatars.
- **Cards:** `bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-2xl` — `shadow-sm` by default on elevated cards (stat tiles, hover cards), no shadow on flat list rows.
- **Spacing:** generous internal padding (`p-4`/`p-5`), `gap-2` to `gap-4` between related elements, `space-y-4`/`space-y-6` for vertical rhythm between sections.
- **Icons:** `lucide-react` exclusively. Pick icons for their literal meaning — don't reuse the same icon for two different concepts within one view. Size `w-3.5 h-3.5` to `w-5 h-5` depending on context; muted color (`text-[#A3A3A3]`) when decorative, full contrast when meaningful.
- **Badges/pills:** `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full` with a status-colored `bg-{color}-50 dark:bg-{color}-950/30 text-{color}-600 dark:text-{color}-400 border border-{color}-200 dark:border-{color}-800`.
- **Stat tiles:** icon + label (small, muted, uppercase) stacked above a large bold number. Number color is neutral black/white by default — only tint it when the metric itself is inherently bad/good (see color rule above).

---

## 5. Buttons

- **Primary:** solid, `bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A]`, `rounded-xl`, `font-semibold`, `hover:opacity-90`.
- **Secondary:** outline, `border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#1A1A1A] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A]`.
- **Tab switcher (segmented control):** `bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-xl p-1` wrapper; active tab gets `bg-white dark:bg-[#2A2A2A] shadow-sm text-[#1A1A1A] dark:text-white`; inactive tabs are `text-[#A3A3A3] hover:text-[#1A1A1A]`.

---

## 6. Toggles (approved spec — don't deviate)

Background color changes on state (gray → green); the circle/knob **stays on the left** in both
states — it does not slide to the right like a typical iOS toggle. This was an explicit design
decision, not an oversight.
```tsx
<button className={`relative w-10 h-6 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"}`}>
  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" />
</button>
```

---

## 7. Modals & side panels

- **Side panels (drawers):** slide in from the right, fixed width (`max-w-md` / `max-w-[440px]`), full height, portaled to `document.body` via `createPortal` — never rendered inline. Always paired with a dark overlay (`bg-black/40` to `bg-black/50`, click to dismiss).
- **Why portal is mandatory:** the page's `anim`/`anim-fade-up` entrance animations use CSS `transform`, which breaks `position: fixed` for any descendant. Any modal/drawer nested inside an animated ancestor will render in the wrong place unless it's portaled out to `document.body`.
- **Centered modals:** for small confirmations only, `fixed inset-0 flex items-center justify-center`, also portaled.
- **Panel header:** icon chip + title/subtitle + close (X) button, `border-b`, `px-5 py-4`.
- **Panel sections:** use a repeatable `Section` wrapper — `px-5 py-4 border-b border-[#F5F5F5] dark:border-[#1E1E1E]` with a small uppercase label (`text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wider`) above the content.

---

## 8. Animation system

Entrance animation via a small utility class system, not a JS animation library:
```css
.anim { opacity: 0; animation-fill-mode: both; animation-duration: 0.55s; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.anim-fade-up { animation-name: fade-up; }   /* translateY(20px) → 0, fade in */
.anim-fade-in { animation-name: fade-in; }   /* opacity only */
.anim-scale   { animation-name: scale-in; }  /* scale(0.94) → 1 */

/* stagger children by 80ms steps */
.d-0 { animation-delay: 0ms; }  .d-1 { animation-delay: 80ms; }  .d-2 { animation-delay: 160ms; } /* …etc */
```
Usage: `<div className="anim anim-fade-up d-2">`. Apply increasing `d-N` to successive elements on
a page for a staggered entrance. Side panels use `slide-in-right` instead.

---

## 9. Voice / product tone

- Copy is direct and specific, not generic SaaS-speak. Headlines state the outcome plainly
  ("Never miss another inbound lead"), not the feature ("AI-powered inbox management").
  Micro-copy explains *why* a number is what it is, not just the number.
- Status text is honest about failure states rather than hiding them (e.g. explicit "Couldn't load
  this — it may have been deleted" rather than a silent blank).

---

## 10. What NOT to do (lessons learned in this codebase)

- Don't ship a color utility without its `dark:` pair.
- Don't nest a modal/drawer directly in the DOM tree if any ancestor has `anim`/transform-based
  entrance animation — portal it.
- Don't use purple anywhere.
- Don't reuse the same icon for two semantically different badges/states in the same view.
- Don't let a stat number inherit a status color unless that specific stat is itself the bad/good thing being measured.
- Keep icon-only affordances (icon buttons with no label) large enough and distinct enough not to
  read as a random colored dot — a filled icon at very small size (< ~16px) can lose its shape
  entirely, especially on a colored fill.
