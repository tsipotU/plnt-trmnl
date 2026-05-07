# Font Family

The Framework ships two pixel font bundles: Classic (NicoPups, NicoClean, BlockKie) and TRMNL (TRMNL12, TRMNL16, TRMNL21). Low-density displays use the selected bundle; high-density displays use Inter Variable for legibility.

The original pixel set. Three single-weight fonts: NicoPups, NicoClean, BlockKie. Default in Framework 3.0.

The new pixel set. Three font families with Regular and Bold weights: TRMNL12, TRMNL16, TRMNL21. Default in Framework 3.1.

    <div class="screen screen--fonts-classic">...</div>

    <div class="screen screen--fonts-trmnl">...</div>

Both bundles are available in Framework 3.x. Low-density displays use the selected pixel-font bundle.
 High-density displays use **Inter Variable** regardless of bundle or bit depth.
 In Framework 3.1, screens without a font-bundle class use **TRMNL** by default; add `screen--fonts-classic` to opt into Classic.

### Classic bundle

Three single-weight pixel fonts.
 Activate by adding `screen--fonts-classic` to the screen root.
 This controls pixel-font output on low-density displays; high-density displays still resolve to Inter.

#### NicoPups

Designed at **16px** pixel height. Used for descriptions, small labels, and metadata.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "NicoPups" · font-size: 16px

#### NicoClean

Designed at **16px** pixel height. The workhorse font, used for labels, rich text body copy, and title-bar text.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "NicoClean" · font-size: 16px

#### BlockKie

Designed at **26px** pixel height. Used for titles and large rich-text. The largest pixel font in the Classic bundle.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "BlockKie" · font-size: 26px

#### On-device preview

text--small · Classictext--base · Classictext--large · Classictext--base font--bold · Classic

Classic bundle

**High-density font notice:** This preview is using Inter because the selected device is high-density. Classic and TRMNL pixel bundles still apply on low-density displays; choose a 1x-density model in Device Preview to compare those bundles.

### TRMNL bundle

Three font families, each with Regular and Bold weights.
 This is the implicit default for Framework 3.1 when no font-bundle class is present.
 Add `screen--fonts-trmnl` when you want to pin the bundle explicitly.
 This controls pixel-font output on low-density displays; high-density displays still resolve to Inter.

#### TRMNL12

Designed at **12px** pixel height. The smallest pixel font, used for descriptions, small labels, and metadata.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

Bold 700

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "TRMNL12" · font-size: 12px

#### TRMNL16

Designed at **16px** pixel height. The workhorse font, used for labels, rich text body copy, and title-bar text.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

Bold 700

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "TRMNL16" · font-size: 16px

#### TRMNL21

Designed at **21px** pixel height. The largest pixel font, used for titles, headings, and large rich-text.

Regular 400

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

Bold 700

ABCDEFGHIJKLMNOPQRSTUVWXYZ

abcdefghijklmnopqrstuvwxyz

0123456789

!@#$%^&*()-=+[]{}|;:',./<>?

font-family: "TRMNL21" · font-size: 21px

#### On-device preview

text--small · TRMNLtext--base · TRMNLtext--large · TRMNLtext--base font--bold · TRMNL

TRMNL bundle

**High-density font notice:** This preview is using Inter because the selected device is high-density. Classic and TRMNL pixel bundles still apply on low-density displays; choose a 1x-density model in Device Preview to compare those bundles.

### Component-by-component bundle map

Each component picks the appropriate font based on the active bundle. On high-density
 displays Inter Variable is used for every component regardless of bundle.

| Component | Classic (low-density) | TRMNL (low-density) | High-density |
| --- | --- | --- | --- |
| Title Bar | NicoClean | TRMNL16 | Inter Variable |
| Title | BlockKie | TRMNL21 | Inter Variable |
| Title (small) | NicoClean | TRMNL16 | Inter Variable |
| Label | NicoClean | TRMNL16 | Inter Variable |
| Label (small) | NicoPups | TRMNL12 | Inter Variable |
| Description | NicoPups | TRMNL12 | Inter Variable |
| Description (large) | NicoClean | TRMNL16 | Inter Variable |
| Value (xxsmall) | NicoClean | TRMNL16 | Inter Variable |
| Value (other sizes) | Inter Variable | Inter Variable | Inter Variable |
| Rich Text | NicoClean | TRMNL16 | Inter Variable |
| Rich Text (small) | NicoPups | TRMNL12 | Inter Variable |
| Rich Text (large) | BlockKie | TRMNL21 | Inter Variable |
| Item Index | NicoPups | TRMNL12 | Inter Variable |

Previous

[Tokens Complete CSS variable reference with root defaults, density, and bit-depth overrides](/framework/docs/3.1/tokens)

Next

[Font Weight Toggle between regular and bold font weight independently of size](/framework/docs/3.1/font_weight)
