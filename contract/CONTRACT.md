# PetraDMS Contract v0.2.0 — partial handoff

This section supersedes conflicting v0.1 prose below. The historical section remains for business context, not to authorize missing implementation. Executable desktop request schemas are in methods.json; corrected engine schemas are in runtime-0.2/. The desktop adapter preserves original method input keys and explicitly rejects unsafe legacy flows. Both registries are versioned 0.2.0; FRONTEND_INTEGRATION.md describes their differences. Do not use internal engine inputs through the desktop bridge.

- Keep the original success/error envelope. Session metadata comes only from auth.login; renderer receives no token or features.commission.
- Money and base quantities are safe integers. Intermediate arithmetic uses BigInt; kg inputs are decimal strings. Missing production costs, prices and carton sizes are never inferred from demonstration data.
- Invoice-level discounts are owner-only and count together with line discounts toward caps/minimum prices. Manager receives only needs_approval, never private pricing values.
- Saved invoice/payment facts are immutable; cancellations/reversals require reasons and audit entries. Original payments survive invoice cancellation; credit and explicit refunds are separate.
- Manager access is own invoices and receipts today plus the previous two business days. Manager cannot set credit limits/opening due. Role enforcement occurs in services.
- Internal approvals are single-use operation/payload-bound capabilities governed by approval-matrix.json. Legacy scope-only desktop approval is deliberately UNSUPPORTED. Internal business writes have durable optional UUID request_id retries; desktop legacy requests currently lack this extension.
- One drawer is intended for cash flows; noncash expenses do not affect it. Closed-day corrections post to an open date; reopen retains revisions. Opening drawer/carry-forward is unfinished.
- No production commission rules are seeded. Closed commission history must not be rewritten; late adjustment implementation is unavailable, so affected operations return UNSUPPORTED.
- Opening balances use a cutover import. No Lite migration. VAT is outside v1. External backup import is distinct from restore; restore and Drive OAuth/upload are incomplete.
- Unknown keys are rejected. schemas, errors, settings and events are executable definitions; event definitions do not imply producers exist. Every unimplemented capability must be checked against KNOWN_GAPS.md.
- Existing fixture numbers are preserved in calculation-vectors and legacy-0.1.0. fixtures contains full response examples for those scenarios, not exhaustive success/error fixtures for all 119 methods.

Regenerate with `python3 tools/gen_contract.py` from the project root; `node tools/gen_fixtures.js` regenerates full fixtures using test-only data. See CHANGELOG.md for changes and STATUS.md for evidence. The original B1–B27 review text is not present, so reconciliation against those exact review IDs remains pending.

---

## Historical v0.1 reference (overridden above)

# PetraDMS Contract v0.1.0

The single source of truth between **frontend** (Claude) and **backend** (Astra GPT). If a rule here conflicts with any other file, this file wins. If something is missing, do not guess: add it to `OPEN_QUESTIONS` at the bottom, bump the version, and tell the owner.

Files in this folder:

| File | What |
|---|---|
| `CONTRACT.md` | Rules, formulas, roles, conventions (this file) |
| `METHODS.md` | Readable table of all 104 methods (generated) |
| `methods.json` | Machine-readable: name, who, input shape, output shape, errors, notes, audit |
| `types.json` | Shared shapes (Qty, Product, Sale, Payment, ...) |
| `errors.json` | Error codes |
| `fixtures/` | Worked examples with computed numbers. Use as test vectors |
| `seed/PetraDMS_Products_Import_Cleaned.csv` | First product list (75 rows) |

Regenerate the JSON/MD with `python3 tools/gen_contract.py contract`. Edit only `tools/gen_contract.py`. Change the version string when anything changes.

---

## 1. Transport

```js
const res = await window.api.call('sales.create', { ...args });
// success: { ok: true,  data: {...} }
// failure: { ok: false, code: 'NEEDS_OWNER_PIN', message: 'English dev text', details: {...} }
window.api.on('net.status', (p) => {...});   // push events, returns an unsubscribe function
```

- Exposed by `preload.js` with `contextBridge`. The renderer has no Node, no `fs`, no network.
- Main process validates the **method name against an allow-list** generated from `methods.json`, and validates `args` against the input shape before calling the service.
- The service layer knows nothing about Electron (so a LAN/HTTP transport can be added later).
- `message` is for developers and logs. The UI shows its own Bangla/English text keyed by `code` (+ `details`).
- A session token is held by the **main process**, never by the renderer. `auth.login` sets it. `UNAUTHENTICATED` means login needed, `LOCKED` means unlock needed.

## 2. Conventions

| Topic | Rule |
|---|---|
| Money | Integer **paisa**. No floats anywhere in contract, DB, or code. ৳ 105.84 is `10584`. |
| Business date | `YYYY-MM-DD`, local Asia/Dhaka. Used for `date` fields. |
| Timestamps | ISO-8601 UTC string in contract, stored as integer epoch ms in DB. |
| Quantity | Always an object (`Qty`). Base unit is **pcs** for `carton_pcs` products and **grams** for `by_kg` products. Backend returns `cartons`, `pcs`, `kg`, and bn/en `text` so the UI never divides. |
| Quantity input | `QtyIn = { cartons?, pcs?, kg? }`. `kg` is a decimal **string** (max 3 decimals), parsed exactly by the backend. Float input is rejected with `VALIDATION`. |
| IDs | Integers. Invoice no `INV-000123`, receipt `RCV-00123`, purchase `PUR-0051`, return `RET-0007`: gapless, never reused (cancelled ones stay in the list). |
| Paging | `{limit, cursor}` in, `{next_cursor, total}` out. Grid `products.list` may ask `limit` up to 5000. |
| Sorting/filtering | Server side. The UI never sorts large sets itself except what it already holds. |
| Unknown input keys | Rejected with `VALIDATION` (fields list). |
| Strings | UTF-8, trimmed, max 200 (notes 1000). Bangla and English both fine. |
| Manager redaction | Fields marked OWNER ONLY are **absent** for manager (not null, not 0). See section 6. |
| Names | `namespace.action`, camelCase action. |
| Optional | `T?` means may be omitted/null. |

## 3. Roles

Two roles: `owner`, `manager`. Backend enforces everything. UI hiding is cosmetic.

| Capability | Owner | Manager |
|---|---|---|
| Sell, receive payments, add expenses | yes | yes |
| Request a return | applies at once | pending until owner approves (setting) |
| Cancel an invoice | yes, reason | yes, reason, **always flagged** (+ owner approval if setting on) |
| Edit a saved invoice or payment | never | never |
| Reverse a payment | yes (owner PIN + reason) | no |
| Edit price, stock, caps, products | yes, only in edit mode | no |
| See cost, margin, profit, company due, commission | yes | **no** (absent in responses) |
| Discount over the product cap or below min price | yes | needs owner approval token |
| Purchases, company payments, employees, commission, audit, backup, settings, export | yes | no |
| Stock count | can view differences | can submit counts, cannot fix stock |
| Language / theme / calculator / games | own prefs | own prefs (games can be switched off for manager by owner) |

### Owner approval token

Manager actions that need the owner are done in two calls, so the owner PIN never lingers in the UI:

1. `auth.requestApproval { owner_pin, scope }` returns `{ token, expires_at }`. Token: single use, 2 minutes, bound to the scope and to the logged-in user.
2. The real call carries `approval: { token, reason }`.

Without a valid token the real call fails with `NEEDS_OWNER_PIN` and `details.reason_kind`. The owner can also act directly; for sensitive scopes the owner is asked to re-type the PIN (`cancel_invoice`, `reverse_payment`, `restore_backup`, `edit_mode`).

## 4. Calculations (backend only; UI never computes)

### 4.1 Units

- `carton_pcs`: `qty_base` = pcs. `unit_base` = `pcs_per_carton`. `list_price` is per carton.
- `by_kg`: `qty_base` = grams. `unit_base` = 1000. `list_price` is per kg.
- Entry "5 cartons 3 pcs" = `5 * pcs_per_carton + 3` pcs.
- Display weight: if `grams_per_carton` known, `kg = qty_base / pcs_per_carton * grams_per_carton / 1000` (carton products), shown next to cartons, e.g. "2 কার্টন · 24 kg".
- CSV `Size` = kg per carton, parsed as a decimal string to integer grams (`"9.6"` → 9600, `"4.464"` → 4464). Never through float.

### 4.2 Line amount (one rounding rule everywhere)

```
gross = round_half_up( qty_base * list_price / unit_base )     // once per line
```

Same function for invoices, returns, reports, commission. Rounding happens once per line, never per unit. Vectors: `fixtures/rounding_vectors.json`.

### 4.3 Line discount

`DiscountIn { type, value }`:

| type | value | amount |
|---|---|---|
| `none` | 0 | 0 |
| `per_unit` | paisa per carton (or per kg for `by_kg`) | `round_half_up(value * qty_base / unit_base)` |
| `percent` | basis points (250 = 2.5%) | `round_half_up(gross * value / 10000)` |
| `line` | paisa for the whole line | `value` |

- Discount can be different on every line of one invoice (that is the whole point: 4 lines discounted, 6 not).
- `amount` may never exceed `gross` → `DISCOUNT_LIMIT` (not overridable).
- Stored per line: `list_price`, `discount_type`, `discount_input`, `discount_paisa`, `final_price` (net line), `cost_snapshot`. Never recomputed after save.
- Optional invoice-level discount (`percent` or `amount`) is stored separately and shown on its own line. It is included in the dashboard discount totals, tagged `invoice_level`.

### 4.4 Cap check (normalised)

Everything is compared as **discount per unit (per carton, or per kg)** in paisa:

```
per_unit_equiv = round_half_up( amount * unit_base / qty_base )
over_cap       = per_unit_equiv > product.max_discount.per_unit
below_min      = (gross - amount) * unit_base / qty_base < product.min_sell_price   // per carton / per kg
```

`max_discount.percent_bp` (optional) is converted to a per-unit amount at list price and the **smaller** limit wins. If `over_cap` or `below_min` on any line and no valid `approval` → `NEEDS_OWNER_PIN` with `details.lines`. With approval: save, write `discount_overrides` and a flagged audit row (user, approver, reason, requested vs allowed).

### 4.5 Stock lots, FEFO

- Every purchase line, stock adjustment (+), and approved good return creates or refills a lot.
- Sale deduction order: lots with `expiry_date` first, soonest expiry first (**FEFO**); then lots without expiry by `received_date` (**FIFO**). Expired lots (`expiry < today`) are never auto-picked; a sale that can only be filled from expired stock fails `STOCK` with `details.expired:true`.
- Each deduction is stored in `sale_item_lots` (lot, qty). Cost of a line = sum over lots of `qty * lot.unit_cost` (same rounding rule). That is the profit basis.
- `products.stock` = sum of lot `qty_remaining`. There is **no** editable stock column.
- Cancel / approved return puts quantity **back into the same lots** it came from.
- Month views: `lots.list { group_by: received_month | expiry_month }` returns received vs remaining per month.

### 4.6 Credit limit

`credit.mode`: `warn` (default) shows `credit_state: warn` and allows; `block` returns `CREDIT_LIMIT` unless `approval`.

### 4.7 Payments received (customer side)

- A payment is **append-only**. Never edited, never deleted. Fixing a mistake = `payments.reverse` (owner), which writes a reversing ledger row, re-opens the allocated invoices, and keeps the original visible as `reversed`.
- Allocation modes: `auto_oldest` (default: opening due first, then oldest unpaid invoice), `manual` (explicit items), `on_account` (owner only; amount above due is held as customer credit).
- `amount > due` and mode is not `on_account` → `VALIDATION`.
- Cheque: creates a `pending` cheque row. `cleared` is informational. `bounced` reverses the payment automatically (flagged).
- Methods: `cash | bkash | nagad | bank | cheque`. `ref` holds bKash/Nagad trx id or bank reference.
- Customer **due** is never stored; it is `sum(debit) - sum(credit)` over `ledger_entries` (customer: debit = owes more). Company due uses the opposite sign (credit = we owe more); see the sign note at the end of `backend/schema.sql`.
- Money paid to companies is `payments.payCompany` (owner only), reduces company due, optionally allocated to purchases.
- `cash.expected` = cash payments received (not reversed) - cash expenses of the day. Other methods are shown separately.

### 4.8 Commission (company pays MM Traders for tea kg sold)

- Basis: **net grams sold** in the period = grams on completed sale lines of in-scope `by_kg` products − approved returns − cancelled sales. Period: month (default), quarter, year.
- `per_kg`: `round_half_up(net_g * rate / 1000)`.
- `slab` (marginal): each gram is paid at the rate of the band it falls in. Per band `round_half_up(grams_in_band * rate_per_kg / 1000)`. Example in `fixtures/commission.status.json` (the 4/6/8 rates are **sample data** only; real rates are set by the owner).
- On period end the backend writes an accrual row (`due`). `markReceived` records it and (setting) offsets company due.
- Owner only. Absent for manager everywhere (dashboard, products, settings, errors must not leak it).

### 4.9 Load sheet and cash close

- `expected_in_van = loaded - sold + returned_good_today`; `diff = counted - expected`; shortage value at **list price** (what it would have sold for). Negative diff is flagged and shown red.
- `cash.close`: `difference = counted - expected_cash`, flagged when non-zero. One close per date; owner can re-open (audit).

## 5. Audit log

- Append-only table, no UPDATE/DELETE path in code, and SQLite triggers `RAISE(ABORT)` on UPDATE/DELETE of `audit_log` as a second wall.
- `hash = sha256( prev_hash || canonical_json({id, ts, user_id, action, entity, entity_id, old, new, reason}) )`. First row's `prev_hash` = 64 zeros. `audit.verify` walks the chain.
- Flagged (`flag:true`, with `flag_kind`) automatically for: discount over cap/below min (approved), invoice cancel, return create/approve, stock adjust, stock-count difference, load-sheet shortage, cash difference, edit mode on after 21:00-06:00, system clock moved backwards, payment reverse, bounced cheque, backup restore, license reveal, PIN reset.
- Every state-changing method in `methods.json` has an `audit` note. A state change without an audit row is a bug (contract test).

## 6. Manager redaction (hard rule)

Applied in the **service layer** by a single `redactFor(role, methodName, payload)` function plus per-method allow-lists, covered by a test that calls every read method as manager and asserts these keys never appear anywhere in the JSON: `cost_price, unit_cost, margin_bp, profit, stock_value, min_sell_price, company due, commission*, opening_due of companies, salary, advance`.

Also: the manager must not be able to infer owner-only values through filters or sorting (`products.list sort by margin` → `FORBIDDEN`).

## 7. Settings and prefs

- `settings.*` shop-wide, owner writes. Manager reads only public keys (`business.*`, `invoice.*`, `language default`, `games.manager_enabled`).
- `prefs.*` per user. Language (`bn|en`), theme (`light|dark|system`), numerals (`latin|bengali`), default invoice size/language, calculator state, game best scores.
- Language and theme are applied by the UI instantly; the backend only stores them. All backend text meant for display (invoice labels, reminder text) is returned in both languages `{bn, en}` or as data + keys; the backend does not pick the language.

## 8. Files, printing, sharing

- Renderer draws invoices/receipts/statements (HTML → canvas/PDF) from `invoice.data` / `payments.receipt` / `customers.statement`, with bundled fonts (Tiro Bangla, Montserrat).
- `files.saveBytes` writes into `Documents\PetraDMS\Invoices\YYYY-MM\` (or a Save dialog). `files.share` selects the file in Explorer for WhatsApp Web drag-drop.
- `printer.*` is reserved. Until printer adapters exist both return empty/`UNSUPPORTED`. Adapter interface (future): `render(png) → bytes → adapter.send(bytes)`; the invoice design never changes per printer.

## 9. Versioning and CI

- `contract_version` in `methods.json` is semver. Breaking change = major. New method or optional field = minor.
- Backend CI: for every method, one test that sends valid input, one invalid, one wrong-role, and asserts the output shape against `types.json`/`methods.json`.
- Frontend CI: mock adapter implements the same `methods.json` and passes the same shape checks, so UI tests run without backend.
- The mock adapter is allowed to return fixtures; the backend must return the **same shape**.

## 10. Data the backend owns that the UI must never compute

Totals, discounts, per-unit equivalents, cap checks, FEFO picks, balances, aging, profit, commission, shortage values, invoice/receipt numbers, tax/VAT (none in v1), stock status (`ok|low|out|near_expiry`), day book, flags.

## OPEN_QUESTIONS (contract level)

1. Real `pcs_per_carton` for every product (CSV has none). Importer marks `assumed.pcs_per_carton = true` until the owner fills it.
2. Is CSV `Value` the sale price or the cost? Demo assumes sale price and cost = 94% (flagged `assumed.cost_price`).
3. Tea carton weight: demo assumes 20 kg per carton. Needs the real number or "tea is sold loose by kg only".
4. Real commission rule from the company (scope, period, rate or slab, settle in cash or against due).
5. Does the manager's invoice cancel need owner approval by default? (setting `cancel.manager_needs_approval`, default on)
6. Credit limit: warn or block by default? (default warn)
7. VAT/mushak format needed? (none in v1)
8. Do salesmen collect money in the field (then payments need a `collected_by` employee and a hand-over step)?
9. Number of vans, one load sheet per van?
10. Opening balances: bring old customer dues in via import?
