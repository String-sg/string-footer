---
name: string-footer
description: Adopt or update the shared String product footer across String websites, including Astro, React and static HTML products. Use for String footer consistency and migrations.
---

# String footer

The source of truth is [String-sg/string-footer](https://github.com/String-sg/string-footer). Read its README and inspect the target repository's instructions before editing.

The component uses String's mint logo, charcoal background, Montserrat body and Space Grotesk labels. Explore String contains Products (`https://string.sg/products/`), Metrics (`https://reports.string.sg/`), then Skills with the explanation “for AI, e.g. Claude, Codex” (`https://skills.string.sg/`). Keep Bingo out of this navigation. Place a Sign up link to `https://id.string.sg/` below the links in Get involved. Do not show a location label; String is expanding across Asia. Social links use compact SVG icons with accessible names and visible keyboard focus. Keep community, privacy and terms links consistent. Social destinations are Medium (`https://medium.com/string`), LinkedIn (`https://www.linkedin.com/company/77759625/`), Instagram (`https://www.instagram.com/stringedu/`), TikTok (`https://www.tiktok.com/@string.sg`) and GitHub (`https://github.com/String-sg/`). GitHub is a social icon linking to the String organisation, not a separate per-product source link. Only String ID shows Code of Conduct, using the local `/conduct` route. Do not add that policy link to the other products. Signing and access controls remain owned by String ID.

For the supported String products, run the reviewed branding checkout's script:

```sh
node components/string-footer/sync.mjs <landing|id|skills|bingo|reports|diagrams> /path/to/product
node components/string-footer/sync.mjs <landing|id|skills|bingo|reports|diagrams> /path/to/product --check
```

This vendors framework-native markup, shared CSS, the approved SVG and a version/digest manifest. It does not wire up a new React or Astro layout. Import `src/components/string-footer/StringFooter` once in the outer layout, after the main content. The landing site's existing `Footer.astro` delegates to the generated component. Static HTML pages use marked regions managed by the script.

Change shared markup and styles in the branding source, regenerate affected consumers, and review each diff. Avoid patching generated copies independently. When adding a new product, extend the explicit product map and preserve the shared String organisation link. Keep assets local; do not load a footer script from GitHub or add a publishing dependency solely for this component.

Keep game controls, authentication and product-specific integration links outside the shared footer. In the compact variant, render the existing contributor credits in the footer itself and remove only their duplicated display copy; preserve their exact roles, wording and links. In Bingo, `.footer` is the game controls area used by authentication code; do not reuse it for the String footer. In String ID, preserve the conduct-signing gate and public conduct route.

Check mobile and desktop rendering, logo loading, one footer per page, no horizontal overflow, keyboard focus and link destinations. Exercise relevant routes and Bingo's creation page as well as home pages. Run the target repository's required checks. Open PRs when requested; adoption does not authorize merging or deployment.

Use the full footer on ecosystem sites; prefer compact on focused tools that already credit their creators. Compact requires explicit, verified contributor credits and a String backlink. Preserve existing wording and roles: Bingo is made by String Team and inspired by Seng Kwang; Diagrams is created by Julienne and supported by string.sg. Do not relabel inspiration as original authorship. Reports uses the full footer; Diagrams and String ID use compact. String ID credits String Team and keeps its local Code of Conduct link. Keep tool controls separate. For other users/apps, use the JSON config interface in the repository README rather than editing a generated copy. The logo is pulled from a pinned brand-guide commit by scripts/sync-brand-assets.mjs; updates are explicit, never runtime downloads.
