# Wave 6 Design — Nav Shell + PLNT Branding + Vacation Hidden

**Date:** 2026-04-24
**Wave:** 6
**Issues closed:** #78, #79, #80, #81
**Target shape:** single PR (`feat/wave-6-nav-branding`), squash merge.

## 1. Summary

Wave 6 replaces the app's flat top-nav with a logo-and-hamburger shell, commits to the **PLNT** name across user-visible copy, ships the 🪴 emoji as the site's identity (favicon + PWA icon set + minimal manifest), and retires vacation mode from the UI while leaving its backend plumbing intact for future re-introduction.

It is intentionally a small, chrome-level wave — the only behavioural change is that vacation mode becomes invisible to end users. No API schema changes, no new env vars, no scheduling logic changes.

## 2. Scope & issue resolution

| Issue | Title | Resolution |
|---|---|---|
| **#78** | Rename app to PLNT throughout copy | Surgical find-and-replace across 4 user-visible client strings + `index.html` title. Repo name, package names, Docker service names, and the TRMNL Liquid template stay as-is per the issue's DoD. |
| **#79** | 🪴 emoji as logo, favicon, and PWA icon | Ship `favicon.svg` + rasterized PNGs (16/32/64/180/192/512) + `manifest.webmanifest` with icon refs. Use `display: "browser"` — a full-PWA `standalone` manifest is deferred to #59 (which adds the service worker and offline story). |
| **#80** | Hamburger menu in top nav | Replace inline header in `App.tsx:14-101` with a `components/nav/` subsystem: `Header.tsx` (logo left, hamburger right), `HamburgerMenu.tsx` (trigger button), `MenuDrawer.tsx` (right-side slide-in panel). Six menu entries: Add, Archive, Feedback, Settings, Setup, About. Feedback FAB stays. |
| **#81** | Move "Vacation" out of dashboard and into Settings | **Scope reframed.** UI hidden, plumbing preserved: remove `<VacationToggle />` usage from Dashboard, don't add to Settings, no dashboard banner. `VacationToggle.tsx`, `/vacation-start` and `/vacation-end` routes, and the bin-packer vacation path stay untouched. Close #81 with a comment: "Removed from UI this wave; re-introduce if/when we want vacation mode back — the backend is intact." |

### Also shipped in this PR
- New `/about` route backed by a skeletal `About.tsx` page (heading + one sentence). The issue body permits "may be skeletal."
- New scripts/generate-favicons.mjs — one-off rasterizer, committed so the icon set can be regenerated if the source SVG changes.

### Explicitly out of scope
- Visual redesign of the rest of the app (#40 holistic frontend pass).
- Service worker, offline caching, standalone PWA display mode (#59).
- Renaming Docker services, package scopes, repo name, TRMNL template, `README.md`, `CLAUDE.md` (per #78 DoD).
- Vacation dashboard banner / Settings vacation section (deferred with the feature).
- Version/commit-SHA/credits on the About page (deferred to #57 release playbook).

## 3. File layout

```
packages/api/client/
  index.html                          -- EDIT: title "PLNT", favicon/apple-touch/manifest links, theme-color
  public/                             -- NEW folder
    favicon.svg                       -- NEW: inline 🪴 SVG
    favicon-16.png                    -- NEW
    favicon-32.png                    -- NEW
    favicon-64.png                    -- NEW
    apple-touch-icon.png              -- NEW (180x180)
    icon-192.png                      -- NEW
    icon-512.png                      -- NEW
    manifest.webmanifest              -- NEW
  src/
    App.tsx                           -- EDIT: import <Header />, add /about route, drop inline header
    components/
      nav/                            -- NEW folder
        Header.tsx                    -- NEW
        Header.test.tsx               -- NEW
        HamburgerMenu.tsx             -- NEW
        HamburgerMenu.test.tsx        -- NEW
        MenuDrawer.tsx                -- NEW
        MenuDrawer.test.tsx           -- NEW
      VacationToggle.tsx              -- UNCHANGED (becomes unreferenced)
    pages/
      About.tsx                       -- NEW
      About.test.tsx                  -- NEW
      Dashboard.tsx                   -- EDIT: drop VacationToggle, rename "Plant TRMNL"
      TrmnlSetup.tsx                  -- EDIT: rename "Plant TRMNL"
      PlantDetail.tsx                 -- EDIT: rename "plnt-trmnl"
scripts/
  generate-favicons.mjs               -- NEW
docs/plans/
  2026-04-24-wave-6-design.md         -- THIS FILE
  2026-04-24-wave-6-manual-test.md    -- NEW (appendix-style post-deploy smoke)
```

## 4. Component design

### 4.1 `Header.tsx`

Sticky top bar, same background / border / padding conventions as the current inline header. Flex space-between.

- Left: `<Link to="/" aria-label="PLNT home">` containing `<span aria-hidden>🪴</span>` + `<span>PLNT</span>`. Emoji is decorative (screen readers skip it); the `aria-label` carries meaning.
- Right: `<HamburgerMenu open={menuOpen} onToggle={...} />`.
- Renders `<MenuDrawer open={menuOpen} onClose={...} />` as a sibling (not a child of the `<header>` element) so it can overlay full viewport.

Drawer open/closed state lives here as a local `useState<boolean>`.

The `useLocation`-based active highlight from today's header moves into `MenuDrawer` — the top logo doesn't need an active style (it always routes to `/`).

### 4.2 `HamburgerMenu.tsx`

Pure presentational button.

**Props:** `open: boolean`, `onToggle: () => void`, and a `ref` forwarded to the underlying `<button>` so `MenuDrawer` can restore focus to it on close.

**Attributes:**
- `aria-expanded={open}`
- `aria-controls="main-menu"`
- `aria-label={open ? 'Close menu' : 'Open menu'}`
- `type="button"`

**Visual:** 44×44px tap target, the Unicode `≡` (U+2630) glyph as text, same `color: var(--text-primary)` as the logo. The glyph does not morph between states (no icon-to-X transition) — the drawer slide animation carries the affordance.

### 4.3 `MenuDrawer.tsx`

Right-side slide-in panel. Props: `open: boolean`, `onClose: () => void`, and optionally a `triggerRef` for focus restore.

**Structure:**
```tsx
<>
  {open && <div aria-hidden="true" className="backdrop" onClick={onClose} />}
  <aside
    id="main-menu"
    role="dialog"
    aria-modal="true"
    aria-label="Main menu"
    aria-hidden={!open}
    style={{ transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 180ms ease-out' }}
  >
    <nav>
      <Link to="/add">Add plant</Link>
      <Link to="/archived">Archive</Link>
      <Link to="/feedback">Feedback</Link>
      <Link to="/settings">Settings</Link>
      <Link to="/setup">Setup</Link>
      <Link to="/about">About</Link>
    </nav>
  </aside>
</>
```

**A11y behaviors (#80 DoD):**
1. **Focus on open**: when `open` transitions false→true, focus the first link.
2. **Focus restore on close**: when `open` transitions true→false, call `triggerRef.current?.focus()`.
3. **Escape closes**: global `keydown` listener while mounted; `e.key === 'Escape'` → `onClose()`.
4. **Focus trap**: on `keydown` within the drawer, if `e.key === 'Tab'`, check if active element is first/last focusable and wrap.
5. **Backdrop click closes**: `onClick` on the backdrop div → `onClose()`.
6. **Route change closes**: `useEffect` with `[location.pathname]` dependency → `onClose()`. Clicking any link inside the drawer navigates and dismisses in one gesture.
7. **Body scroll lock**: while `open`, `document.body.style.overflow = 'hidden'`. Cleanup restores on unmount or when `open` becomes false.

**Sizing:** `width: min(85vw, 320px)`, full height, anchored right.

**Styling:** inline `style={{}}` + CSS variables per CLAUDE.md project convention. No CSS modules, no Tailwind.

### 4.4 `About.tsx`

```tsx
export function About() {
  return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>About PLNT</h1>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        PLNT is a plant care companion that keeps your watering schedule honest and your plants alive. Small, self-hosted, quietly obsessive.
      </p>
    </div>
  );
}
```

Intentionally minimal. Version, commit SHA, GitHub link, credits — deferred to #57.

### 4.5 Vacation removal

**`Dashboard.tsx`:**
- Remove `import { VacationToggle } from '../components/VacationToggle.js';` (line 4).
- Remove `<VacationToggle />` JSX (line 95).
- Nothing else changes.

**Unchanged:**
- `VacationToggle.tsx` — stays on disk. The file remains valid TypeScript and compiles cleanly on its own; it just has no importers. Implementation will verify that `tsc` / eslint don't flag it as unused in a way that fails CI — if they do, the remediation is either an `eslint-disable` note at the top of the file or a re-export from somewhere unobtrusive.
- API routes `POST /vacation-start` and `POST /vacation-end`.
- `scheduling/vacation.ts` and its call into `scheduleNextWater`.
- `CLAUDE.md` vacation-related entries — still true at the plumbing level.

### 4.6 `App.tsx` changes

```tsx
// DELETED: the entire inline function Header() { ... } block (lines 14-101)
import { Header } from './components/nav/Header.js';
// ...
<Routes>
  <Route path="/" element={<Dashboard />} />
  {/* ... existing routes ... */}
  <Route path="/settings" element={<Settings />} />
  <Route path="/about" element={<About />} />   {/* NEW */}
</Routes>
```

## 5. Branding details

### 5.1 Copy changes (#78)

| File | Line(s) | Before | After |
|---|---|---|---|
| `packages/api/client/index.html` | 5 | `<title>Plant TRMNL</title>` | `<title>PLNT</title>` |
| `packages/api/client/src/App.tsx` | 39 | `Plant TRMNL` wordmark in `<Link>` | handled by new `Header.tsx` → `🪴 PLNT` |
| `packages/api/client/src/pages/Dashboard.tsx` | 179 | `Welcome to Plant TRMNL` | `Welcome to PLNT` |
| `packages/api/client/src/pages/TrmnlSetup.tsx` | 68 | `Connect your TRMNL e-ink display to Plant TRMNL` | `Connect your TRMNL e-ink display to PLNT` |
| `packages/api/client/src/pages/PlantDetail.tsx` | 178 | `…plnt-trmnl suggests how to address them.` | `…PLNT suggests how to address them.` |

**Naming convention** (for future consistency):
- `🪴 PLNT` (emoji + wordmark) in logo surfaces only — top-bar header, large branded titles.
- `PLNT` alone in prose — "Welcome to PLNT", "About PLNT". The word carries the brand; no emoji decoration in body copy.

### 5.2 Favicon & icons (#79)

**Source of truth: `public/favicon.svg`**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-size="52" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji">🪴</text>
</svg>
```

Modern browsers render the SVG directly. It's the primary favicon for Chrome/Firefox/Safari 2023+.

**Rasterization: `scripts/generate-favicons.mjs`**
Runs locally (not in CI — Ubuntu runners lack color-emoji fonts). Uses Puppeteer (already available transitively via the renderer) to load the SVG in a headless Chromium at each target size and screenshot a PNG. Outputs: `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`. All committed to `public/`.

Platform rendering note: because Puppeteer uses the host's emoji font, PNGs generated on macOS carry the Apple-style terracotta pot. This is acceptable — iOS users get a native-feeling icon, Android gets the Apple pot in contexts that use apple-touch-icon (iOS only; Android uses manifest icons which are the same PNGs). If we ever want strict cross-platform identity, we'd replace the SVG source with a custom vector. For now the emoji-native rendering is the point.

**Index head block:**
```html
<title>PLNT</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#0f172a" />
```

### 5.3 `manifest.webmanifest`

```json
{
  "name": "PLNT",
  "short_name": "PLNT",
  "description": "Plant care companion",
  "start_url": "/",
  "display": "browser",
  "theme_color": "#0f172a",
  "background_color": "#0f172a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

**Critical choice: `display: "browser"`.** Without a service worker, a `standalone` install would break offline and mislead users. #59 flips this value when the service worker ships.

### 5.4 API static serving

Vite copies `packages/api/client/public/*` into `dist/` during `vite build`. Express 5 already serves `dist/` as static — new assets land at `/favicon.svg`, `/manifest.webmanifest` automatically. **No `packages/api/src/index.ts` edit expected.**

Implementation must verify that the SPA catch-all (`app.get('{*path}', ...)`) does not intercept manifest/icon requests. Static middleware order in `index.ts` runs before the SPA fallback, so this should hold, but the manual smoke test below exercises it explicitly.

## 6. Testing plan

### 6.1 Client unit tests (jsdom, `packages/api/client/vitest.config.ts`)

- **`Header.test.tsx`** — logo renders with 🪴 + PLNT, hamburger button renders, clicking hamburger toggles `aria-expanded`.
- **`HamburgerMenu.test.tsx`** — `aria-expanded` reflects `open` prop, `aria-label` swaps between "Open menu" and "Close menu", `onToggle` fires on click.
- **`MenuDrawer.test.tsx`**
  - `aria-hidden` reflects `!open`.
  - Pressing Escape while open calls `onClose`.
  - Clicking the backdrop calls `onClose`.
  - Route change (simulated via `MemoryRouter` navigation) calls `onClose`.
  - On open, focus lands on the first link.
  - Tab from the last focusable element wraps to the first.
  - Shift+Tab from the first wraps to the last.
- **`About.test.tsx`** — renders `<h1>About PLNT</h1>` and the tagline sentence.
- **`Dashboard.test.tsx`** — if the file exists, update it to assert `VacationToggle` does not render. If it doesn't exist, add a minimal test for this assertion.

### 6.2 API tests

None. Vacation routes, scheduling, bin-packer — all unchanged.

### 6.3 Manual smoke test (`docs/plans/2026-04-24-wave-6-manual-test.md`)

1. `curl -I http://localhost:3900/manifest.webmanifest` → 200 + `application/manifest+json` (or `application/json`, depending on Express MIME defaults — note the expected value during implementation).
2. `curl -I http://localhost:3900/favicon.svg` → 200 + `image/svg+xml`.
3. `curl -I http://localhost:3900/apple-touch-icon.png` → 200 + `image/png`.
4. Open the app in Safari desktop → tab icon shows 🪴, title reads "PLNT".
5. Open the app in mobile Safari → "Add to Home Screen" uses the 🪴 apple-touch-icon.
6. Click the hamburger → drawer slides in from the right, six entries visible.
7. Click "Archive" → drawer closes, route changes to `/archived`.
8. Open drawer → press Escape → drawer closes.
9. Open drawer → tap backdrop → drawer closes.
10. Open drawer → Tab through all entries → focus wraps from last back to first.
11. Dashboard: no "Vacation" button anywhere.
12. Regression: add a plant, water it, confirm the schedule still reflects bin-packer overflow behavior. Vacation plumbing untouched by this wave but the smoke touches adjacent code.

## 7. Rollout

- **Branch:** `feat/wave-6-nav-branding`.
- **PR title:** `feat: Wave 6 — nav shell + PLNT branding + vacation hidden`.
- **Closes:** `Closes #78, closes #79, closes #80, closes #81` in the PR body.
- **Merge strategy:** squash, delete branch after merge.
- **Post-merge memory update:** replace the stale "Wave 6 — Deferrals to close without code" entry in user memory with the actual resolution (4 merged issues, #81 reframed).
- **Post-merge README/CLAUDE.md:** no changes expected. If an implementation surprise surfaces a new gotcha, add it to `CLAUDE.md` in the same PR.

## 8. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Favicon generation fails on non-macOS environments (e.g., if rerun in CI later) | Med | Script is explicitly documented as a local-only tool; committed PNGs are the source of truth for deployment. |
| SPA catch-all intercepts `/manifest.webmanifest` | Low | Static middleware runs first in `index.ts`; manual smoke test step 1 verifies explicitly. |
| Focus trap implementation subtly broken (edge case: no focusable children) | Low | The drawer always has six `<Link>` children — there's always at least one focusable element. Unit test covers wrap-around. |
| Users who had VacationToggle running mid-vacation get stranded (vacation mode active but no UI to end it) | Low | The plumbing is intact: they can `curl POST /vacation-end` or we leave `VacationToggle.tsx` re-linkable in one line. Acceptable trade-off; Emiel is the only current user. |
| Adding `/about` route breaks existing tests that count routes | Very low | No known tests count routes; confirmed in section 6. |

## 9. Open questions

None — all resolved during brainstorming.

## 10. Sign-off

Spec to be reviewed by Emiel before `writing-plans` produces the implementation plan.
