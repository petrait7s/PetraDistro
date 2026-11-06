# Release notes

## 1.5.0
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
