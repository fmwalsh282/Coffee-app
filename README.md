# Coffee Bean Tracker

A small app for logging coffee beans you've tried: name, tasting notes, ideal
brew time, ideal grind size, and your rating. Everyone with the app's link
shares the same list (stored in Vercel Blob, not per-browser), and you can
look up tasting notes for a bean online instead of typing them in by hand.

## Local development

```bash
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173).

Neither the bean list nor "Search online" work under plain `npm run dev`,
since both are serverless API routes (`api/beans.ts`, `api/search-bean.ts`).
For those to work locally, use the [Vercel CLI](https://vercel.com/docs/cli)
instead:

```bash
npm install -g vercel
vercel dev
```

This needs the same environment variables as production (`ANTHROPIC_API_KEY`
and a Blob store connection) — see below.

## Deploying to Vercel

This app needs a backend both to look up tasting notes and to store the
shared bean list (the browser can't call the Anthropic API directly, and
GitHub Pages can't run server code or a database), so it's set up to deploy
on [Vercel](https://vercel.com), which hosts the static app and the `api/`
serverless functions together.

1. Create a free Vercel account and **import this GitHub repo** as a new
   project (Vercel auto-detects the Vite framework — no config needed).
2. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — your key from
     [console.anthropic.com](https://console.anthropic.com/settings/keys)
3. In the project's **Storage** tab, create a **Blob** store and connect it
   to this project — Vercel adds the required `BLOB_READ_WRITE_TOKEN`
   environment variable automatically.
4. Deploy (or redeploy if you already had). Vercel gives you a URL like
   `https://your-app.vercel.app`.

To use it on an iPhone: open that URL in **Safari**, tap **Share → Add to
Home Screen**. It'll launch full-screen with its own icon.

## Shared list

The bean list lives in a single JSON blob in Vercel Blob storage
(`api/beans.ts`), not in each visitor's browser — so anyone with the app's
link sees and edits the same list. There's no login, so anyone with the
link can add or remove beans.

## Places to Eat (restaurant list)

A second page, at `/restaurants.html` on the same deployment (for example
`https://your-app.vercel.app/restaurants.html`), keeps a shared list of
restaurants you want to try or have been to: name and website, type of food,
suburb, rating out of 5 (or "want to go"), occasions, whether it's accessible (yes, outside only, or no),
and notes. A restaurant can have several types of food (e.g. Peruvian and
Chinese) and shows up under each one in the Food filter. Every column can be
sorted, and the list can be filtered by been / want to go, type of food, accessibility,
occasion, or by searching. Each entry has an Edit button.

It works the same way as the bean list: the data is one JSON blob
(`restaurants.json`) in the same Vercel Blob store, read and written by
`api/restaurants.ts`. Anyone with the link can view, add, edit and delete,
with no sign-in. No extra setup is needed beyond what the bean list already
uses. Open pages refresh every 30 seconds to pick up other people's changes.

## How the online search works

The "Search online" button sends the bean name to `api/search-bean.ts`,
which asks Claude (via the Anthropic API's web search tool) to find the
roaster's product page or a coffee review site, and pull out tasting notes.
Results fill the tasting notes field for you to review and edit before
saving — nothing is saved automatically, and if no reliable match is found
you'll be told so instead of getting a guess.
