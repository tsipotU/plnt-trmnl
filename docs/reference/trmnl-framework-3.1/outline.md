# Outline

The Outline utility provides pixel-perfect rounded borders using CSS border-image with a 9-slice composite image. On 1-bit displays, it renders crisp, dithered corner patterns that scale with the element. On 2-bit and 4-bit displays, it falls back to standard CSS borders with border-radius.

### Basic Usage

The outline utility applies a pixel-perfect dotted rounded border to any element. On 1-bit displays,
 it uses pure CSS gradients to place single-pixel dots at exact integer coordinates along
 a rounded rectangle path. On 2-bit and 4-bit displays, it falls back to a standard CSS border
 with border-radius.

#### Applying an Outline

Add the `outline` class to any element
 to give it a pixel-perfect rounded border.

With outline

Without outline

Outline UtilityDesign System

    <!-- Add outline to any element -->
    <div class="outline">
      Content with pixel-perfect rounded border
    </div>

### How It Works

The outline utility uses 20 CSS background layers to place each dot at an exact integer pixel
 coordinate. Edge dots use `repeating-linear-gradient` for a 1px dot every 4px. Corner dots use individual `linear-gradient` blocks sized to 1x1px
 and positioned with pixel-precise offsets.

#### CSS Gradient Dots

No images are used. Each dot is computed mathematically by the CSS engine,
 guaranteeing pixel-grid alignment at any element size. The border color comes from `--framework-border-strong`,
 so dark mode works automatically without separate assets.

    /* How the CSS works internally (simplified) */
    .outline::after {
        background:
            /* Edges: repeating 1px dot every 4px */
            repeating-linear-gradient(to right, black 0 1px, transparent 1px 4px)
                12px 0 / calc(100% - 24px) 1px no-repeat,
            /* ... 3 more edges ... */
            /* Corners: individual 1x1px dots */
            linear-gradient(black, black) 8px 0 / 1px 1px no-repeat,
            linear-gradient(black, black) 4px 1px / 1px 1px no-repeat,
            /* ... 14 more corner dots ... */
    }

### Bit-Depth Behavior

The outline utility adapts to different display bit-depths automatically. On 1-bit displays, it uses
 CSS gradient dots for pixel-perfect rendering. On 2-bit and 4-bit displays, it falls back to
 standard CSS borders with border-radius for smoother rendering.

#### 1-bit Displays

Uses pure CSS gradients to place sparse single-pixel dots at exact integer coordinates.
 Dark mode works automatically via `--framework-border-strong` which inverts to white.

#### 2-bit and 4-bit Displays

Falls back to a standard 1px solid border with 10px border-radius for smoother rendering
 that takes advantage of the additional grayscale capabilities.

    /* 1-bit: CSS gradient dots (via outline-dots mixin) */
    .outline::after {
        @include outline-dots;
    }

    /* 2-bit and 4-bit: Falls back to CSS border */
    .screen--2bit .outline::after,
    .screen--4bit .outline::after {
        background: none;
        border: 1px solid var(--framework-border-strong);
        border-radius: 10px;
    }

### Screen Backdrop Modifier

For mashup layouts, the `screen--backdrop` modifier provides an alternative appearance where views sit on a patterned background instead of
 having outlined borders.

#### Default vs Backdrop Mashups

By default, mashups use a white background with bordered views for a clean, separated look.
 The `screen--backdrop` modifier changes this to a patterned background (1-bit) or solid gray background (2-bit/4-bit)
 with plain white views on top.

Plugin A

Plugin B

    <!-- Default mashup (white background, bordered views) -->
    <div class="screen">
      <div class="mashup mashup--1Lx1R">
        <div class="view view--half_vertical">...</div>
        <div class="view view--half_vertical">...</div>
      </div>
    </div>

    <!-- Backdrop mashup (patterned background) -->
    <div class="screen screen--backdrop">
      <div class="mashup mashup--1Lx1R">
        <div class="view view--half_vertical">...</div>
        <div class="view view--half_vertical">...</div>
      </div>
    </div>

### Related Tokens

These tokens are automatically mapped to this page by token prefix.

| Token | 1-bit | 2-bit | Density 2x | 4/8/16-bit |
| --- | --- | --- | --- | --- |
| `--rounded-full` | 9999px | — | — | — |
| `--rounded-large` | 20px | — | — | — |
| `--rounded-medium` | 15px | — | — | — |
| `--rounded-none` | 0px | — | — | — |
| `--rounded-small` | 7px | — | — | — |
| `--rounded-xlarge` | 25px | — | — | — |
| `--rounded-xsmall` | 5px | — | — | — |
| `--rounded-xxlarge` | 30px | — | — | — |

Previous

[Rounded Control element rounding with predefined values](/framework/docs/3.1/rounded)

Next

[Image Optimize images using dithering techniques for 1-bit rendering](/framework/docs/3.1/image)
