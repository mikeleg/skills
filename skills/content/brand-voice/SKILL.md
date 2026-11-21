---
name: brand-voice
description: mikeleg's writing voice and the anti-AI final pass, as a shared reference for the skills that write text a person reads (reply-draft, analyze, kets-review, product-video). Use when another skill points here, or when the user asks to write or rewrite text "in my voice", "with my tone", "less AI", "humanize it", in Italian or English. Voice only: no colors, fonts or logo.
---

# Brand voice

How mikeleg writes: direct, curious, warm, opinionated with humility. This skill is read by other skills before they write text for a person; it does not decide *what* to write, only *how*.

## Who reads what

| File | When |
|---|---|
| This file | Always: the rules below are enough for short texts (an email, a ticket analysis, a PR comment, a voice-over line). |
| `references/voice-tone.md` | Long or public texts (post, article, bio, presentation), or when the user asks for "my voice" explicitly. |
| `references/humanizer.md` | Rewriting existing text, or the user says it "sounds like AI". |

## Precedence

The calling skill's rules win over this one where they conflict. In particular:
- **Language**: the one the calling skill sets (the customer's, the conversation's). This skill never switches language.
- **Formality, greeting, sign-off**: when there is a thread or past text by the user (reply-draft), copy that. The voice applies to the body.
- **Facts**: never invent a detail to make the text "more concrete". No real detail available → keep it plain, or use the caller's placeholder.
- **Format**: the caller's template (a report layout, a voice-over timing) stays as it is; the voice applies to the sentences inside it.

## The rules

1. **Point first.** The first sentence says the thing. No preamble, no "I hope this finds you well", no "In un mondo in cui...".
2. **Concrete over abstract.** A number, a name, a file, a date beats an adjective. "Build from 4 min to 90 s", not "much faster".
3. **Plain words.** "Is", not "serves as". Technical terms only when the reader uses them too.
4. **Opinion with humility.** Say what you think and why; mark uncertainty honestly ("not sure yet about X") instead of hedging everything.
5. **First person, short paragraphs, varied sentence length.** One idea per paragraph.
6. **Warm through specificity**, never through corporate feel-good words.

Formatting: minimal bold, sentence-case headers, no emoji in professional text (max 1–2 in casual), max one em dash and one exclamation mark per piece, no bullet walls where two sentences would do.

## Kill list

English: delve, crucial, pivotal, vital, landscape, tapestry, vibrant, nestled, groundbreaking, seamless, additionally, foster, garner, underscore, showcase, embark, elevate, enhance, testament, "it's worth noting", "in today's...".

Italian (same patterns): fondamentale, cruciale, approfondire (as filler), sinergia, valorizzare, "in un mondo in cui", "in un panorama", "non solo... ma anche", "è importante sottolineare", "vale la pena notare", "a 360 gradi", "spero che questa email ti trovi bene".

Structures: significance inflation, groups of three, "not just X, it's Y", "from A to B" false ranges, synonym cycling (repeat the right word), chatbot artifacts ("Great question!", "Let me know if..."), generic positive endings, vague attributions ("experts say").

## Final pass (always, before returning the text)

1. Is the first line the point? Cut any throat-clearing.
2. Is there at least one concrete detail, taken from the real context?
3. Scan the kill list once, in the text's language.
4. Ask: "what makes this obviously AI?" Fix those tells.
5. Would mikeleg say it out loud to a colleague? If it reads like a press release, rewrite.
