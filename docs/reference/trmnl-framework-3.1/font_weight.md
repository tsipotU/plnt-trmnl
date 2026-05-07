# Font Weight

Utility classes for controlling font weight independently of size. Classic ships in a single weight, so <code>font--bold</code> is a no-op on low-density Classic; on low-density TRMNL it picks the bundled bold variant; on high-density displays it sets the Inter Variable weight.

### Usage

Use `font--regular` and `font--bold` to control font weight
 independently of size. Density decides whether the active pixel-font bundle or Inter receives the
 weight. The bold variant is resolved as follows:

- **Classic** bundle: every font ships in a single weight, so `font--bold` has no visual effect on low-density Classic.
- **TRMNL** bundle: `font--bold` selects the matching **TRMNL12/16/21 Bold** font file at the active size.
- **High-density** displays: both classes simply set the Inter Variable weight to 400 or 700.

**High-density font notice:** This preview is using Inter because the selected device is high-density. Classic and TRMNL pixel bundles still apply on low-density displays; choose a 1x-density model in Device Preview to compare those bundles.

| Class | Weight | Classic (low-density) | TRMNL (low-density) | High-density |
| --- | --- | --- | --- | --- |
| `font--regular` | 400 | NicoPups / NicoClean / BlockKie | TRMNL12/16/21 Regular | Inter Variable @ 400 |
| `font--bold` | 700 | — (no bold variant) | TRMNL12/16/21 Bold | Inter Variable @ 700 |

#### Weight comparison · Classic bundle

Each weight shown at every pixel-font size with `screen--fonts-classic` on the screen root.
 Low-density displays use that bundle; high-density displays use Inter weights instead.

text--small font--regulartext--small font--bold

text--base font--regulartext--base font--bold

text--large font--regulartext--large font--bold

Font WeightClassic

#### Weight comparison · TRMNL bundle

Each weight shown at every pixel-font size with `screen--fonts-trmnl` on the screen root.
 Low-density displays use that bundle; high-density displays use Inter weights instead.

text--small font--regulartext--small font--bold

text--base font--regulartext--base font--bold

text--large font--regulartext--large font--bold

Font WeightTRMNL

    <span class="text--small font--regular">Small regular</span>
    <span class="text--small font--bold">Small bold</span>
    <span class="text--base font--regular">Base regular</span>
    <span class="text--base font--bold">Base bold</span>
    <span class="text--large font--regular">Large regular</span>
    <span class="text--large font--bold">Large bold</span>

### Responsive & bit-depth variants

Font weight utilities support responsive, orientation, and bit-depth prefixes.
 Combine them to fine-tune weight across screen sizes and display types.

| Variant | Example | Description |
| --- | --- | --- |
| Responsive | `md:font--bold` | Bold at medium breakpoint and up |
| Orientation | `portrait:font--regular` | Regular weight in portrait orientation |
| Bit-depth | `4bit:font--bold` | Bold on 4-bit displays only |
| Combined | `md:4bit:font--bold` | Bold at medium breakpoint on 4-bit displays |

    <span class="text--base font--regular 4bit:font--bold">
      Bold only on 4-bit displays
    </span>
    <span class="text--large font--regular md:font--bold">
      Bold at medium breakpoint and up
    </span>

Previous

[Font Family Switch between Classic and TRMNL font bundles per device](/framework/docs/3.1/font_family)

Next

[Font Glyphs Browse every glyph available in each Framework font bundle](/framework/docs/3.1/font_glyphs)
