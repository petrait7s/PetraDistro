# Known gaps — explicit partial handoff

This is a backend development handoff, **not production-ready software**. No UI implementation is included. Incomplete externally callable features fail with UNSUPPORTED rather than return invented success.

## Priority 1: M1 / compatibility and security

- Desktop boundary preserves the original 104 v0.1 input definitions. The internal engine was already built against the earlier authorized v0.2 corrections. `src/transport/compat.js` validates the legacy request before forwarding. Additional methods retain v0.2 inputs. Output shapes use corrected v0.2 types, not exact v0.1 shapes; integration is required.
- Legacy `auth.requestApproval {owner_pin,scope}` returns UNSUPPORTED: it cannot satisfy payload-bound approval without operation/payload. Direct internal engine callers use the v0.2 approval protocol. Consequently desktop cancellation/reversal/restore flows needing fresh approvals are not usable yet. Legacy `editmode.enable {owner_pin}` is safely translated internally.
- `auth.login` deliberately does not return the legacy session token or commission feature flag. Session metadata only.
- Release license secret must be provided at build time. No test activation code is shipped. OS-protected license encryption/reveal is not wired; `license.reveal` returns UNSUPPORTED.
- Idle locking occurs at API-call boundaries, not a background event timer. Push events and background clock checks are not implemented. No log rotation implementation.
- `users.list` legacy shorthand infers untyped id as string in its generated schema; this must be corrected before relying on that output in desktop dialog authorization.
- Auth/preferences idempotency is in-memory; business write idempotency is durable in the internal v0.2 engine. Legacy methods do not accept request_id. Review session invalidation and file handle lifetime before release.
- SQL guards protect many important cores but do not make an untrusted local Windows user unable to alter files. Audit is tamper-evident within the database, not externally anchored.

## Priority 2: M3 sales / returns

- Manager cancellation's later-payment detection currently compares timestamps. Equal-timestamp receipts need an explicit sale-origin payment link before release.
- Returns/cancellation touching a closed commission period return UNSUPPORTED; next-open-period adjustment posting is not complete.
- Reversing a good return can be blocked if original-lot remaining quantity is insufficient. Out-of-order return-reversal rounding requires more verification.
- Cost uses conserved integer lot carrying amounts with saved per-pick costs. Expanded historical/unit-change regression coverage is still needed.
- Historical tax/VAT is intentionally outside v1.

## Priority 3: M4 accounting

- Reversing payments after customer credit applications returns STATE; a credit-application reversal method and exact funding provenance are still required.
- Payment reversal currently posts an opposite cash movement on the open day. Distinguishing a bookkeeping-only correction from physical cash repayment remains unresolved in implementation; use only test data.
- Customer statement and receipt identity/balance snapshots are not completely immutable across later master-data changes.
- Expense reversal works for independent expenses; linked payroll corrections use employees.reverse. Payroll correction paths lack complete scenario coverage.
- Cash expected is daily net movement, with zero opening cash. Opening drawer cash/carry-forward and field handovers are not implemented.
- Van is restricted to van1. Load sheets reconcile but do not implement stock transfer locations/reservations.
- customer opening_due in customers.save is rejected in favor of opening.import; companies.save with opening_due is UNSUPPORTED at legacy boundary. Opening CSV file-to-ledger mapping is not implemented; opening.import accepts structured rows.

## M2 remaining

- export.table returns UNSUPPORTED. ExcelJS is installed but the export adapter is not finished.
- Import is preview/commit with file bounds, exact numeric strings and XLSX preflight. More adversarial tests and bounded streaming behavior are needed. Missing supplier/price/carton setup is not guessed.
- Grid Ctrl+Z is an inverse edit, without a stale-write revision guard; negative quantities and cross-field validation require further review.
- Product listing currently calculates many per-product queries. See benchmark evidence; large-grid performance is not release-approved.

## M5 remaining

- No production commission rules seeded. Current-period marginal calculation works; period closer exists but is not scheduled automatically. Late adjustments are guarded as UNSUPPORTED.
- Commission overlap rules, rule-version transitions, negative-net carryforward, and frozen per-product closed-period details remain incomplete.
- dashboard.productChart returns UNSUPPORTED. dashboard.series rejects profit and some unsupported filter combinations with UNSUPPORTED. Summary/report semantics across backdated cancellations need reconciliation coverage.

## M6 remaining

- backup.create/list/import verify local snapshots. backup.restore returns UNSUPPORTED: external journal, safety backup, audit continuity and crash-safe swap coordinator are not complete.
- Automatic backup schedule, retention, backup-on-quit, Drive OAuth/upload/retry queue are not implemented. drive.connect/disconnect/uploadNow return UNSUPPORTED; drive.status reports disconnected.
- files.saveBytes returns UNSUPPORTED without native save broker; desktop broker is not implemented. Legacy files.share returns UNSUPPORTED. Printers intentionally return no adapters/UNSUPPORTED.
- Windows workflow, NSIS/per-user configuration and portable target supplied; **no Windows build or installation was run**. No installer EXE is included.
- Electron launch, Windows DPAPI, printer integration, live Google OAuth, network recovery and full GUI integration were not tested.

## M7 remaining

- Real logs are in evidence/. Only recorded executions count as verification. No claim that all 24 acceptance items pass.
- Frontend-owned PDF fonts, language/theme presentation, calculator and games are not implemented/tested by this backend.
- Complete valid/invalid/wrong-role scenarios for every method are not yet present; schema compilation/registry tests are not a substitute.
- Contract fixtures have complete engine responses plus unchanged legacy calculation vectors. Fixture state builder contains test-only prices/costs; never ship those as production seed assumptions.

## Integration layer (frontend merge, 2026-11-06)

- `auth.requestApproval` now accepts `{owner_pin, scope, operation, payload}` at the desktop boundary and forwards a payload-bound approval to the engine; the UI sends the method and arguments it is about to retry. Scope-only calls still return UNSUPPORTED.
- Desktop adapter strips undefined keys (structured clone keeps them), `users.list` ids are strings, `files.saveBytes` saves into `Documents/PetraDMS/Files`, `files.share` opens the folder with the file selected, `export.table` writes csv/xlsx there.
- The UI hides cost/profit for manager; the backend omits them. The UI calls `employees.list` only as owner.
- products.list no longer runs 30 queries per product and computes details only for the returned page (5,000 products: about 0.6 s instead of 34 s in the Linux benchmark). Windows timing not measured.
- products.save keeps is_tea and group_id on update (they were reset before).
- Backup is taken on quit; in-app backup.restore is still UNSUPPORTED, use tools/restore-backup.js with the app closed.

## 1.4.0
- One van only ("van1"). Several vans need a vans table.
- The browser mock backend (renderer/api/mock) does not know `retail_price`, `price_type`, `loadsheet.list`, the `van` filter or the new purchase line fields. The real app is not affected.
- Van report is a CSV file (Documents/PetraDMS/Files), not a printable PDF.
- Wholesale/retail is chosen per invoice, not by customer type.

## 1.5.0
- The frameless window and title-bar buttons were checked in Chrome with a stubbed bridge, not in Electron on Windows. Drag, double-click to maximise, snap and resize edges need a check on the real exe.
- Seeded products: 8 items have no pcs per carton (cups, Masala Tea, Coffee Pouch 25 pcs, Shah products) and 25 have no company (SS milk, T tea, PD/RD, DCTB, Bag-in-Bag, Green Tea, Shah Noodles 1 pc); the first purchase assigns the purchase company. Shah Noodles 1 pc has no price. Fill the rest on the first purchase or in Products & stock. Loose tea (19 items, carton weight 1.0 in the list) is set up as sold by kg with the list value as price per kg.
- Changing pcs per carton after stock exists is blocked (stock is stored in pieces).
