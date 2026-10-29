# Machoka Mwamba Properties – website

## Files to upload to GitHub / your host (all in the same folder)
- `index.html`, `style.css` – page and design
- `config.js` – **your settings**: contact details, database keys, email backup, analytics
- `db.js` – talks to your listings database
- `script.js`, `details.js`, `extras.js`, `analytics.js` – site logic
- `admin.html`, `admin.js` – the admin panel (sign-in required)
- `property.js` – logic for the generated property pages
- `scripts/build-pages.mjs` – creates a page for every property and the sitemap
- `vercel.json` – tells Vercel how to build and what to publish
- `404.html`, `robots.txt`, `sitemap.xml` – hosting and SEO
- `og-image.jpg` – **you add this**: a real 1200 × 630 picture used when your link is shared on WhatsApp/Facebook

Kept in the repository but never published (Vercel only serves the `dist` folder): `SETUP.md`, `supabase/`, `scripts/`, `vercel.json` and the optional `ai-worker/` folder.

## Start here
Follow **SETUP.md** to create the database, your admin login and connect the site.

## Before launch checklist
- [ ] SETUP.md steps 1–4 done, sign-ups switched off, at least one real listing with real photos
- [ ] Admin → Site settings: real email, address, hours, social links, About text and your own photos
- [ ] Add `og-image.jpg` (1200 × 630) next to `index.html`
- [ ] Vercel: redeploy once, then check `/sitemap.xml`; create a Deploy Hook and run `supabase/instant-updates.sql` for automatic rebuilds
- [ ] After launch: submit `https://estateproject2.vercel.app/sitemap.xml` in Google Search Console
- [ ] When you get your own domain: add it in Vercel, then change `siteUrl` in `config.js`
- [ ] Email backup: free form at formspree.io, URL into `formEndpoint`
- [ ] Analytics IDs (optional)
- [ ] Add real team members and genuine client reviews in the admin page (Team and Client reviews tabs); the sections stay hidden until you do
- [ ] Optional AI assistant: see `ai-worker/README.md`
- [ ] Have the privacy policy (built in `details.js`) reviewed by a lawyer

## Hosting
Vercel (see SETUP.md, “Publishing on Vercel”). Your site: https://estateproject2.vercel.app. `sitemap.xml` and `robots.txt` are regenerated on every deployment.
