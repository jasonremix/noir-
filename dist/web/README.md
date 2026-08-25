# NOIRÉ — Le Couloir

Production build. Upload the whole folder; `index.html` is the entry point.

```
index.html      markup, styles, scene and shaders in one file
assets/         campaign stills, wordmark and the social card
```

## Before it goes live

1. **Fill in `CFG`.** It sits at the top of the inline script and is the only
   place the page takes facts from. Anything left empty renders as a visible
   `[noch zu ergänzen]` instead of an invented claim. Set `draft: false` to
   drop the open-points badge once the ledger is empty.
2. **Set `CFG.site.canonical` and `CFG.site.ogImage`** to absolute URLs and
   re-add the `<link rel="canonical">` tag (the build drops it while no domain
   is configured).
3. **Self-host the two dependencies.** Google Fonts and cdnjs are loaded from
   third-party servers and receive every visitor's IP address. Copy
   `three.min.js`, `gsap.min.js`, `ScrollTrigger.min.js` and the two font
   families next to `index.html` and repoint the tags.
4. **Retailers.** A partner appears in the text and in the 3D room only with
   `confirmed: true` *and* a `logo` path. Logos go in their original colours on
   the light plate the stylesheet already provides — never recoloured white.
5. **Legal.** The four tabs are a scaffold of the points the law asks for, not
   legal copy. Have them written and reviewed.

## Prices

Regular 39,99 € online and in retail. The launch discount in
`CFG.product.launch` switches itself on and off by date — after `until`
the page returns to the regular price on its own, with no code change.

Two points belong on the checklist: a struck-through price needs a real
reference price (§ 11 PAngV), and retail prices may not be dictated
(§ 1 GWB) — hence RRP.

## What has not been checked

The page has never been rendered in a browser. Camera path, timing and frame
rate are set by calculation and need one tuning pass on real hardware.

Image payload: 101.0 KB across 11 files.
