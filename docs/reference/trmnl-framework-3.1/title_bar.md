# Title Bar

The Title Bar component provides a consistent header for terminal-like interfaces, displaying application information such as icons, titles, and instance details.

Place Title Bar as a sibling of Layout inside a View. Both `layout` and `title_bar` should be direct children of the view.

Don't nest Title Bar inside Layout. `title_bar` and `layout` must be siblings, not parent and child.

    <!-- view view--full (platform-provided) -->
    <div class="layout">...</div>
    <div class="title_bar">...</div>
    <!-- /view -->

    <!-- view view--full (platform-provided) -->
    <div class="layout">
      <div class="title_bar">...</div>
    </div>
    <!-- /view -->

### Base Structure

The Title Bar[Title Bar](/framework/docs/3.1/title_bar) consists of three main elements: an icon [Image](/framework/docs/3.1/image) , a title [Title](/framework/docs/3.1/title) , and an optional instance label [Label](/framework/docs/3.1/label) . These elements are arranged horizontally and automatically spaced.

#### Basic Title Bar

The basic Title Bar includes an icon and title. Use the `title_bar` class [Title Bar](/framework/docs/3.1/title_bar) for the container.

Basic Title Bar

    <div class="title_bar">
      <img class="image" src="/images/plugins/trmnl--render.svg">
      <span class="title">Basic Title Bar</span>
    </div>

#### Title Bar with Instance

Add an instance label using the `instance` class
 to display additional context.

Title Bar with InstanceProduction

    <div class="title_bar">
      <img class="image" src="/images/plugins/trmnl--render.svg">
      <span class="title">Title Bar with Instance</span>
      <span class="instance">Production</span>
    </div>

### Title Bar in Mashups

When the Title Bar is placed inside a[Mashup](/framework/docs/3.1/mashup) , it automatically receives different styling. Inside a view with a mashup layout (`view--half_vertical`, `view--half_horizontal`, or `view--quadrant`), the title bar uses a reduced height, a smaller icon, and no top or side border radius, with rounded bottom corners only so it aligns with the view's bordered outline.

#### Example

The same `title_bar` markup is used; the framework applies the compact styling automatically when the title bar is inside a mashup view.

Plugin A

Calendar

Plugin B

RSS

    <div class="mashup mashup--1Lx1R">
      <div class="view view--half_vertical">
        <div class="layout">
          <span class="label">Plugin A</span>
        </div>
        <div class="title_bar">
          <img class="image" src="/images/plugins/trmnl--render.svg">
          <span class="title">Calendar</span>
        </div>
      </div>
      <div class="view view--half_vertical">
        <div class="layout">
          <span class="label">Plugin B</span>
        </div>
        <div class="title_bar">
          <img class="image" src="/images/plugins/trmnl--render.svg">
          <span class="title">RSS</span>
        </div>
      </div>
    </div>

### Related Tokens

These tokens are automatically mapped to this page by token prefix.

| Token | 1-bit | 2-bit | Density 2x | 4/8/16-bit |
| --- | --- | --- | --- | --- |
| Base | | | | |
| `--title-bar-font-family` | "NicoClean" | "NicoClean" | "Inter Variable", Inter | — |
| `--title-bar-font-size` | 16px | 16px | calc(16px * var(--ui-scale)) | — |
| `--title-bar-font-smoothing` | none | none | auto | — |
| `--title-bar-font-weight` | 400 | 400 | 700 | — |
| `--title-bar-height` | 40px | 40px | — | calc(40px * var(--ui-scale)) |
| `--title-bar-image-height` | 28px | 28px | — | calc(28px * var(--ui-scale)) |
| `--title-bar-line-height` | 1 | 1 | calc(22px * var(--ui-scale)) | — |
| `--title-bar-padding-top` | 5px | 5px | 0px | 0px |
| `--title-bar-text-stroke-width` | 3.5px | 3.5px | 2px | 2px |
| Small | | | | |
| `--title-bar-small-font-size` | 16px | 16px | calc(16px * var(--ui-scale)) | — |
| `--title-bar-small-height` | 32px | 32px | — | calc(32px * var(--ui-scale)) |
| `--title-bar-small-image-height` | 24px | 24px | — | calc(24px * var(--ui-scale)) |

Previous

[Layout Primary container for organizing plugin content](/framework/docs/3.1/layout)

Next

[Columns Implement zero-config column layouts for content organization](/framework/docs/3.1/columns)
