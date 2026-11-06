# Contract changelog

## 0.2.0 — 2026-11-06

Partial implementation, not a production release. These are the actual changes shipped. The earlier review text identifying B1–B27 was not recovered in this workspace, so this list must not be treated as a verified one-to-one resolution of those original review IDs. Remaining defects are explicit in KNOWN_GAPS.md and STATUS.md.

1. Executable JSON schemas added to method registry: bounds, enums, nullable fields and bounded arrays; internal and desktop boundaries are explicitly separated.
2. Shared types and machine-readable error details generated; existing error envelope retained.
3. Settings and event definitions added; event producers remain incomplete.
4. Login returns session metadata only; no renderer session token or commission feature flag.
5. Optional request_id UUID supported by internal mutating methods; legacy desktop inputs do not expose it (gap).
6. Action/role/approval matrix added; internal approvals bind operation and canonical payload. Legacy scope-only route is UNSUPPORTED.
7. Saved sale lines expose sale_item_id; preview lines need not have persisted identifiers.
8. Manager output omits cost, profit, margin, minimum-price and commission fields; approval signal is boolean.
9. Production imports mark missing values needs_setup; no 94% cost or tea-carton assumption is seeded.
10. Product setup issues, nullable unknown price and original_name are represented.
11. Invoice discount is owner-only and allocated deterministically in paisa; combined discount enforcement applies.
12. Quantity parsing and all monetary calculations use exact integer/rational arithmetic; display kg remains a decimal string.
13. Cancellation preserves existing receipts and creates credit; cash refund is a separate action.
14. Manager invoice/receipt visibility is scoped to own records in the three-day window; cancellation has additional checks.
15. payments.refund and payments.applyCredit added; credit application reversal remains missing.
16. customers.ledger open_items adds sale_id and opening discriminator.
17. opening.import added for structured cutover balances; Lite migration intentionally excluded.
18. Expense and employee payment methods added internally; expenses.reverse and employees.reverse added.
19. cash.preview and cash.reopen added; reopening preserves revision history. Opening drawer carry-forward remains missing.
20. returns.preview and returns.reverse added; immutable line references and cumulative refund allocation used.
21. purchases.preview added with immutable purchase cancellation history.
22. products.aggregate, groups.list and groups.save added.
23. loadsheet.reopen added; location transfer/reservation semantics remain incomplete.
24. Commission bands expose exact grams_in_band; no production rules seeded; late closed-period adjustment remains UNSUPPORTED.
25. backup.import added for external snapshots; actual restore coordinator and Drive are unfinished.
26. Original fixtures retained as separate calculation vectors; full response fixtures generated for the supplied examples.
27. Generator, readable method catalogue, integration notes, permission matrix and test evidence included; Windows release verification remains outstanding.
