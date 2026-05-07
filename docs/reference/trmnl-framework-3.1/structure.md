# Structure

The framework structure is a fixed hierarchy that defines the display environment. Screen, View, Layout, Title Bar, Columns, and Mashup each have a specific role. Plugins render their content inside Views. Follow the exact div setup; deviating causes layout and rendering issues.

You don't specify Screen, Mashup, or View - the platform provides them automatically. You only specify the Layout and optionally a Title Bar.

You provide the full hierarchy yourself: Screen, View, Layout, and optionally a Mashup container and a Title Bar.

    <!-- plugin's view markup -->
    <div class="layout">...</div>
    <div class="title_bar">...</div>
    <!-- /plugin's view markup -->

    <div class="screen">
      <div class="view view--full">
        <div class="layout">...</div>
        <div class="title_bar">...</div>
      </div>
    </div>

### The Exact Structure

The framework uses a fixed div hierarchy. Each level has a specific role. The canonical structure is:

**Screen** → (**Mashup** →) **View** → **Layout** (+ optional **Title Bar**)

[Screen](/framework/docs/3.1/screen)--portrait --no-bleed --dark-mode --og --v2 --backdrop

[Mashup](/framework/docs/3.1/mashup)--1Lx1R --1Tx1B --2x2 --1Lx2R --2Lx1R --2Tx1B --1Tx2B

[View](/framework/docs/3.1/view)--full --half_vertical --half_horizontal --quadrant

[Layout](/framework/docs/3.1/layout)--row --col

--left --center-x --right --top --center-y --bottom --center

--stretch --stretch-x --stretch-y

[Title Bar](/framework/docs/3.1/title_bar)

### Component Roles

Each foundation component has a specific role. Use them as intended.

#### Screen

Root container. Defines viewport dimensions, padding, and CSS variables that cascade throughout.

Go to[Screen](/framework/docs/3.1/screen)

#### View

Container for a plugin slot. Size modifiers (`view--full`, `view--half_horizontal`, `view--half_vertical`, `view--quadrant`) set how much space the plugin gets. Non-full views must be nested inside a Mashup.

Go to[View](/framework/docs/3.1/view)

#### Layout

Exactly one per View. The content container. Its direct children are typically Columns, Grid, or Flex. Use `layout--row`, `layout--col`, and alignment modifiers to arrange those children. See the Layout page's "What Goes Inside Layout" section for when to use each.

Go to[Layout](/framework/docs/3.1/layout)

#### Title Bar

Optional. Sibling to Layout within a View. Displays icon, title, and instance label.

Go to[Title Bar](/framework/docs/3.1/title_bar)

#### Columns

Use *inside* Layout for column-based content organization.

Go to[Columns](/framework/docs/3.1/columns)

#### Mashup

Wraps multiple Views and arranges them within the Screen (1Lx1R, 1Tx1B, 2x2, etc.).

Go to[Mashup](/framework/docs/3.1/mashup)

#### Single View

For a single plugin occupying the full screen:

Layout

PluginInstance

    <div class="screen">
      <div class="view view--full">
        <div class="layout">
          <!-- Your content here -->
        </div>
        <div class="title_bar">...</div>
      </div>
    </div>

#### Mashup (Multiple Views)

For multiple plugins on one screen, wrap views in a[Mashup](/framework/docs/3.1/mashup) . Each view has exactly one [Layout](/framework/docs/3.1/layout) .

Plugin A

Plugin B

    <div class="screen">
      <div class="mashup mashup--1Lx1R">
        <div class="view view--half_vertical">
          <div class="layout">...</div>
        </div>
        <div class="view view--half_vertical">
          <div class="layout">...</div>
        </div>
      </div>
    </div>

Previous

[Framework Runtime How the runtime applies layout, clamping, overflow, and presentation adjustments at render time](/framework/docs/3.1/framework_runtime)

Next

[Screen Device screen dimensions, orientation, and display properties](/framework/docs/3.1/screen)
