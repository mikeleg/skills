# Visual Identity

## Design principles

The palette is **light-first, desaturated and low-contrast at the edges**. The goal is calm and professional: a reader should feel at ease, not stimulated. Four rules follow from that, and they apply to every visual artifact (HTML, slides, docs, posters):

1. **Light surfaces by default.** Pages and documents start from Cloud (`#f3f7fc`) or white. Dark mode exists, but it is the variant, not the baseline. Heavy dark fields were the main source of the "pesante" feeling in the previous palette.
2. **One saturated moment per view.** The cyan chevron is the only element allowed to stand out. Everything else stays in muted steel blues and slate neutrals. If two things compete for attention, the page stops feeling calm.
3. **Borders and tints, not shadows or gradients.** Separate areas with a 1px Mist (`#dde8f5`) border or a Cloud tint. Shadows add visual weight; gradients add noise.
4. **No pure black, no pure white text on light.** Body text is Ink (`#1f2d3d`), which reads softer than `#000` and still clears 13:1 contrast.

---

## Logo

**Concept:** Terminal prompt
**Tagline:** always one more thing to learn
**Font:** IBM Plex Mono (Bold for name, Light for tagline)
**Distinctive mark:** the chevron `>` in the cyan family

### Logo structure

```
~ $                             ← prompt (optional)
> mikeleg█                      ← chevron (cyan) + name (bold) + cursor (optional)
always one more thing to learn  ← tagline (optional)
```

### Logo variants

| Variant | Use | Background | Chevron | Name |
|---|---|---|---|---|
| Full (light) — **default** | Documents, email, print, sites, slides | `#f3f7fc` | `#1f93a8` | `#1f2d3d` |
| Full (dark) | Dark sites, terminals, GitHub dark | `#1f2d3d` | `#8fd6e0` | `#f8fafc` |
| Full (brand) | Social header, hero, banner | `#3f6fa8` | `#8fd6e0` | `#ffffff` |
| Transparent | Overlay on any background | Transparent | pick by the background underneath | pick by the background underneath |
| Compact | Small spaces, navbar, sidebar | No tagline, no prompt | — | — |
| Inline | Signatures, watermark | Just `>mikeleg` | — | — |
| Favicon | Avatar, app icon, notifications | `#3f6fa8` square with `>m` | white | white |

The blinking cursor block takes Primary (`#3f6fa8`) on light, Bright (`#6b94c8`) on dark and white on brand. It is the only other colored part of the logo besides the chevron.

### Logo rules

The logo is a terminal prompt: every element reinforces the "developer who learns in public" identity. Breaking these rules breaks recognition across social, docs, slides and code.

**Do:**
- Keep the chevron `>` in the cyan family. Use `#1f93a8` on light backgrounds and `#8fd6e0` on dark and brand backgrounds. The two tones are the same hue at different lightness, chosen so the chevron keeps at least 3:1 contrast on its background (3.4:1 on light, 8.6:1 on dark, 3.2:1 on brand). A single cyan cannot do that on all three.
- Use IBM Plex Mono for all logo text. The monospace anchors the terminal concept; a sans-serif would lose the developer identity.
- Blinking cursor is optional but preferred in digital versions. It signals "active, working, typing", which mirrors the tagline.
- Tagline can be omitted in compact/inline versions. The `~ $` prompt can be omitted in compact versions.

**Don't:**
- Change the font. It breaks the terminal concept.
- Remove the chevron. It is the only element that survives at any size.
- Recolor the chevron outside the cyan family. It is the single saturated mark in the system.
- Add shadows, gradients or 3D effects. They clash with the flat terminal aesthetic and add the visual weight this palette is trying to remove.
- Distort or rotate. The logo reads as text.
- Place the chevron on a mid-tone background where it drops under 3:1 (for example `#1f93a8` on the brand blue is 1.4:1: use `#8fd6e0` there).

### Favicon / Avatar

Square format, brand blue background (`#3f6fa8`), white `>m` mark.
Use as: website favicon, GitHub/LinkedIn avatar, app icon, notification icon.

---

## Colors

### Primary palette (steel blue)

Blues are desaturated on purpose. Saturated blue (the old `#2563eb`) vibrates against white and reads as "tech product"; steel blue reads as "trusted advisor".

```
Ink       #1f2d3d   Dark background, body text on light          (--blue-900)
Deep      #273649   Secondary dark background                    (--blue-800)
Navy      #314660   Cards, elevated elements on dark             (--blue-700)
Royal     #3f5c82   Borders on dark, hover on primary            (--blue-600)
PRIMARY   #3f6fa8   Brand primary: buttons, links on light ★     (--blue-500)
Bright    #6b94c8   Links directly on Ink, input borders, cursor (--blue-400)
Sky       #94b4dc   Secondary text on dark                       (--blue-300)
Light     #bcd1ea   Light accents, disabled states               (--blue-200)
Mist      #dde8f5   Borders and dividers on light                (--blue-100)
Cloud     #f3f7fc   Default page background ★                    (--blue-050)
```

### Accent colors

```
Cyan       #1f93a8   Chevron on light backgrounds ★
Cyan soft  #8fd6e0   Chevron on dark and brand backgrounds ★
Indigo     #6f77bd   Creativity, depth (rare, decorative)
Warm       #d9a441   Community, warmth (rare, decorative only)
```

Warm and Indigo are for small decorative touches such as a badge dot or an illustration detail. Warm on a light background is only 2.1:1, so it never carries text.

### Text colors

```
On light   #1f2d3d   (ink)     13.0:1 on Cloud
On dark    #f8fafc   (paper)   13.4:1 on Ink
Secondary  #5b6b7d   (grey)     5.1:1 on Cloud, 5.5:1 on white
```

### Contrast reference (WCAG, measured)

| Pair | Ratio | Passes |
|---|---|---|
| Ink on Cloud (body text) | 13.0 | AAA |
| Paper on Ink (body text, dark) | 13.4 | AAA |
| Grey on Cloud (secondary text) | 5.1 | AA |
| Primary on Cloud (links on light) | 4.8 | AA |
| White on Primary (buttons) | 5.2 | AA |
| Sky on Ink (secondary text, dark) | 6.5 | AA |
| Bright on Ink (links on dark) | 4.5 | AA |
| Paper on Navy (titles on dark cards) | 9.2 | AAA |
| Light on Navy (body on dark cards) | 6.2 | AA |
| Sky on Navy (links on dark cards) | 4.5 | AA |
| Bright on Navy | 3.1 | fails for text, never use |
| Navy on Mist (filled tags) | 7.8 | AAA |
| Grey on white (outline tags) | 5.5 | AA |
| White on Royal (button hover) | 6.9 | AA |
| Bright on white (input border) | 3.1 | UI boundary |
| Cyan on Cloud (chevron) | 3.4 | graphics, large text |
| Cyan soft on Ink (chevron) | 8.6 | AAA |

Links on light backgrounds use Primary (`#3f6fa8`), not Bright, which is only 3:1 on Cloud. On dark, Bright works for links only directly on Ink. Dark cards sit on Navy, where Bright falls to 3.1:1, so links inside them use Sky with an underline.

Input borders use Bright. Mist (1.2:1) and Light (1.6:1) are too faint to mark the edge of a control; Bright is the lightest blue that clears the 3:1 minimum for UI boundaries.

### Applying the palette

- **Page / document background:** Cloud, or white for cards sitting on Cloud.
- **Cards:** white, 1px Mist border, no shadow.
- **Headings:** Ink. **Body:** Ink. **Meta and captions:** Grey.
- **Buttons:** Primary fill with white text, Royal on hover. Secondary buttons: white fill, Mist border, Primary text. Minimum height 48px, radius 8px.
- **Tags:** filled = Mist background with Navy text; outline = white with a Light border and Grey text. JetBrains Mono 12px, uppercase, letter-spaced.
- **Inputs:** white fill, 1px Bright border, 8px radius, 48px high, a visible label above.
- **Dark variant:** Ink background, Navy cards with a 1px Royal border, Paper titles, Light body text, Sky links underlined, Sky for secondary text on Ink. Primary buttons keep white text.
- **Footer band:** a single Ink band at the bottom of a light page is a good way to bring the dark logo in without making the whole page heavy.
- **Charts:** build from the blue scale (500, 400, 300, 200) plus Cyan for the one series that matters.

### Legacy values

The previous palette (`#0a1628`, `#2563eb`, `#3b82f6`, `#06b6d4`, `#f59e0b`, `#6366f1`, `#0f172a`, `#64748b`) is deprecated. When editing an existing file that still uses those values, migrate them to the equivalents above instead of mixing the two palettes.

---

## Typography

| Role | Font | Weight | Use |
|---|---|---|---|
| Logo / Code | IBM Plex Mono | Bold (700) | Logo name, code snippets |
| Tagline / Meta | IBM Plex Mono | Light (300) | Tagline, labels, metadata |
| Body | Plus Jakarta Sans | Light-Regular (300-400) | Body text, paragraphs |
| Headings | Outfit | ExtraLight-ExtraBold (200-800) | Titles, sections |
| Code UI | JetBrains Mono | Regular-Bold (400-700) | Technical labels, numbers, badges |

The four-font system separates concerns: IBM Plex Mono carries the brand identity (logo + code), Outfit creates visual hierarchy in headings, Plus Jakarta Sans is optimized for reading comfort in body text, and JetBrains Mono handles technical UI elements. Each font has a clear role. Mixing them outside their lane dilutes the hierarchy.

---

## Tagline

**always one more thing to learn**

- Always lowercase. It's a quiet philosophy, not a shout.
- Font: IBM Plex Mono Light.
- Color: `#5b6b7d` on light, `#94b4dc` on dark, `#dde8f5` on brand.
- Always English, even in Italian contexts. It's a signature, like a band name.
- No trailing period. It's an ongoing thought, not a finished sentence.
