# BottleTrack

A mobile-first inventory app for tracking bottle barcodes, expiry dates, and photos. The interface supports Hebrew (RTL), English, and Russian.

## Shared inventory setup

GitHub Pages hosts the app but does not store its data. To share one inventory between browsers and devices, connect a Supabase project:

1. Create a Supabase project and open its **SQL Editor**.
2. Run the SQL in [`supabase-setup.sql`](supabase-setup.sql).
3. Copy the project URL and its public publishable key. Add them as GitHub repository **Actions secrets** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Push to `main` to redeploy the Pages site. For local development, copy `.env.example` to `.env.local` and fill the same values.
5. Before connecting, export a JSON backup from the browser that currently holds your products. The first configured browser will seed the shared inventory if the shared table is empty. Import the backup afterward if needed.

This project is configured as **one public inventory with no sign-in**. Anyone who can access the site can read, add, edit, or delete products. The anon key is intended to be public; do not put a Supabase service-role key in the site. Changes sync between open browsers within a few seconds. Saves use a single queue and a conditional server version to merge concurrent changes. Separate product additions and expiration entries are preserved; simultaneous edits to the same product fields use the latest edit timestamp. Deletions are recorded separately from the recent activity list to prevent old devices restoring removed items.

The app keeps a device backup in IndexedDB, with localStorage as a fallback, so photo-heavy inventories can survive a refresh when localStorage is full. Failed requests retry; reopening the app or reconnecting checks immediately. Tap the cloud status icon to retry manually. Only a server-confirmed save is marked synced. Safari and an iPhone Home Screen app can have separate device storage, so both must connect to the same Supabase project.

Deployments fail if the shared storage secrets are missing. Every build includes `version.json`; older running apps offer an update when a newer deployment is detected. Include all changed and newly added source files in the commit before pushing, then wait for the Pages workflow to finish. No database migration is needed for the sync metadata: it is stored inside the existing JSON inventory row.

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

The **Automatic backups** panel keeps up to 14 dated copies on the current device. While the app is open, changed inventories are captured at most once every 30 minutes, with a new daily copy even if unchanged. A manual backup can be created at any time. Restoring a copy first saves the current inventory, then replaces the displayed inventory and queues the restored changes for shared sync. These device backups are not a separate cloud backup; export JSON to retain a copy outside the browser.

## Daily workflow

- **Pending uploads** shows new products, edits, and deletions waiting for server confirmation, including failed requests and **Retry all**. The confirmed baseline is retained on the device so the pending list can be rebuilt after a reload.
- **Expiry reminders** filters products expiring within 7, 14, or 30 calendar days, including today. Products within seven days are highlighted. These are reminders inside the app, without background push notifications.
- Enable **Keep scanning** in the barcode scanner. After a barcode opens the product form and the product is saved on the device, the scanner resumes automatically while uploads continue in the background. The camera is released between forms so the product-photo camera can be used. Held barcodes are suppressed until moved away; **Finish scanning** ends the session.

