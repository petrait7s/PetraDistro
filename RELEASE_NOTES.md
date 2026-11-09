# v1.7.2 — Unlock, pastel light theme, settings tabs, start over

- Owner can unlock a submitted van sheet ("Unlock for edit": reason + owner PIN). Van stock write-off is restored; edit and submit again.
- Light mode redesigned: soft light-navy page, pale-blue cards, mint and blush tints instead of white. Dark mode unchanged.
- New: Settings is split into tabs (General, Business, Users, Backup & data).
- New: owner-only "Start over" (Settings > Backup & data): backup first, owner PIN, then clear old accounts. Choose "keep products, companies, customers, staff" or "clear everything". Users, PINs, settings, license and audit log stay.
- Fixed: "Back up now" always failed; it works now.
- Fixed: About page showed app version 1.0.0.

# v1.7.1 — Van page fix

- Fixed: the Van page stayed blank once a van sheet had been submitted (output contract error on loadsheet.get). Submitted sheets, including ones saved by v1.7.0, open normally again.

# v1.7.0 — Van stock and cash are separate

- Loading the van moves stock off the godown: the load sheet is now the van's own stock.
- Van invoices need loaded stock (sold quantity cannot exceed what is on the van); direct sales can only use godown stock.
- Evening count: leftover goes back to the godown, shortage is written off from stock and flagged with its value; reopening a sheet restores it.
- Van cash: invoices collected vs cash handed over, with the difference flagged.
- Products & stock shows how much of each product is on the van (included in total stock).
- Van invoices save without opening the print window, so many invoices can be entered quickly.
- New `van_stock` on products, `cash` on loadsheet.get/submit, optional `cash_handed` on loadsheet.submit.

# Release notes

## 1.6.0
- Manager full access (setting `manager.full_access`, default on): the manager edits products, stock, purchases, companies and customers, sees buy rates, and works on any date, with no PIN. Owner-only stays: settings, users/PINs, backups, license, audit, salaries, commission, reversals and refunds. The owner can switch it off in Settings > Business rules.
- Edit mode PIN is off by default (setting `editmode.required`); turn it on in Settings > Business rules.
- Branding: small Petra mark with the motto "Built on Trust" on the login/setup screens; the client company logo in the centre and in the sidebar. Logo upload in first setup and in Settings > Shop settings (PNG/JPEG, resized to 360 px). `license.status` returns `business_logo`; `setup.complete` accepts `business.logo`.
- New app icon from the Petra mark.
- Fix: saving one setting no longer clears the other settings shown on the page.

## 1.5.0
- License: fixed owner code (`PETRA_LICENSE_CODE` build secret, hash only in the app). Dashes/case ignored; also accepted for PIN reset.
- Purchases: rebuilt "Receive goods" screen, now the first tab. "Select many products" checklist, "New product" and "+ company" buttons, per line pcs per carton, buy rate, wholesale and retail rate, expiry, amount. One save, no edit-mode PIN.
- Backend: `purchases.create` / `purchases.preview` lines accept `pcs_per_carton`, `sell_price`, `retail_price`; the purchase updates the product (carton size only while it has no stock history; refused otherwise). A product without pcs per carton gives a clear "Pcs per carton missing" error.
- The 75 MM Traders products are preinstalled at first setup (`setup.complete` option `seed_products`, default on).
- New look: frameless window with macOS-style close / minimise / maximise buttons and a light, colourful theme (gradient sidebar and buttons). Light theme is the default; dark still available.
- Number boxes accept Bangla digits (১২৩) and thousands commas.
- Dashboard: no more "undefined kg" / "NaN"; backend now returns discount per carton and net loose-tea kg.
- Van page: van selector removed (one van), help line, layout fix. Nav label "Van".
- Sales: shorter labels, no misleading over-limit warning for the owner, compact line table.
- Windows icon (`app/build/icon.ico`), window minimum size, no flash on start.

## 1.4.0
- Sales: pick "Direct" (customer takes goods now) or "Van invoice" (goods went out for distribution, invoice comes later). Van invoices are back-datable by the owner to the dispatch date and keep stock correct.
- Sales: "Select many products" opens a checklist; tick several products and add them to the invoice table in one step. Per-line discount and invoice discount stay as before.
- Price type per invoice: Wholesale (default) or Retail. Each product has an optional retail price (product form and the simple table). Retail invoice for a product with no retail price is refused.
- New "Van" page (replaces "Load sheet"): load sheet, loaded / sold / returned / should be left / counted / difference, the van invoices of the day with totals (collected and due), recent trips, and a CSV report.
- Backend: `sales.list` filter `van`, row field `van`; `files.saveBytes` accepts `text/csv`; migration 0006 adds `products.retail_price`.
- Van sold quantity counts only van-tagged invoices.

## 1.3.0
- Products & stock opens as a simple table: per product set company, pcs per carton, buy rate, sell rate and stock, then "Save all". No review dialog, no reasons. Enter moves down a column. Rows with problems are marked red before anything is saved.
- The Excel-like grid is still available as "Advanced grid" (button on both screens).

## 1.2.1
- Product import: one-click "set all rows" (import as is / skip), warnings default to "import as is" so 75 rows no longer need 75 choices; column mapping now lists the real fields (sell price, buy price, pcs per carton, carton weight).

## 1.2.0
- Inventory: "Add stock" (toolbar and per row) with buy rate, sell rate, expiry; row buttons for details, add stock, edit, archive.
- Inventory grid: review step now sends a reason (fixes "Each grid edit needs reason").
- Quick add names (paste a list of products), purchase table with carton, pcs per carton, buy rate and sell rate.
- Backend: fast product list, backup on quit, manual restore tool, csv/xlsx export, invoice save/share, tea flag kept on save.

## 1.1.0
- Backend and frontend merged; Electron wiring.
