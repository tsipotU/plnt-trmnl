# Value

The Value system provides consistent text styling for displaying numerical and textual values, with various size options and support for tabular numbers. It ensures readability and visual hierarchy across different contexts.

### Size Variants

The Value system offers twelve size variants, from XXSmall to Peta.

#### XXSmall

The `value--xxsmall` class creates the smallest text size.

Example48,206.62

ValueXXSmall

    <span class="value value--xxsmall">Example</span>
    <span class="value value--xxsmall value--tnums">48,206.62</span>

#### XSmall

The `value--xsmall` class provides a size slightly larger than XXSmall.

Example48,206.62

ValueXSmall

    <span class="value value--xsmall">Example</span>
    <span class="value value--xsmall value--tnums">48,206.62</span>

#### Small

The `value--small` class creates a smaller text size.

Example48,206.62

ValueSmall

    <span class="value value--small">Example</span>
    <span class="value value--small value--tnums">48,206.62</span>

#### Base

The base `value` class without size modifiers
 and the `value--base` class both produce the same visual result.
 See the [Responsive Values](#responsive-values) section for examples.

Example48,206.62

ValueBase

    <span class="value">Example</span>
    <span class="value value--tnums">48,206.62</span>

    <!-- Or using the base modifier -->
    <span class="value value--base">Example</span>
    <span class="value value--base value--tnums">48,206.62</span>

#### Large

The `value--large` class creates larger text.

Example48,206.62

ValueLarge

    <span class="value value--large">Example</span>
    <span class="value value--large value--tnums">48,206.62</span>

#### XLarge

The `value--xlarge` class provides larger text.

Example48,206.62

ValueXLarge

    <span class="value value--xlarge">Example</span>
    <span class="value value--xlarge value--tnums">48,206.62</span>

#### XXLarge

The `value--xxlarge` class creates very large text.

Example48,206.62

ValueXXLarge

    <span class="value value--xxlarge">Example</span>
    <span class="value value--xxlarge value--tnums">48,206.62</span>

#### XXXLarge

The `value--xxxlarge` class provides very large text.

Example48,206.62

ValueXXXLarge

    <span class="value value--xxxlarge">Example</span>
    <span class="value value--xxxlarge value--tnums">48,206.62</span>

#### Mega

The `value--mega` class creates extremely large text.

42

ValueMega

    <span class="value value--mega value--tnums">42</span>

#### Giga

The `value--giga` class provides massive text.

42

ValueGiga

    <span class="value value--giga value--tnums">42</span>

#### Tera

The `value--tera` class creates colossal text.

42

ValueTera

    <span class="value value--tera value--tnums">42</span>

#### Peta

The `value--peta` class provides the largest text.

42

ValuePeta

    <span class="value value--peta value--tnums">42</span>

### Numerical Display

The Value system includes special formatting options for numerical values.

#### Tabular Numbers

Add the `value--tnums` modifier to enable tabular numbers.

Regular: 48,206.62Tabular: 48,206.62

ValueTabular Numbers

    <span class="value value--large">Regular: 48,206.62</span>
    <span class="value value--large value--tnums">Tabular: 48,206.62</span>

### Responsive Values

The Value system supports responsive variants using breakpoint prefixes.

#### Breakpoint Prefixes

Use breakpoint prefixes like `sm:`, `md:`, `lg:` to apply different sizes at different screen widths.

Responsive Value1,234.56

ValueResponsive

    <!-- Small by default, large on md screens, xlarge on lg screens -->
    <span class="value value--small md:value--large lg:value--xlarge">
      Responsive Value
    </span>

    <!-- Progressive scaling with screen size -->
    <span class="value value--xsmall sm:value--small md:value--medium lg:value--large value--tnums">
      1,234.56
    </span>

    <!-- Using base modifier to reset to default size at breakpoint -->
    <span class="value value--small lg:value--base">
      Small by default, base on large screens
    </span>

#### Orientation and Size+Orientation

Value sizes can adapt to orientation with `portrait:` and can be combined
 with size breakpoints (e.g., `md:portrait:`).

Orientation Variant42,000.00

ValueOrientation

    <!-- Orientation only: smaller in portrait -->
    <span class="value value--large portrait:value--small">Orientation Variant</span>

    <!-- Size + orientation: xlarge only on md+ screens in portrait -->
    <span class="value value--small md:portrait:value--xlarge value--tnums">42,000.00</span>

### Related Tokens

These tokens are automatically mapped to this page by token prefix.

| Token | 1-bit | 2-bit | Density 2x | 4/8/16-bit |
| --- | --- | --- | --- | --- |
| Base | | | | |
| `--value-font-family` | "Inter Variable", Inter | — | "Inter Variable", Inter | — |
| `--value-font-size` | 38px | — | calc(38px * var(--ui-scale)) | — |
| `--value-font-smoothing` | auto | — | auto | — |
| `--value-font-weight` | 450 | — | 450 | — |
| `--value-line-height` | 42px | — | calc(42px * var(--ui-scale)) | — |
| Xxsmall | | | | |
| `--value-xxsmall-font-family` | "NicoClean" | "NicoClean" | "Inter Variable", Inter | — |
| `--value-xxsmall-font-size` | 16px | 16px | calc(16px * var(--ui-scale)) | — |
| `--value-xxsmall-font-smoothing` | none | none | auto | — |
| `--value-xxsmall-font-weight` | 400 | 400 | 700 | — |
| `--value-xxsmall-line-height` | 16px | 16px | calc(14px * var(--ui-scale)) | — |
| Xsmall | | | | |
| `--value-xsmall-font-size` | 20px | — | calc(20px * var(--ui-scale)) | — |
| `--value-xsmall-font-weight` | 600 | — | 600 | — |
| `--value-xsmall-line-height` | 24px | — | calc(24px * var(--ui-scale)) | — |
| Small | | | | |
| `--value-small-font-size` | 26px | — | calc(26px * var(--ui-scale)) | — |
| `--value-small-font-weight` | 500 | — | 475 | — |
| `--value-small-line-height` | 29px | — | calc(29px * var(--ui-scale)) | — |
| Large | | | | |
| `--value-large-font-size` | 58px | — | calc(58px * var(--ui-scale)) | — |
| `--value-large-font-weight` | 400 | — | 400 | — |
| `--value-large-line-height` | 70px | — | calc(70px * var(--ui-scale)) | — |
| Xlarge | | | | |
| `--value-xlarge-font-size` | 74px | — | calc(74px * var(--ui-scale)) | — |
| `--value-xlarge-font-weight` | 375 | — | 375 | — |
| `--value-xlarge-line-height` | 86px | — | calc(86px * var(--ui-scale)) | — |
| Xxlarge | | | | |
| `--value-xxlarge-font-size` | 96px | — | calc(96px * var(--ui-scale)) | — |
| `--value-xxlarge-font-weight` | 350 | — | 350 | — |
| `--value-xxlarge-line-height` | 108px | — | calc(108px * var(--ui-scale)) | — |
| Xxxlarge | | | | |
| `--value-xxxlarge-font-size` | 128px | — | calc(128px * var(--ui-scale)) | — |
| `--value-xxxlarge-font-weight` | 300 | — | 300 | — |
| `--value-xxxlarge-line-height` | 128px | — | calc(128px * var(--ui-scale)) | — |
| Mega | | | | |
| `--value-mega-font-size` | 170px | — | calc(170px * var(--ui-scale)) | — |
| `--value-mega-font-weight` | 275 | — | 275 | — |
| `--value-mega-line-height` | 180px | — | calc(180px * var(--ui-scale)) | — |
| Giga | | | | |
| `--value-giga-font-size` | 220px | — | calc(220px * var(--ui-scale)) | — |
| `--value-giga-font-weight` | 250 | — | 250 | — |
| `--value-giga-line-height` | 230px | — | calc(230px * var(--ui-scale)) | — |
| Tera | | | | |
| `--value-tera-font-size` | 290px | — | calc(290px * var(--ui-scale)) | — |
| `--value-tera-font-weight` | 225 | — | 225 | — |
| `--value-tera-line-height` | 300px | — | calc(300px * var(--ui-scale)) | — |
| Peta | | | | |
| `--value-peta-font-size` | 380px | — | calc(380px * var(--ui-scale)) | — |
| `--value-peta-font-weight` | 200 | — | 200 | — |
| `--value-peta-line-height` | 390px | — | calc(390px * var(--ui-scale)) | — |

Previous

[Title Style headings with consistent typography](/framework/docs/3.1/title)

Next

[Label Create clear labels for unified content identification](/framework/docs/3.1/label)
