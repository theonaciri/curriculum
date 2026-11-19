<img src="assets/icon.svg" width="64" height="64" alt="">

# theonaciri

Personal site of Théo Naciri — résumé and portfolio ("book"), in English and French — live at **https://theonaciri.fr**.
Plain static HTML/CSS/JS: no framework, no build step, no cookies, no trackers. Hosted on Cloudflare (Workers static assets).

## Structure

```
public/                       Everything that gets published
  index.html                  English page (also the default for every other language)
  fr/index.html               French page
  404.html                    Bilingual "page not found"
  assets/css/style.css        All styles (light + dark theme, animations, responsive)
  assets/js/main.js           Progressive enhancements (reveal on scroll, lightbox, counters…)
  assets/img/work/            Book screenshots, WebP, 800px + up to 1600px variants
  assets/fonts/               Instrument Serif + Geist (self-hosted, SIL OFL — licenses alongside)
  assets/cv/                  Downloadable résumés (EN / FR PDFs)
  assets/og/                  Social preview images (1200×630)
  _headers                    Security + cache headers applied by Cloudflare
  robots.txt, sitemap.xml
wrangler.jsonc                Cloudflare config (assets directory, 404 handling, custom domains)
assets/icon.svg               T3 Code project icon (not published)
```

## Language selection

- `/` checks the browser languages (`navigator.languages`). If French comes before English, the visitor is sent to `/fr/` (the `#anchor` is kept).
- Clicking **EN** / **FR** remembers the choice in `localStorage`, so a French speaker who picks English stays on English.
- `/?lang=fr` or `/?lang=en` forces a language (handy for links).
- `/fr/` opened directly is always respected — no redirect away from an explicit URL.
- Search engines get both versions through `hreflang` tags and `sitemap.xml`.

## Preview locally

```sh
bunx wrangler dev                    # same behaviour as production (headers, 404, redirects) → http://localhost:8787
python3 -m http.server -d public     # or any static server → http://localhost:8000
```

## Deploy (Cloudflare)

`theonaciri.fr` is registered at Gandi with its DNS on Cloudflare, so there is no DNS record to create by hand.

1. Once: `bunx wrangler login`
2. Every release: `bunx wrangler deploy` — uploads `public/` and attaches `theonaciri.fr` and `www.theonaciri.fr` (Wrangler creates their DNS records; the Gandi MX records for e-mail are untouched).
3. Once, in the Cloudflare dashboard for the zone:
   - **SSL/TLS → Edge Certificates → Always Use HTTPS**: on.
   - **Rules → Redirect Rules → template "Redirect from WWW to root"**, so `www.` lands on `https://theonaciri.fr/`.
4. Once: add the site to Google Search Console and submit `https://theonaciri.fr/sitemap.xml`.

To deploy on every push instead, connect the Git repository in **Workers & Pages → theonaciri → Settings → Builds** (no build command; Wrangler reads `wrangler.jsonc`).

## Editing content

The two pages are hand-written and mirror each other: when you change a project, a job or a skill, update both `public/index.html` and `public/fr/index.html` (and `<lastmod>` in `sitemap.xml`).
Each book project is an `<article class="project">`; each screenshot is a `<figure class="shot">`:

- `shot--wide` spans the full gallery width, otherwise it takes half;
- `shot--tall` makes a long page scroll inside its frame on hover (`--ar` = frame width / height, `--r` = image height / width);
- `shot--crop` fits a landscape screenshot into its frame.

Fonts and screenshots are cached for a year by browsers (`_headers`): when you replace a screenshot, save it under a new file name. HTML, CSS and JS are revalidated on every visit, so edits show up immediately.

## Notes

- Screenshots come from the PDF book. A few details were blurred before publishing: two public production IPs (Skoleom DevOps), the account balance and number (Hello bank! client space) and patient names (Followmed agenda).
- Lighthouse (local run): 100 performance / accessibility / best practices / SEO on desktop; mobile performance 94–99 depending on the run, accessibility / best practices / SEO 100.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.

Created in [T3 Code](https://t3.codes).
