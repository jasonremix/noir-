# Critique log

## Round 1
| hook | read | motion | variety | brand | sync | min |
|  6   |  6   |   7    |    8    |   8   |  -   |  6  |

Worst three (most damaging first):
1. [b0-4, b10, b33-34, all formats] Credits, "×", NEUE SINGLE and the CTA small line are too small on
   the phone pages -> the release info is the point of the teaser -> credits 72/46/60 px, NEUE SINGLE
   52-54 px, CTA split into two lines at 44 px (9x16).
2. [b15-16, all] Bloom + halation build before the drop wash the close-up out to milky grey, so the drop
   has nothing to break -> dip the exposure 42 % over b13-16 (anticipation), flash only from b16, 0.62.
3. [b24-27 9x16/16x9] Title over bright sky in the beat cuts loses contrast; cover brackets pop at b32.2
   -> darkroom burn (soft ellipse) under the title from b16; crossfade the real cover (brackets and all)
   over b31.4-32.2 instead of separate mattes.

Checks failed: readability on phone pages.
Verdict: ANOTHER ROUND

## Round 2
| hook | read | motion | variety | brand | sync | min |
|  7   |  7   |   8    |    8    |   9   |  9   |  7  |

sync.py: 15/17 hits within 20 ms (b2 +22 ms, b4 -23 ms sit in the vocal break with soft onsets),
median 4.9 ms. Mix -14.1 LUFS / -3.6 dBTP.
Fixed since round 1: the drop frame (b16) was still the close-up under a flash; it is now a hard cut to a
tighter two-shot that springs back, light bursting between the heads.

Worst three:
1. [b0-10, b33-35, 1x1 + 16x9] Credits/NEUE SINGLE/CTA still small on the 1x1 and 16x9 phone pages ->
   16x9 credits 60 px, NEUE SINGLE 46-50 px, CTA two lines everywhere (1x1 card 690 px to make room),
   16x9 CTA 112/40 px.
2. [b2, all] "×" is a hairline at credit size, invisible on phones -> draw it at 1.45-1.5x.
3. [b4-8, all] After the last credit the hook holds one slow move for 1.3 s -> spring punch-in (7 %) on
   b6 with a soft thud.

Checks failed: none hard; readability borderline on 1x1/16x9.
Verdict: ANOTHER ROUND

## Round 3
| hook | read | motion | variety | brand | sync | min |
|  8   |  8   |   8    |    8    |   9   |  9   |  8  |

Evidence: b0 frame is already the backlit hair with WELLLO rising; credits on b0/2/4, punch-in b6, whip b8
(both figures on screen in the strip); b16 drop frame = light bursting between the heads, title per
syllable b16-18; beat cuts b24-27; cover handover b28-32 with the real lettering; CTA readable on every
phone page (9x16 two lines at 44/34 px, 16x9 column fitted to 690 px). sync.py 15/17 within 20 ms,
median 4.9 ms; mix -14.1 LUFS.
Fixed since round 2: 16x9 credits stacked left (no longer collide with the front head), "×" at 2x,
1x1 card 690 px with a two-line CTA, version B's 16x9 "JETZT ÜBERALL" overflowed the frame -> fitted.

Remaining (not blocking):
1. [b16-24, 9x16] the two-shot leaves the lower 30 % as black jackets; a slightly tighter frame
   (z 1.15) would give the faces more size at the cost of sky.
2. [b29-31, all] the card settles within ~1 beat; a softer spring (stiffness 90) would let the
   shrink read as a move rather than a cut.
3. [b2/b4] two credit hits sit 22-23 ms from the nearest onset (soft vocal break), inaudible.

Checks failed: none.
Verdict: READY
