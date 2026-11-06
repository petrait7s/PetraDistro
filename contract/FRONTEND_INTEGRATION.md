# Frontend integration — v0.2.0

The latest instruction restored v0.1 method names/input keys at the **desktop boundary**. The earlier approved implementation already used v0.2 corrections; the adapter is explicit and unfinished flows fail UNSUPPORTED. Do not connect to production data. See KNOWN_GAPS.md.

| Area | Before | Current |
|---|---|---|
| Envelope | `{ok:true,data}` / `{ok:false,code,message,details?}` | Same |
| Existing method inputs | contract v0.1.0 | Preserved by outer validator; internal-only newer keys are rejected |
| Login | `session:{token,lock_after_sec}` | `session:{lock_after_sec,locked}`; no token; no features.commission |
| Public settings | `business_name`, language/theme/features | Explicit `business.name`, `business.address`, `business.phone`, game/calculator booleans; prefs contain language/theme |
| Approval | `{owner_pin,scope}` | Desktop legacy route UNSUPPORTED; internal engine requires `{owner_pin,operation,payload}` and binds single-use token to canonical payload |
| Edit mode | `{owner_pin}` | Same desktop input; safely translated to a payload-bound internal approval |
| Sale line | No persisted item ID | `sale_item_id` on saved lines; `sku`, `qty_base`, `unit_base`, `invoice_discount_share`, `refundable_net`, `returned_base`, `needs_approval` added |
| Manager sale data | `below_min_price`, numeric minimum risk | Private cost/profit/minimum and private booleans removed; needs_approval remains |
| Product setup | Assumed production values | `needs_setup`, `setup_issues`; unknown price nullable; no guessed cost/carton counts |
| Invoice discount | Both roles implied | Owner only; deterministically allocated across lines and included in caps |
| Customer ledger | `open_items:[{ref,date,left}]` | `open_items:[{sale_id:null or integer,opening:boolean,ref,date,left}]` |
| Returns | `refund:'cash'` could bundle payout | Use ledger return, then separate owner payments.refund; bundled cash return rejected |
| Cancellation | At-sale payment reversal | Preserve receipt; invoice cancellation creates customer credit; explicit refund separate |
| File saving/sharing | returned path then path input | Native adapter incomplete; returns UNSUPPORTED. Internal design uses opaque handles |
| Units | Qty | Still Qty with exact kg string and bn/en text; zero remainder omitted from display text |
| Commission bands | kg_in_band | Both kg_in_band and grams_in_band; exact paisa amount |
| Mutating retries | No request_id | Internal v0.2 supports optional UUID request_id; legacy desktop original inputs do not |

Added methods: cash.reopen, cash.preview, returns.preview, purchases.preview, payments.refund, payments.applyCredit, expenses.reverse, returns.reverse, employees.reverse, backup.import, opening.import, products.aggregate, loadsheet.reopen, groups.save, groups.list. These have generated executable schemas in methods.json. Addition does not imply completion; use KNOWN_GAPS.md.

Generate with `python tools/gen_contract.py`. `contract/runtime-0.2/` is the internal-engine schema; `contract/methods.json` is the desktop request boundary. Tests currently concentrate on the internal engine. Do not bypass the desktop adapter in renderer code. No business arithmetic should be copied from the demo.

Drop bundled frontend output into app/renderer. Use only window.api.call and window.api.on. No Node, network or filesystem access is exposed. CSP must remain local-only. Event subscription API exists; event producers remain a known gap.
