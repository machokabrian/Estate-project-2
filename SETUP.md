# Going live with real, admin-managed listings (about 30 minutes)

Your properties live in your own database (Supabase). You sign in at `/admin.html` to add, edit, hide or delete them,
and upload their photos. The website shows them instantly. No code editing, no sample data.

## 1. Create the database
1. Sign up at https://supabase.com and click **New project**. Pick a strong database password (save it) and the region closest to Kenya.
2. Open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`, click **Run**. It should say "Success".

## 2. Create your admin login
1. **Authentication → Users → Add user → Create new user**. Enter your email and a strong password and tick **Auto Confirm User**.
2. **Authentication → Sign In / Providers** (or Settings): turn **OFF "Allow new users to sign up"** so nobody else can register. Do this before launch.
3. Back in **SQL Editor**, run this with your real email:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';
   ```
   (Add more admins later by repeating steps 1 and 3 for each person.)

## 3. Connect the website
1. **Project Settings → API** (or "API Keys"): copy the **Project URL** and the **anon / publishable key**.
2. Put them in `config.js`:
   ```js
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseKey: "your-anon-or-publishable-key",
   ```
   The anon/publishable key is meant to be public. It can only read published listings. Never put a `service_role` or `secret` key anywhere in the site.
3. Upload the website files to your host.

## 4. Add your first property
1. Open `https://estateproject2.vercel.app/admin.html` and sign in.
2. **+ Add listing**, fill in the details, upload real photos of the property, keep **Published** ticked, **Save**.
3. Open the home page: it appears straight away. Untick Published (or tap **Hide**) to make it disappear without deleting it.

## Publishing on Vercel (with a page for every property)
Every published property gets its own web page (for example `estateproject2.vercel.app/property/12-3-bedroom-bungalow-milimani/`) with its photos, price, map, a preview picture for WhatsApp, and the tags Google needs. `sitemap.xml` is created automatically. Vercel builds all of this for you.

**One-time setup**
1. Put the whole project in a Git repository (GitHub, GitLab or Bitbucket) and import it in Vercel. Keep the `scripts` and `supabase` folders and `vercel.json` in the repository.
2. You don't need to change any Vercel settings: `vercel.json` already tells Vercel to run `node scripts/build-pages.mjs --dist` and publish the `dist` folder. That folder contains only the website files, so `SETUP.md`, the SQL files and `ai-worker` are never public.
3. `siteUrl` in `config.js` is already `https://estateproject2.vercel.app`. When you add your own domain later (Vercel → Settings → Domains), change `siteUrl` to it and redeploy. Everything else updates itself.
4. Redeploy once (Vercel → Deployments → ⋯ → Redeploy). Open `https://estateproject2.vercel.app/sitemap.xml` to see your property pages listed.
5. After launch, submit that sitemap in Google Search Console.

**Keeping pages up to date**
Property pages are rebuilt each time Vercel deploys, so a brand-new property gets its own page at the next deployment. Until then its link opens the property's quick view on the home page, so nothing ever shows an error. The home page and quick view always show live data, and every property page also refreshes its price and availability when opened.

To rebuild automatically within about a minute of every change in the admin (recommended):
1. In Vercel: your project → **Settings → Git → Deploy Hooks** → create a hook named `listings` for branch `main`, and copy its URL. This needs a Git-connected project.
2. Open `supabase/instant-updates.sql`, replace `PASTE_DEPLOY_HOOK_URL` with that URL, and run it in the Supabase SQL Editor.
Treat the hook URL like a password: anyone who has it can trigger a deployment. Vercel allows up to 60 deploy-hook triggers per hour per project.

**Good to know**
- If the database is unreachable during a build, the build stops and your last live site stays online.
- Hidden or deleted properties lose their page at the next deployment.
- Vercel's free Hobby plan is described as for personal, non-commercial use only. A real estate business is commercial, so check Vercel's current terms and use a Pro plan if they apply to you. Netlify or Cloudflare Pages work too, with the same build command and output folder.

## Site settings (contact details, About text, photos)
The **Site settings** tab controls what visitors see without any code: phone, WhatsApp numbers, email, address and hours, social links, the About text, and six photos (top banner, About section and the four category tiles). Until you upload photos, the site shows plain colours instead of stock pictures. Run the latest `supabase/setup.sql` again if you set up earlier (safe to repeat).

## Team and client reviews
In the admin page, use the **Team** and **Client reviews** tabs. Add real people (with a photo and WhatsApp number) and genuine client reviews you have permission to publish. Each website section stays hidden until you add something, and nothing is ever shown as a sample.
If you set up earlier, run the latest `supabase/setup.sql` again (it is safe to repeat) so the team and reviews tables exist.

## Daily use
- **Hide / Publish**: show or remove a property from the site.
- **Status**: mark Reserved, Sold or Let. The listing stays visible with a badge, and moves to the end of the list.
- **Copy**: duplicates a listing as a hidden draft, handy for similar units.
- **Delete**: removes the listing and its photos permanently.
- Photos are resized automatically in the browser before upload. A published listing needs at least one photo.

## Production notes
- **Pricing and pausing:** Supabase's free plan works, but free-plan projects pause after about a week of inactivity, and the database stops answering until you restore it. For a business website, use the Pro plan (about $25/month) so it never pauses. Check supabase.com/pricing for current terms.
- **Backups:** daily backups come with the Pro plan. On the free plan, export your data now and then (Table Editor → listings → Export).
- **Passwords:** to change an admin password, use Authentication → Users in the dashboard. Use a long unique password.
- **If listings don't show:** open the browser console. A message about `supabaseUrl` means `config.js` isn't filled in. Run `setup.sql` again if you see permission errors.
- **Link preview image:** when someone shares your home page link on WhatsApp or Facebook, the preview picture comes from `og-image.jpg` (1200 × 630 pixels). Add that file next to `index.html`, using a real photo or your logo. Without it, the home page link simply shows no picture (property links use the property's own photo).
