# Pokémon TCG Set Tracker

A single-page web app for tracking your progress toward collecting 100% of a
Pokémon TCG set.

## Features

- Pick any official set (grouped by series) from a live-loaded dropdown.
- See every card in the set as a grid, with a progress ring and count showing
  how much of the set you own.
- Click a card to mark it owned/missing. Your collection is saved in the
  browser's `localStorage`, per set, so it persists across visits.
- Search within a set by card name or number.
- "Mark all owned" and "Clear set" bulk actions.

## Running it

No build step or server required — it's plain HTML/CSS/JS.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Data source

Card and set data comes from the free [Pokémon TCG API](https://pokemontcg.io)
(`api.pokemontcg.io`), fetched directly from your browser. No API key or
backend is required for normal use. Your collection data never leaves your
browser — it's stored locally, not sent anywhere.

## Hosting

Since it's static files, you can deploy it as-is to GitHub Pages, Netlify,
Vercel, or any static host.
