---
name: product-video
description: Rules and recipes for creating or revising a product promo video in Remotion (voice-over, music, highlights on screenshots, CTA). Use when the user asks to create, edit, review or fix a product video / ad / demo video (e.g. "video di prodotto", "monta il video"), to add or change the voice or the music, or to fix voice-to-image synchronization. Born from the corrections requested on the SS9 Brand Studio and OrderMatch videos.
---

# Product video: rules from the reviews

Rules that emerged from the user's corrections. Apply them **from the first version**, do not wait for them to be asked again.

## Pace and structure
- **The most important things first.** Open on the real result and the main case; no slow "problem → reveal" intros. Indicative length 90–120 s, not 180.
- Each screen 3–4 s **plus ~1 s of breathing room after the end of the sentence**: switching screen as soon as the voice ends feels rushed (the user asked to slow down from 110 to 120 s). Highlights within 0.5 s. If a screen has to show several things in sequence, **lengthen it** (e.g. 6 s) by taking time from screens with little voice, keeping the total length constant.
- **No voice gap > ~5 s.** After every change check in `voiceover.json` the maximum gap between consecutive clips; fill with short, true sentences that describe what is on screen.

## Texts
- The client company's name is used **only as the product name** (e.g. "SS9 Brand Studio"). Elsewhere speak to the viewer: "il tuo logo", "il tuo brand", "i dati ufficiali del tuo brand" (your logo, your brand, your brand's official data) (the video is for whoever will adopt the product, not for whoever produces it).
- No invented claims: every sentence must be verifiable in the UI or in the sources; flag in the log those to be confirmed.
- **CTA: never the link to the app** if users cannot sign up on their own. Use "Richiedi una demo" ("Request a demo") + the site's contact page, after checking that the anchor exists (`curl` + grep; in SPAs look for the id in the JS bundle).

## Voice
- Classic TTS voices (standard Edge/Azure, Piper) are **too robotic** for the user. Default: **Gemini TTS** (`gemini-3.8-flash-tts` or newer, list the models with `GET v1beta/models`) with a voice chosen from samples (e.g. Achird, friendly male). Before choosing, generate 3–4 samples on the same text and have the user pick.
- "Claude's voice" is not available as an API: say so right away and propose alternatives.
- Gemini recipe (traps already paid for):
  - Key from `GEMINI_API_KEY`; on Windows after `setx` the current session does not see it: read it from the registry (`HKCU\Environment`). Never print it or write it to files.
  - The `inlineData` response is **already a complete WAV (RIFF)**: save it as is, do not add another header (it causes an initial click).
  - **The model reads the style instructions aloud**, especially on short texts but **even with the whole script** (OrderMatch: it read "Fai una pausa lunga… tra un paragrafo e l'altro. Testo." — "Take a long pause… between one paragraph and the next. Text." — before the first paragraph). So: **a single request with the whole script** (paragraphs separated by a blank line), then cut into clips; discard everything that precedes the first paragraph.
  - The free tier has **~10 TTS requests per day per model**: budget 1–3 calls per round; to fix a few sentences make a "patch" request with the previous sentence as context and keep every raw wav in cache.
  - **Cutting on pauses alone is not reliable**: "the N longest pauses" attaches short sentences; dynamic programming on the expected durations (~15 characters/s) **absorbs the style read aloud and shifts all the clips of a piece** (each clip contained the previous sentence, with durations all "plausible"), and pauses inside a paragraph can be as long as those between paragraphs. The right recipe: **transcribe the raw wav with timestamps** (Gemini text model, in short chunks) to find the real start of each paragraph, then cut in the middle of the pause that precedes it (`PARAGRAPH_STARTS` list in the script; the DP only as a fallback). Example: `OrderMatch_video/tools/audio/gen_voiceover.py`.
  - **Verify every clip by transcribing it BEFORE building timeline and highlights**: a duration consistent with the text proves nothing. Each clip must contain exactly its sentence, no style, no pieces of the neighbor. If the quota prevents it, tell the user which sentences are not verified and their timecodes.
  - Transcription with text Gemini: `gemini-2.5-flash` soon hits 429 → fall back to `gemini-2.5-flash-lite` (less precise: "listino" becomes "all'estino", recheck the doubts); put a `timeout` on every call (a 20 s wav blocked the request for 5 min); one call per clip, in sequence.
  - First pass with `MAX_ATEMPO = 1.0` and the block end far away: measure the real durations, then set the shots = ~0.3 s delay + voice + ≥1 s of breathing room and rerun the script on the cached wav (no TTS calls). Otherwise atempo speeds up the voice to make it fit slots that were badly estimated.
  - Pronunciation: in the TTS text write acronyms and foreign names as they are read ("pi di effe", "ci esse vu", product name split into words); subtitles use the normal text.
  - Start of words for the highlights: without a local speech recognizer, estimate from the RMS envelope (segment start = reliable, proportion of syllables inside a segment = estimated, error ~0.1–0.2 s). Tell the user which ones are estimated and the timecodes to listen to.
  - Limiter on the voice (e.g. `alimiter` ~-8 dBFS) if the mix clips; then adjust the master gain.
- **Cuts and pauses inside a clip**: cut only at the true minima of the envelope (RMS 5 ms), after the word has fully decayed. Voiceless plosives (the "c" of "pubblico") create a false silence in the middle of a word: check that after the cut point there is no other peak of the same word. Fade of ~10 ms at every join.
- Complete examples: `SS9_Brand_Studio_video/tools/audio/gen_voiceover.py` (single generation + split, `--patch`, `split_b2c`); `OrderMatch_video/tools/audio/gen_voiceover.py` (cut on transcribed paragraph starts, `PARAGRAPH_STARTS`) and `tools/audio/word_onsets.py` (word start estimation).

## Screenshots from the app (Claude in Chrome)
- Use the app **as an operator** on a complete demo case (enter, correct, approve, download), asking first for consent for login/OAuth and for actions that modify data; a case with real errors (e.g. a wrong match proposed by the app) conveys human control well.
- The extension's `screenshot` is reduced to 1568 px in JPEG: for sharp captures use `zoom` on a region with `save_to_disk` **without `scale`** (with `scale` the saved file is reduced too) → PNG at native CSS pixels. Crop the content column and exclude the bar with the user's name.
- Before every capture: move the mouse out of the area (hover in a corner), remove spellcheck from the textareas (`el.spellcheck=false`) and blur; capture toasts and dialogs right away, they disappear in a few seconds.
- A narrow capture (e.g. 930 px) must not be enlarged beyond ~1.1×: for hero scenes recapture it larger before assembling.
- PDFs produced by the app (in `shell:Downloads`, not always `~/Downloads`) are rendered to PNG with PyMuPDF at 200 dpi.

## Music and effects
- Royalty-free music for commercial use (e.g. Pixabay Content License); note the license, the "AI generated" label and the absence of a Content ID guarantee in `LICENZE.md`. Have the user choose the track.
- The music's drop/chorus falls on the start of the CTA. If the length changes, move the drop with the CTA: to lengthen **repeat whole bars of a stable section before the drop** (on the bar grid, equal-power crossfade ~0.25 s on the downbeat; pick the point with RMS/spectrum/chroma analysis per bar), never the crescendo leading to the drop. Keep a backup of the previous track. Example: `tools/audio/cut_pixabay.py`.
- Ducking: music ~-12 dB without voice, ~-20 dB under the voice. Master at -16 LUFS ±1, true peak ≤ -1 dBTP.
- Reusing an already cut track (e.g. Brand Studio's `music.wav`: 120.000 s, drop at 107.17 s): **do not re-cut it**, design the timeline around it (CTA at frame 3210, total 3600). First measure the drop position (RMS per second) and read the docstring of the cutting script: the README may still state the old length.

## Voice-to-image synchronization
- Each highlight enters ~0.2 s (≈7 frames) **before** the word that names it and stays ≥1 s. Measure word timings on the waveform, not by estimate.
- If the words of a list are too close together for readable highlights, lengthen the screen, split the sentence into two clips and add short pauses (~0.25 s) **in the true silences**.
- The "click" effects follow the highlights' entrance: retime them when you change the timings.

## Slowing down an already synchronized video
- First ask by how much (e.g. +10/+20/+35%), with the consequences: beyond ~+20% the voice gaps risk exceeding 5 s and new sentences are needed.
- The voice is not regenerated: frames are added **at the end of the shots** (pause after the sentence), so every highlight and camera `from` stays attached to the word. Lengthen only the duration, the last camera keyframe and the `to` of the last highlight.
- Distribute the frames according to each shot's "tail" (shot end − end of the last sentence): a lot to shots with a tail ~0, nothing to those that already have ≥3 s of silence or that precede a long voice gap.
- Blocks with several shots under **a single continuous sentence**: lengthen only the last shot, otherwise the following shots arrive late on the words.
- Prepare the table yourself (new durations, cumulative shift of each voice clip, click and chime recomputed as shot start + offset) and pass it to the subagent as data, not as rules to derive. Also update `STATIC_FROM`, the total-duration check, the "last 4 s" frame of the stills, the preview mix duration and the subtitles.

## Delivery and verification
- Every render is a new version (`out/<name>-vN.mp4`); do not overwrite the previous ones (the user renames and compares them).
- Before saying "done": ffprobe (exact duration, h264 + AAC 48 kHz), loudnorm, silencedetect, frames extracted at the modified points. State what cannot be verified without listening (pronunciation, naturalness of the pauses) and give the timecodes to listen to.
