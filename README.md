# BottleTrack

A mobile-first inventory app for tracking bottle barcodes, expiry dates, and photos. The interface supports Hebrew (RTL), English, and Russian.

## Shared inventory setup

GitHub Pages hosts the app but does not store its data. To share one inventory between browsers and devices, connect a Supabase project:

1. Create a Supabase project and open its **SQL Editor**.
2. Run the SQL in [`supabase-setup.sql`](supabase-setup.sql).
3. Copy the project URL and its public anon/publishable key. Add them as GitHub repository **Actions secrets** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Push to `main` to redeploy the Pages site. For local development, copy `.env.example` to `.env.local` and fill the same values.
5. Before connecting, export a JSON backup from the browser that currently holds your products. The first configured browser will seed the shared inventory if the shared table is empty. Import the backup afterward if needed.

This project is configured as **one public inventory with no sign-in**. Anyone who can access the site can read, add, edit, or delete products. Do not store private or sensitive information. The anon key is intended to be public; do not put a Supabase service-role key in the site. Changes sync between open browsers within a few seconds. Concurrent edits to the same inventory may overwrite one another, so use the JSON export as a backup.

Until both GitHub secrets are configured and a new deployment completes, the app continues to use the current browser's local storage and shows that status in the interface.

## Run locally

```bash
npm install
npm run dev
```

Camera scanning uses ZXing in supported browsers. Camera access requires HTTPS or localhost and browser permission; manual barcode entry remains available.

## Tests and build

```bash
npm test
npm run build
```

## Deploy

The included GitHub Actions workflow builds the Vite app and deploys `dist/` to GitHub Pages when changes are pushed to `main`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Backups

Use **Export JSON** to download the current inventory. **Import JSON** replaces the shared inventory when shared storage is configured, or the local browser inventory otherwise. Keep a copy of the backup before importing.
