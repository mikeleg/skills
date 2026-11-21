---
name: mikeleg-brand
description: >-
  Complete brand system for mikeleg (Michele Gatti), visual and written. Use for any task involving mikeleg's brand: HTML/CSS/React with brand colors and fonts, presentations or documents with brand styling, logo use, and text in mikeleg's voice (LinkedIn posts, blog articles, emails, bios, README files, social copy). Also trigger when asked to "use my brand", "use my colors", "match my style", "humanize", "fix the tone", "make it sound like me", "rewrite in my voice", or "make it less AI". The writing voice lives in the brand-voice skill next to this one.
---

# mikeleg Brand System

Complete brand identity for **mikeleg** (Michele Gatti), senior full stack developer. Covers visual identity, writing voice, and AI-pattern removal.

## Table of contents

| Section | What it covers | When to read |
|---|---|---|
| **Quick reference** (below) | Essential values at a glance | Always — start here |
| [`references/visual-identity.md`] | Design principles, logo, colors, contrast data, typography, tagline | Building any visual artifact (HTML, slides, docs, posters) |
| [`${CLAUDE_SKILL_DIR}/../brand-voice/references/voice-tone.md`] | Voice principles, tone by context, language and formatting rules | Writing any text in mikeleg's voice |
| [`${CLAUDE_SKILL_DIR}/../brand-voice/references/humanizer.md`] | Banned words, structural anti-patterns, final-pass checklist, signature elements | Reviewing or rewriting text to remove AI tells |

Read only the reference file(s) you need, most tasks require one or two. For short texts the rules in `${CLAUDE_SKILL_DIR}/../brand-voice/SKILL.md` are enough; the writing voice is maintained there only, so edit it there.

---

## Quick reference

```
BRAND:      > mikeleg — always one more thing to learn
LOOK:       light-first, desaturated steel blue, calm and professional
PRIMARY:    #3f6fa8 (steel blue)    BG: #f3f7fc (light) / #1f2d3d (dark)
CHEVRON:    #1f93a8 on light, #8fd6e0 on dark and brand backgrounds
TEXT:       #1f2d3d on light, #f8fafc on dark, #5b6b7d secondary
LINKS:      Primary on light, Bright only on Ink, Sky on Navy cards
FONTS:      IBM Plex Mono (logo), Plus Jakarta Sans (body), Outfit (headings)
VOICE:      direct, curious, warm, opinionated-with-humility
LANGUAGE:   EN (tech), IT (community/personal)
FORMATTING: minimal bold, no emoji walls, sentence case headers
KILL LIST:  delve, crucial, landscape, tapestry, vibrant, nestled,
            groundbreaking, seamless, additionally, foster, garner,
            underscore, showcase, embark, "it's worth noting"
MAX:        1 em dash, 1 exclamation mark, 2 emoji (casual only)
MUST HAVE:  concrete detail, genuine question, first person
MUST NOT:   preambles, rule-of-three, significance inflation,
            chatbot artifacts, generic conclusions, synonym cycling
```

Visual defaults: light background, white cards with a 1px `#dde8f5` border, no shadows, no gradients, the cyan chevron as the only saturated element. The old palette (`#0a1628`, `#2563eb`, `#06b6d4`) is deprecated: migrate it if you meet it in existing files.

---

## CSS variables (copy-paste ready)

```css
:root {
  --blue-900: #1f2d3d;
  --blue-800: #273649;
  --blue-700: #314660;
  --blue-600: #3f5c82;
  --blue-500: #3f6fa8;
  --blue-400: #6b94c8;
  --blue-300: #94b4dc;
  --blue-200: #bcd1ea;
  --blue-100: #dde8f5;
  --blue-050: #f3f7fc;
  --cyan: #1f93a8;
  --cyan-soft: #8fd6e0;
  --indigo: #6f77bd;
  --warm: #d9a441;
  --paper: #f8fafc;
  --ink: #1f2d3d;
  --grey: #5b6b7d;
  --font-mono: 'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace;
  --font-body: 'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif;
  --font-heading: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-code: 'JetBrains Mono', 'IBM Plex Mono', monospace;
}
```

Variable names are unchanged from the previous palette, so existing code that references them picks up the new values automatically.

## Google Fonts import

```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Outfit:wght@200;300;400;600;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

## Tailwind mapping

Tailwind's built-in `blue` scale is far more saturated than this palette, so mapping to `blue-600` would bring back the old look. Define the brand colors explicitly:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        50: '#f3f7fc', 100: '#dde8f5', 200: '#bcd1ea', 300: '#94b4dc',
        400: '#6b94c8', 500: '#3f6fa8', 600: '#3f5c82', 700: '#314660',
        800: '#273649', 900: '#1f2d3d',
      },
      cyan: { DEFAULT: '#1f93a8', soft: '#8fd6e0' },
      ink: '#1f2d3d',
      paper: '#f8fafc',
      grey: '#5b6b7d',
    },
  },
}
```

Usage: page `bg-brand-50`, card `bg-white border border-brand-100`, text `text-ink`, secondary `text-grey`, primary button `bg-brand-500 text-white hover:bg-brand-600`, dark surface `bg-brand-900 text-paper`.
