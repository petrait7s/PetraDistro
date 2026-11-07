# PetraDMS Pro v1.6.0 (backend + frontend, integrated)

Offline Windows desktop app for MM Traders (Electron + SQLite/sql.js). Frontend: `app/renderer` (vanilla JS, bn/en, light/dark). Backend: `app/src` (worker thread, contract-validated). The renderer talks only through `window.api.call` (preload).

## Run (dev)
Linux / macOS / Windows with Node 20+:

    export PETRA_LICENSE_SECRET=dev-secret-change-me-0123456789abcdef
    cd app && npm ci && npm start
    # new terminal, same secret: node ../tools/issue-license.js MMTR   (prints the license code)

NixOS (the npm Electron binary does not run there; use the nixpkgs one). Easiest: `nix-shell` in the repo root (uses `shell.nix`), then `cd app && npm install && electron .`. Or by hand:

    export PETRA_LICENSE_SECRET=dev-secret-change-me-0123456789abcdef
    cd app && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci
    nix-shell -p electron nodejs --run "electron ."

The secret must be the same every run, or the license code stops matching.

## Build the Windows installer
Push to GitHub, add the repository secret `PETRA_LICENSE_SECRET` (32+ characters), then run the workflow "Windows backend package" (Actions tab, Run workflow). The installer is in the run's artifacts.

Local build: (run on Windows, or in the supplied GitHub workflow)
    cd app
    set PETRA_LICENSE_SECRET=<your private 32+ char secret>
    npm run dist
Output: `dist/PetraDMS-Setup-1.6.0.exe` and a portable exe. Keep the secret private: it signs license codes. `npm run dist` writes the secret into `app/src/build-config.js`; do not commit that file after a local build (`git checkout app/src/build-config.js`).

## License code
Release builds use one fixed owner code that only you know (letters and digits, at least 8; dashes, spaces and case are ignored).
Add it as the GitHub secret `PETRA_LICENSE_CODE`, e.g. `PETRA-XXXX-XXXXX-XXX`. The build stores only a scrypt hash of it, never the code. Enter the same code on first run, and use it again on "Forgot PIN".

Local run with the fixed code: `PETRA_LICENSE_CODE='your code' electron .`

Without `PETRA_LICENSE_CODE` the old signed codes are used: `PETRA_LICENSE_SECRET=<secret> node tools/issue-license.js MMTR`.

## Data
SQLite file in `%APPDATA%\PetraDMS\data\data.db`; backups in `Documents\PetraDMS\Backups`; saved invoices and exports in `Documents\PetraDMS\Files`. First setup preinstalls the 75 MM Traders products (`app/seed/mm-traders-products.csv`) with their companies, wholesale price per carton (per kg for loose tea) and, where the name and carton weight allow it, pcs per carton. Buy rates are empty until the first purchase. An existing database is never touched: seeding runs only when the product table is empty.

## Tests
    cd app && npm ci
    npm test              # backend (15 tests)
    npm run test:frontend # UI on the mock backend (329 checks)
    npm run probe         # renders every screen against the real engine

## Daily use
- Inventory opens as a simple table: fill company, pcs per carton, buy rate, sell rate, stock, then Save all.
- Inventory > Quick add names: paste product names, one per line (optionally `name, pcs per carton, sell price per carton`). Then fix stock and details in the grid (Edit mode).
- Purchases > Receive goods (opens first): "Select many products" (tick several) or search one, then per line cartons/pcs, pcs per carton (only while the product has no stock), buy rate, wholesale and retail rate, expiry. Save is one step, no PIN: it adds the stock lot and updates the product's carton size, buy rate and sell rates. Bangla digits and commas are accepted in number boxes.
- Sales: choose Direct sale or Van invoice, Wholesale or Retail price, then add products (search or "Select many products"). Discount per line and per invoice.
- Van page: morning load sheet, van invoices of the day with collected and due, evening count, recent trips, CSV report.
- Edit mode asks the owner PIN once when needed.
- The app makes a backup every time it closes (`Documents\PetraDMS\Backups`). Restore by hand while the app is closed: `node tools/restore-backup.js <file.pdbak> <path to data.db>`.

## Honest status
Read `KNOWN_GAPS.md` and `docs/FRONTEND_STATUS.md` before using real shop data. No Windows build, install, printer or Google Drive run has been done. Items that return UNSUPPORTED in the backend (backup.restore, Drive, printers, license.reveal, late commission adjustments) show an error message in the UI; they do not fake success.
