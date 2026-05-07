# Issue #7 — TRMNL template visual redesign

> **⚠️ DEFERRED 2026-05-07.** This plan represents the framework-primitives-only direction explored on 2026-05-06. It was superseded the next day by the broader Storybook-bridge approach in [issue #197](https://github.com/tsipotU/plnt-trmnl/issues/197). Kept as a research artifact — the framework-class mappings and hex-to-token cross-walk below are still useful reference for the future bridge work. **Do not implement as written.**

**Wave:** 14 (TRMNL identity)
**Target:** `docs/trmnl-templates/full-view.liquid`
**Device:** TRMNL OG, 800×480, 4-level grayscale (1-bit dithered), low-density, default font bundle = TRMNL (3.1)

## Principle

Design from **TRMNL framework v3.1 primitives only**. No hand-rolled inline styles, no arbitrary hex colors, no font-size pixel literals. Every visual choice must trace to a framework page (cited inline below).

When the framework genuinely lacks a primitive, fall back to inline CSS *intentionally* and call out the gap in the plan + the gotcha section of `docs/conventions.md`. The goal is to surface gaps, not paper over them.

## What the platform provides vs. what we provide

Per `framework/docs/3.1/structure`, on the TRMNL platform (which is us — we push to `/api/custom_plugins/<uuid>/push`), the platform supplies the outer `screen → view view--full` wrapper. Our liquid template only provides:

```html
<div class="layout layout--col">...</div>
<div class="title_bar">...</div>
```

Those two are siblings inside the platform-provided `view view--full`. Anything wrapping them is wrong. (Current template is structurally correct here — keep this part.)

## Layout budget

| | Width | Height |
|---|---|---|
| Screen | 800px | 480px |
| Screen padding (default `--gap`) | applied both sides | applied top + bottom |
| Title bar (1-bit, base) | full | **40px** (`--title-bar-height`) |
| Layout content | ~768px | **~400px** after title bar + screen padding |

So every design decision below assumes a ~768×400 content rectangle.

## Framework primitives we'll use

| Primitive | Source page | What we use it for |
|---|---|---|
| `layout layout--col` / `layout--row` + alignment modifiers | `layout` | Outer container direction + alignment |
| `flex flex--row` / `flex--col` + `gap--{size}` | `flex`, `gap` | Card row, in-card stacking, 1-5 scale row |
| `title` component | `title` | Plant name (large heading) |
| `value` + `value--{size}` (`+ value--tnums` for numbers) | `value` | Water amount (numerical emphasis) |
| `label` + `label--{style}` + `label--{size}` | `label` | "Water" / "Fertilizer" inline labels, watch-for badge, overdue badge |
| `text--small` / `text--base` / `text--large` / `text--xxlarge` | `text_size` | Body, meta, fact text |
| `text--gray-{10..75}` (semantic gray scale) | `text_color` | All text shades — replaces every hex like `#666`, `#888` |
| `bg--gray-{10..75}` | `background` | Subtle bg fills (e.g. calibration card) |
| `border--h-{1..7}` / `border--v-{1..7}` | `border` | Dividers between sections inside a card |
| `--rounded-small/medium/large` (via `rounded` utility) | `border` (tokens) + `rounded` | Card corner radius |
| `font--bold` (TRMNL bundle has Bold weight) | `font_family`, `font_weight` | Emphasis on numbers / next-watering name |
| `p--{size}`, `m--{size}`, `gap--{size}` | `spacing`, `gap` | All padding / margin / gap |
| `w--{size}`, `w--max-[Npx]`, `stretch-x` / `stretch-y` | `size`, `layout` | Card widths, fact max-width |
| `title_bar` + `title` + `instance` | `title_bar` | Footer bar (date) |

**Rule:** if it's not in this table, justify in writing why an inline style is needed.

## Element-by-element mapping

### Title bar (both screen states)

```liquid
<div class="title_bar">
  <span class="title">p7l</span>
  <span class="instance">{{ date }}</span>
</div>
```

- Wordmark is `p7l` per project convention (`MEMORY.md` → "user-facing wordmark in Header / About / Welcome"). Current template uses `Plant TRMNL` — that's a leftover from before the Wave 17 wordmark switch. **Question for Emiel below.**
- No icon for now. Title bar will look text-only. Adding `<img class="image">` later if/when there's a 28px logo asset.
- Framework auto-applies the `--title-bar-*` tokens (height 40px, font TRMNL16 bold, etc.).

### Watering day — single plant card

ASCII sketch (one plant, full-width with breathing room):

```
┌────────────────────────────────────────────────────────────────┐
│ Monstera deliciosa                                             │ ← title (TRMNL21 bold)
│ #2 · Italic Banana                                             │ ← text--small text--gray-25  (identifier)
│ Monstera deliciosa albo                                        │ ← text--small text--gray-35 (species)
│ Living room · 20cm pot                                         │ ← text--small text--gray-45 (location · pot)
│ ───────────────────────────  border--h-3 ─────────────────── │
│ Water                                              250 ml     │ ← label + value--small value--tnums
│ Bottom-water until drainage                                    │ ← text--small text--gray-35 (water_desc)
│ Fertilizer                                                Yes │ ← label + label (filled or gray)
│ ───────────                                                    │
│ ⚑ Watch for: yellowing lower leaves                           │ ← label--filled (full-width strip)
│ ┌─────────────────────────────  bg--gray-70  ─────────────┐  │
│ │ How dry was the soil today?                              │  │ ← label font--bold
│ │ 1 wet · 2 · 3 · 4 · 5 dry                                │  │ ← flex flex--row gap--distribute, text--small text--gray-30
│ │ Answer in app before 12:00                               │  │ ← text--small text--gray-45
│ └────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                                                Next: Pothos — Fri, May 8 · every 10 days
                                                                                  ↑ text--small text--gray-25 + value bold for "Pothos"
─────────────────────────────────  border--h-1  ──────────────────
                          [ title_bar ]
```

Liquid skeleton (single-plant case):

```liquid
<div class="layout layout--col gap--medium">

  <div class="flex flex--col gap--small p--medium border--h-3 rounded--medium stretch-y">

    <span class="title">{{ p1_name }}</span>
    {% if p1_identifier != blank %}<span class="text--small text--gray-25">{{ p1_identifier }}</span>{% endif %}
    {% if p1_species   != blank %}<span class="text--small text--gray-35">{{ p1_species }}</span>{% endif %}
    {% if p1_location  != blank %}<span class="text--small text--gray-45">{{ p1_location }} · {{ p1_pot_size }}</span>{% endif %}

    <div class="border--h-3"></div>

    <div class="flex flex--row gap--distribute">
      <span class="label">Water</span>
      <span class="value value--small value--tnums">{{ p1_water }}</span>
    </div>
    <span class="text--small text--gray-35">{{ p1_water_desc }}</span>

    <div class="flex flex--row gap--distribute">
      <span class="label">Fertilizer</span>
      <span class="label {% if p1_fertilizer == 'Yes' %}label--filled{% else %}label--gray{% endif %}">{{ p1_fertilizer }}</span>
    </div>

    {% if p1_watch_for != blank %}
    <span class="label label--filled">Watch for: {{ p1_watch_for }}</span>
    {% endif %}

    {% if p1_has_calibration == true %}
    <div class="flex flex--col gap--xsmall p--small bg--gray-70 rounded--small">
      <span class="label font--bold">{{ p1_cal_question }}</span>
      <div class="flex flex--row gap--distribute">
        <span class="text--small text--gray-30">1 {{ p1_cal_min }}</span>
        <span class="text--small text--gray-30">2</span>
        <span class="text--small text--gray-30">3</span>
        <span class="text--small text--gray-30">4</span>
        <span class="text--small text--gray-30">5 {{ p1_cal_max }}</span>
      </div>
      <span class="text--small text--gray-45">Answer in app before 12:00</span>
    </div>
    {% else %}
    <span class="text--small text--gray-45">Soil: dialed in</span>
    {% endif %}

  </div>

  {% if has_next == true %}
  <div class="border--h-1 p--small">
    <span class="text--small text--gray-25">Next:</span>
    <span class="value value--xxsmall font--bold">{{ next_name }}</span>
    <span class="text--small text--gray-35"> — {{ next_date }} · every {{ next_interval }} days</span>
  </div>
  {% endif %}

</div>
```

### Watering day — two plants

Same card markup, repeated twice, wrapped in a `flex flex--row gap--medium` container so both share the row evenly. `stretch-y` on each card makes them match height naturally:

```liquid
<div class="flex flex--row gap--medium stretch-y">
  <div class="flex flex--col ... stretch-y">…card 1…</div>
  <div class="flex flex--col ... stretch-y">…card 2…</div>
</div>
```

When the row is the only child of a `layout layout--col layout--stretch-x`, both cards expand to fill 50/50. No max-width literals needed — flex does it.

### Rest day — fact

```liquid
<div class="layout layout--col layout--center gap--medium">

  <span class="label label--small text--gray-30">Today's Fact</span>

  <div class="text--xxlarge text--center w--max-[640px]">
    {{ fact_text }}
  </div>

  {% if has_overdue == true %}
  <span class="label label--filled">
    Overdue: {{ overdue_name }} ({{ overdue_days }} days){% if overdue_extra != blank %} {{ overdue_extra }}{% endif %}
  </span>
  {% endif %}

</div>
```

- `text--xxlarge` = 38px (Inter Variable on this size). The issue calls for "elegant typography" — Inter at 38px is the framework's native answer.
- `w--max-[640px]` is an arbitrary-pixel max-width utility from `size`. It's the framework-blessed way to constrain text width — not an inline style.
- `label--filled` for the overdue badge = black background, white text. Cited at `label.md` line 95.

The next-watering footer is identical to the watering-day version above.

## Framework gaps (intentional inline styles)

Three places where the framework genuinely lacks a primitive. Each is called out so future readers know it's deliberate, not laziness.

1. **Italic species name.** Issue's Gherkin says species is italic (`Monstera deliciosa albo`). Framework v3.1 has `font--bold` but no `font--italic`. **Decision:** drop italic — use color hierarchy (`text--gray-35`) for the species line instead. This is a legibility win on 1-bit anyway: italic pixel fonts dither poorly.

2. **Card `<div class="border--h-3"></div>` divider with zero height.** Border utilities apply a styled border to an existing element, not a standalone rule line. **Decision:** use a thin empty div with `border--h-3 h--0.5` (≈2px). If that renders weird, fall back to wrapping the section in a `border--h-3` element instead of using a divider div. Confirm in renderer preview.

3. **Card layout direction inside a `flex flex--col`.** The `flex` utility is documented for both row and col. We use it freely. No gap.

## Token cross-walk (replaces the inline-style mess)

Every hex value in current `full-view.liquid` mapped to its framework equivalent:

| Current (hand-rolled) | Replaces with | Notes |
|---|---|---|
| `color:#000` | `text--black` (default) | |
| `color:#444` | `text--gray-25` | exact match |
| `color:#555` | `text--gray-30` | exact match |
| `color:#666` | `text--gray-35` | exact match |
| `color:#888` | `text--gray-45` | exact match |
| `color:#999` | `text--gray-50` | exact match |
| `border:1.5px solid #000` | `border--h-1` (top/bottom) | |
| `border:1px solid #999` | `border--h-3` | mid-tone |
| `background:#ddd` | `bg--gray-70` | exact match |
| `background:#eee` | `bg--gray-75` | exact match |
| `border-radius:8px` | `rounded--small` (7px) | one px off |
| `border-radius:4px` | `rounded--xsmall` (5px) | one px off |
| `font-size:26px;font-weight:bold` | `<span class="title">` | semantic component |
| `font-size:17px` (water value) | `value--small` (26px) | bigger; matches "prominent" requirement |
| `font-size:13px` | `text--small` (12px) | one px off |
| `font-size:11px` | `text--small` (12px) | one px off |
| `font-size:9px` | no equivalent — see gap #2 | |

The "one px off" rounding is a feature, not a bug — the framework's scale is what TRMNL designed for legibility on 4-grey 800×480.

## Open questions for Emiel

1. **Wordmark in title bar:** `p7l` (per Wave-17 brand convention) or `Plant TRMNL` (current template literal)? My read: `p7l` for consistency with the rest of the app. Confirm.
2. **Drop italic species:** OK to drop italic styling on the species line and use `text--gray-35` for hierarchy instead? (See gap #1.)
3. **Footer placement on rest-day:** issue spec puts "Next watering" footer at the bottom of rest-day too. With `layout--center` for the fact, the footer needs `mt--auto` or wrapping the layout in a `layout--col layout--stretch` with the footer pinned at bottom. I'll use `gap--distribute` on the layout — content stretches, footer sticks. OK?
4. **Watch-for badge style:** filled black (high contrast) vs. outline (less aggressive)? Filled matches issue spec's "high-contrast warning badge". I'll use `label--filled`.

## Acceptance criteria mapping (issue Gherkin → plan)

- [x] Plant name large bold → `<span class="title">` (TRMNL21 bold)
- [x] Species italic, smaller, below name → **dropped italic per gap #1**, color hierarchy instead
- [x] Identifier subtle text → `text--small text--gray-25`
- [x] Location + pot small muted → `text--small text--gray-45`
- [x] Water amount prominent with description → `value--small value--tnums` + `text--small text--gray-35`
- [x] Fertilizer Yes/No badge → `label label--filled` / `label label--gray`
- [x] Watch-for warning badge → `label label--filled`
- [x] Calibration prompt bordered with 1-5 scale → `bg--gray-70 rounded--small p--small` + flex distribute
- [x] Two-plant side-by-side balanced → `flex flex--row gap--medium stretch-y`
- [x] Rest day elegant centered → `layout layout--center` + `text--xxlarge text--center w--max-[640px]`
- [x] Overdue badge high-contrast → `label label--filled`
- [x] Multiple overdue: "+1 more" → handled in cron's `overdue_extra` variable, no template change
- [x] Next-watering footer with top border → `border--h-1 p--small`
- [x] Title bar with date → `title_bar` + `title` + `instance`
- [x] Plant illustration on cards → **deferred** (still issue #138 / Wave 14)
- [x] Test on 800×480 4-grey → renderer preview + on-device push (smoke-test task)

## Out of scope for this PR

- Plant illustration thumbnails on cards (waiting on #138 generator decision).
- TRMNL X dual-resolution (Wave 15, issue #55).
- New merge variables — current `cron.ts` already supplies everything we use here. Will verify before pushing.
