# Description

The Description component provides a standardized way to display descriptive text content with consistent styling.

### Size Variants

Descriptions come in four size variants to suit different use cases. Each variant provides a distinct visual style
 that can be used for various content hierarchies.

Base

Large

XLarge

XXLarge

Description

Description

Description

Description

DescriptionSize Variants

    <!-- Base (default) -->
    <span class="description">Base Description</span>

    <!-- Large: larger text for emphasis -->
    <span class="description description--large">Large Description</span>

    <!-- Extra Large: prominent descriptions -->
    <span class="description description--xlarge">XLarge Description</span>

    <!-- Extra Extra Large: maximum emphasis -->
    <span class="description description--xxlarge">XXLarge Description</span>

    <!-- Using base modifier to reset to default size at breakpoint -->
    <span class="description description--large md:description--base">
      Large by default, base on medium+ screens
    </span>

### Text Overflow Behavior

Descriptions can handle longer text content through natural wrapping or text clamping. Understanding how descriptions behave with
 overflow content helps ensure your interface remains readable and visually balanced.

#### Multi-line Wrapping

By default, descriptions will wrap to multiple lines when content exceeds the available width,
 maintaining readability for longer text.

Base

Large

XLarge

XXLarge

This longer description will wrap to multiple lines when it exceeds the available width

This longer description will wrap to multiple lines when it exceeds the available width

This longer description will wrap to multiple lines when it exceeds the available width

This longer description will wrap to multiple lines when it exceeds the available width

DescriptionMulti-line

    <!-- Descriptions with longer text will wrap naturally -->
    <span class="description">This longer description will wrap to multiple lines when it exceeds the width</span>

#### Text Clamping

Use the framework's `data-clamp` attribute to limit descriptions to a specific number of lines with ellipsis overflow.

Base

Large

XLarge

XXLarge

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

This is a very long description text that would normally wrap to many lines but demonstrates how clamping behavior works with different variants and line limits to show ellipsis overflow

DescriptionClamped

    <!-- data-clamp applies to any description size (base, large, xlarge, xxlarge) -->

    <!-- Single line clamping with data attribute -->
    <span class="description" data-clamp="1">
      This text will be clamped to one line
    </span>

    <!-- Two line clamping -->
    <span class="description" data-clamp="2">
      This text will be clamped to exactly two lines with ellipsis
    </span>

    <!-- Three line clamping with large size -->
    <span class="description description--large" data-clamp="3">
      This larger text will be clamped to three lines
    </span>

### Responsive Features

Description components support all three responsive systems: size-based, orientation-based, and bit-depth variants.
 This enables precise control over description appearance across different device configurations.

#### Breakpoint Prefixes

Use breakpoint prefixes like `sm:`, `md:`, `lg:` to apply different sizes at different screen widths.

Responsive DescriptionBase by default, xlarge on lg screens

DescriptionResponsive

    <!-- Base by default, xlarge on lg screens -->
    <span class="description lg:description--xlarge">
      Responsive Description
    </span>

    <!-- Caption describing the responsive behavior (optional) -->
    <span class="label label--small">Base by default, xlarge on lg screens</span>

    <!-- Using base modifier to reset to default size at breakpoint -->
    <span class="description description--large md:description--base">
      Large by default, base on medium+ screens
    </span>

    <!-- Progressive size scaling -->
    <span class="description sm:description--large md:description--xlarge lg:description--xxlarge">
      Progressive Description Sizing
    </span>

#### Orientation and Size+Orientation

Description sizes can adapt to orientation with `portrait:` and can be combined
 with size breakpoints (e.g., `md:portrait:`).

Orientation VariantLarge by default, base in portrait.

DescriptionOrientation

    <!-- Large by default, base in portrait -->
    <span class="description description--large portrait:description--base">Orientation Variant</span>

    <!-- Caption describing the responsive behavior (optional) -->
    <span class="label label--small">Large by default, base in portrait.</span>

### Related Tokens

These tokens are automatically mapped to this page by token prefix.

| Token | 1-bit | 2-bit | Density 2x | 4/8/16-bit |
| --- | --- | --- | --- | --- |
| Base | | | | |
| `--description-font-family` | "NicoPups" | "NicoPups" | "Inter Variable", Inter | — |
| `--description-font-size` | 16px | 16px | calc(13px * var(--ui-scale)) | — |
| `--description-font-smoothing` | none | none | auto | — |
| `--description-font-weight` | 400 | 400 | 400 | — |
| `--description-line-height` | 1 | 1 | 1.2 | — |
| Large | | | | |
| `--description-large-font-family` | "NicoClean" | "NicoClean" | "Inter Variable", Inter | — |
| `--description-large-font-size` | 16px | 16px | calc(16px * var(--ui-scale)) | — |
| `--description-large-font-smoothing` | none | none | auto | — |
| `--description-large-font-weight` | 400 | 400 | 700 | — |
| `--description-large-line-height` | 1.25 | 1.25 | 1.2 | — |
| Xlarge | | | | |
| `--description-xlarge-font-family` | "Inter Variable", Inter | — | "Inter Variable", Inter | — |
| `--description-xlarge-font-size` | 21px | — | calc(21px * var(--ui-scale)) | — |
| `--description-xlarge-font-smoothing` | auto | — | auto | — |
| `--description-xlarge-font-weight` | 500 | — | 500 | — |
| `--description-xlarge-line-height` | 1.2 | — | 1.2 | — |
| Xxlarge | | | | |
| `--description-xxlarge-font-family` | "Inter Variable", Inter | — | "Inter Variable", Inter | — |
| `--description-xxlarge-font-size` | 24px | — | calc(24px * var(--ui-scale)) | — |
| `--description-xxlarge-font-smoothing` | auto | — | auto | — |
| `--description-xxlarge-font-weight` | 475 | — | 475 | — |
| `--description-xxlarge-line-height` | 1.2 | — | 1.2 | — |

Previous

[Label Create clear labels for unified content identification](/framework/docs/3.1/label)

Next

[Divider Create horizontal or vertical dividers between elements](/framework/docs/3.1/divider)
