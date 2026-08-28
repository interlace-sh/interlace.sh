# Fonts

Self-hosted so the first paint does not wait on a third origin. Previously these
came from `fonts.googleapis.com`, which cost a render-blocking stylesheet plus a
DNS lookup and TLS handshake to `fonts.gstatic.com` before the font file itself
could even be requested.

Both families are variable fonts: one file per unicode subset covers every
weight the design system uses, so there is no file-per-weight fan-out.

| File                            | Family         | Subset    | Weights |
| ------------------------------- | -------------- | --------- | ------- |
| `outfit-latin.woff2`            | Outfit         | latin     | 400–700 |
| `outfit-latin-ext.woff2`        | Outfit         | latin-ext | 400–700 |
| `jetbrains-mono-latin.woff2`    | JetBrains Mono | latin     | 400–500 |
| `jetbrains-mono-latin-ext.woff2`| JetBrains Mono | latin-ext | 400–500 |

Only the `latin` files load for English pages; `unicode-range` keeps the others
off the critical path unless a page actually uses those codepoints. The two
`latin` files are preloaded in `src/app.html`; the `@font-face` rules live in
`src/routes/layout.css`.

## Licence

Both are licensed under the SIL Open Font License 1.1, which permits
redistribution and self-hosting.

- Outfit — <https://github.com/Outfitio/Outfit-Fonts>
- JetBrains Mono — <https://github.com/JetBrains/JetBrainsMono>

## Updating

Fetch the current subset from Google's API with a Chrome user agent (an older
agent gets TTF instead of WOFF2), then replace the file in place:

```bash
curl -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
```

The response lists one `@font-face` per subset with the file URL and the
`unicode-range`. If a range changes, mirror it into `layout.css`.
