# Text Color

The Text Color system creates the illusion of grayscale text through carefully designed dither patterns. When rendered on 1-bit (black and white only) displays, these patterns create an illusion of different shades of gray by using specific arrangements of black and white pixels. The shade scale matches the [Colors](/framework/docs/3.1/colors) palette.

### Usage

Use the `text--{shade}` utility
 classes to apply these text color patterns to any element. Choose from sixteen values: black, gray-10 through gray-75,
 and white. See the [Responsive Features](#responsive-text-color) section for responsive variants.

Aa

black

Aa

gray-10

Aa

gray-15

Aa

gray-20

Aa

gray-25

Aa

gray-30

Aa

gray-35

Aa

gray-40

Aa

gray-45

Aa

gray-50

Aa

gray-55

Aa

gray-60

Aa

gray-65

Aa

gray-70

Aa

gray-75

Aa

white

Aa

black

Aa

gray-10

Aa

gray-15

Aa

gray-20

Aa

gray-25

Aa

gray-30

Aa

gray-35

Aa

gray-40

Aa

gray-45

Aa

gray-50

Aa

gray-55

Aa

gray-60

Aa

gray-65

Aa

gray-70

Aa

gray-75

Aa

white

Text color shades

**Dark Mode Notice:** The color palette appears inverted because TRMNL's dark mode inverts the entire screen, except the images.

    <div class="text--black">Black text</div>
    <div class="text--gray-10">Gray 10 text</div>
    <div class="text--gray-15">Gray 15 text</div>
    <div class="text--gray-20">Gray 20 text</div>
    <div class="text--gray-25">Gray 25 text</div>
    <div class="text--gray-30">Gray 30 text</div>
    <div class="text--gray-35">Gray 35 text</div>
    <div class="text--gray-40">Gray 40 text</div>
    <div class="text--gray-45">Gray 45 text</div>
    <div class="text--gray-50">Gray 50 text</div>
    <div class="text--gray-55">Gray 55 text</div>
    <div class="text--gray-60">Gray 60 text</div>
    <div class="text--gray-65">Gray 65 text</div>
    <div class="text--gray-70">Gray 70 text</div>
    <div class="text--gray-75">Gray 75 text</div>
    <div class="text--white">White text</div>

### Backward Compatibility

For backward compatibility, the original shade names (`gray-1` through `gray-7`) are still supported but deprecated. These map to equivalent extended shades:

    <!-- Deprecated (but still works) -->
    <div class="text--gray-1">Gray 1 text (deprecated)</div>
    <div class="text--gray-2">Gray 2 text (deprecated)</div>

    <!-- Preferred (new naming) -->
    <div class="text--gray-10">Gray 10 text (preferred)</div>
    <div class="text--gray-20">Gray 20 text (preferred)</div>

### Responsive Features

Text color classes support size-based and orientation-based responsive variants.
 Bit-depth affects color rendering automatically based on the device (1-bit patterns, 2-bit patterns, 4-bit solid colors)—no bit-depth class prefixes are needed for colors.

#### Breakpoint Prefixes

Use breakpoint prefixes like `sm:`, `md:`, `lg:` to apply different colors at different screen widths.

Responsive color

Gray 50 by default, gray 30 on md+

Text ColorResponsive

    <!-- Text color: different shades at different breakpoints -->
    <span class="value text--gray-50 md:text--gray-30">Responsive color</span>

    <!-- Progressive color scaling -->
    <span class="value text--gray-70 sm:text--gray-50 md:text--gray-30 lg:text--black">Progressive color</span>

#### Orientation and Size+Orientation

Text colors can adapt to orientation with `portrait:` and `landscape:`, and can be combined
 with size breakpoints (e.g., `md:portrait:`).

    <!-- Different color in portrait -->
    <span class="value text--gray-50 portrait:text--black">Orientation color variant</span>

    <!-- Combined size and orientation -->
    <span class="value text--gray-50 md:portrait:text--gray-30">Color on md+ portrait</span>

Text color classes support size-based and orientation-based variants only. Bit-depth affects color rendering automatically based on the device (1-bit patterns, 2-bit patterns, 4-bit solid colors)—no bit-depth class prefixes are needed for colors.

### Related Tokens

These tokens are automatically mapped to this page by token prefix.

| Token | 1-bit | 2-bit | Density 2x | 4/8/16-bit |
| --- | --- | --- | --- | --- |
| Semantic | | | | |
| `--black` | #000000 | — | — | — |
| `--color-error` | var(--red) | — | — | — |
| `--color-primary` | var(--blue) | — | — | — |
| `--color-success` | var(--green) | — | — | — |
| `--color-warning` | var(--orange) | — | — | — |
| `--white` | #FFFFFF | — | — | — |
| Grayscale | | | | |
| `--gray-10` | #111111 | — | — | — |
| `--gray-15` | #222222 | — | — | — |
| `--gray-20` | #333333 | — | — | — |
| `--gray-25` | #444444 | — | — | — |
| `--gray-30` | #555555 | — | — | — |
| `--gray-35` | #666666 | — | — | — |
| `--gray-40` | #777777 | — | — | — |
| `--gray-45` | #888888 | — | — | — |
| `--gray-50` | #999999 | — | — | — |
| `--gray-55` | #AAAAAA | — | — | — |
| `--gray-60` | #BBBBBB | — | — | — |
| `--gray-65` | #CCCCCC | — | — | — |
| `--gray-70` | #DDDDDD | — | — | — |
| `--gray-75` | #EEEEEE | — | — | — |
| Legacy Grayscale | | | | |
| `--gray-1` | #111111 | — | — | — |
| `--gray-2` | #333333 | — | — | — |
| `--gray-3` | #555555 | — | — | — |
| `--gray-4` | #777777 | — | — | — |
| `--gray-5` | #999999 | — | — | — |
| `--gray-6` | #BBBBBB | — | — | — |
| `--gray-7` | #DDDDDD | — | — | — |

Previous

[Text Alignment Control text alignment with responsive breakpoint, orientation, and bit-depth variants](/framework/docs/3.1/text_alignment)

Next

[Text Stroke Legible text when displayed on shaded backgrounds](/framework/docs/3.1/text_stroke)
