# Coffee Bean Tracker

A small app for logging coffee beans you've tried: name, tasting notes, ideal
brew time, ideal grind size, and your rating. Beans are saved in your
browser's local storage, and you can look up tasting notes for a bean online
instead of typing them in by hand.

## Local development

```bash
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173).

The "Search online" button calls a serverless API route (`api/search-bean.ts`)
that isn't served by `npm run dev` — for that to work locally you need the
[Vercel CLI](https://vercel.com/docs/cli):

```bash
npm install -g vercel
vercel dev
```

Either way, the API route needs an `ANTHROPIC_API_KEY` — see below.

## Deploying to Vercel

This app needs a backend to look up tasting notes (the browser can't call the
Anthropic API directly, and GitHub Pages can't run server code), so it's set
up to deploy on [Vercel](https://vercel.com), which hosts the static app and
the `api/` serverless function together.

1. Create a free Vercel account and **import this GitHub repo** as a new
   project (Vercel auto-detects the Vite framework — no config needed).
2. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — your key from
     [console.anthropic.com](https://console.anthropic.com/settings/keys)
3. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.

To use it on an iPhone: open that URL in **Safari**, tap **Share → Add to
Home Screen**. It'll launch full-screen with its own icon.

## How the online search works

The "Search online" button sends the bean name to `api/search-bean.ts`,
which asks Claude (via the Anthropic API's web search tool) to find the
roaster's product page or a coffee review site, and pull out tasting notes.
Results fill the tasting notes field for you to review and edit before
saving — nothing is saved automatically, and if no reliable match is found
you'll be told so instead of getting a guess.
