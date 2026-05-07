# Border

The Border system creates the illusion of grayscale borders through carefully designed dither patterns. When rendered on 1-bit displays, these patterns create varying border intensities using alternating black and white pixels.

### Usage

Apply borders using `border--h-{n}` for horizontal borders
 and `border--v-{n}` for vertical borders,
 where n ranges from 1 (black) to 7 (white), with dithered values in between.

#### Horizontal Borders

1

2

3

4

5

6

7

1

2

3

4

5

6

7

Horizontal Borders

**Dark Mode Notice:** The color palette appears inverted because TRMNL's dark mode inverts the entire screen, except the images.

    <div class="border--h-1">Horizontal Border 1</div>
    <div class="border--h-2">Horizontal Border 2</div>
    <div class="border--h-3">Horizontal Border 3</div>
    <div class="border--h-4">Horizontal Border 4</div>
    <div class="border--h-5">Horizontal Border 5</div>
    <div class="border--h-6">Horizontal Border 6</div>
    <div class="border--h-7">Horizontal Border 7</div>

#### Vertical Borders

1

2

3

4

5

6

7

1

2

3

4

5

6

7

Vertical Borders

    <div class="border--v-1">Vertical Border 1</div>
    <div class="border--v-2">Vertical Border 2</div>
    <div class="border--v-3">Vertical Border 3</div>
    <div class="border--v-4">Vertical Border 4</div>
    <div class="border--v-5">Vertical Border 5</div>
    <div class="border--v-6">Vertical Border 6</div>
    <div class="border--v-7">Vertical Border 7</div>

### Backward Compatibility

The Border utility in Framework v2 is **not backward compatible** with the legacy v1 Border utility. This is the only non-backward compatible utility in the new framework.

#### What changed?

- The visual scale has been redefined to a full-spectrum grayscale that works on *any* background shade: `1` = black … `7` = white.
- In v1, borders only produced a faux grayscale on white surfaces and appeared solid black (invisible) on black surfaces. In v2, borders render consistently on both light and dark backgrounds.
- Class names remain the same (`border--h-{n}`, `border--v-{n}`), but the visual output for a given `{n}` looks different.

#### How to upgrade existing plugins

- Keep your markup unchanged. Continue using `border--h-{n}` and `border--v-{n}`.
- Re-evaluate the chosen `{n}` values based on the new scale.

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

[Background Apply color tokens as backgrounds with bg--{token}](/framework/docs/3.1/background)

Next

[Rounded Control element rounding with predefined values](/framework/docs/3.1/rounded)
