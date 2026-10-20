# BottleTrack — bottle inventory and expiration tracking

A mobile-first, multilingual inventory web app for tracking bottle barcodes, product details, photos, expiration-date entries, and price history. Built with React + Vite and ready for GitHub Pages.

## Features

- Barcode scanner using the device camera where the browser supports `BarcodeDetector`, plus manual barcode entry.
- Scan an existing barcode to open its saved product record; add a new expiration date instead of duplicating the product.
- Product name, optional description and photo, bottle price, expiration dates, batch notes, and price history.
- Expiration filters: in date, expiring soon (60 days), expired, and no date.
- Hebrew (RTL), English, and Russian interface.
- Responsive layout for phones, tablets, and laptops.
- JSON backup and restore.
- No server or account credentials required for this prototype.

## Important storage limitation

This version stores data in the current browser's `localStorage`. It is **not shared automatically** between employees, browsers, or devices. JSON export/import can move data manually, but simultaneous updates by multiple employees are not synchronized. Browser data may also be lost if site data is cleared. Export backups regularly.

For a shared store inventory, use a shared database/service such as Supabase or Firebase with employee authentication and access rules. GitHub Pages can still host the frontend; it should not be treated as writable shared storage.

## Run locally

Requires Node.js 20 or newer. `npm run deploy` also requires the GitHub CLI (`gh`) installed and authenticated to the repository.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera scanning typically requires HTTPS or localhost and browser camera permission. `BarcodeDetector` is not supported in every browser; manual entry is included as a fallback.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `bottletrack`.
2. Upload/push all project files to the repository root and use the `main` branch.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. Push to `main` (or run the workflow manually from **Actions**). The included workflow builds the app and deploys `dist/`.
6. Open the Pages URL shown by the deployment workflow. For a later manual deploy, commit and push your changes first, then run `npm run deploy` from the project folder. This builds locally and asks GitHub Actions to deploy the latest commit on the default branch.

The Vite config uses a relative base path (`./`) so assets work on project pages as well as a custom domain.

## JSON backup

Use **Export JSON** in the sidebar to download a backup. On the target browser, use **Import JSON** to restore it. Import replaces that browser's current dataset after confirmation. Keep a copy of the backup before importing.

## Data model overview

- `products`: product identity and metadata, plus `lots` (expiration entries) and `priceHistory`.
- `activity`: recent actions.
- Each expiration entry is a separate record, so the same product can have multiple dates from different deliveries.

## Before using for business-critical inventory

- Add shared authenticated storage before expecting all staff to see the same live records.
- Establish a backup routine.
- Confirm expiration-date and price-entry procedures with employees.
- Photos are stored as data URLs in browser storage, so use reasonably small images. Large photos can fill browser storage.

