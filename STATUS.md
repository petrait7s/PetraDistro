# PetraDMS backend status — partial delivery

**Not production-ready.** The source includes working internal business APIs and an unfinished desktop integration. No Windows executable or UI implementation is included. Nothing in this file claims all M1–M7 complete.

## Actual executions

- `node --test PetraDMS_Backend_v1/tests/*.test.js`: **12 passed, 0 failed**, 20.145 seconds. Exact output: evidence/tests.txt. Covers schema compilation/registry, supplied fixtures, 10,000 money properties, roles/idempotency, payload approvals, reachable manager redaction, 100 FEFO cycles, partial returns, closed-day cash, DB guards/audit, actual child-process kills at four persistence boundaries and a financial smoke flow.
- Fixture generator executed successfully and checked the supplied arithmetic. Example totals: gross 7182600, discount 60976, net 7121624; received12000000, prior16493000, remaining4493000; commission984kg /607200. Full fixture suite passes in tests.txt.
- Syntax checker was run: `Syntax failures: 0`. This is a reported execution, not a separately preserved raw log.
- Benchmark executed on Linux Node24.22.1 with 5,000 products and50,000 lines, database10,674,176bytes. Products page34479ms, dashboard922ms, durable sale176ms. **150ms gate FAILED**. Raw output: evidence/benchmark.json. This is one measurement, not Windows performance evidence.
- No Windows build/install, Electron GUI launch, live Google OAuth, printer, full frontend integration or complete acceptance1–24 suite was run. See tests/ACCEPTANCE.md.

## Milestones

| Milestone | DONE with evidence | PARTIAL | NOT DONE / why |
|---|---|---|---|
| M1 skeleton/security/contract | Internal executable schemas, migrations, license/setup/login, roles, payload approvals, audit and business idempotency; core tests pass | Desktop legacy adapter and release workflow | Scope-only legacy approvals unavailable; users.list schema defect; events/DPAPI/release validation; exact original B1–B27 reconciliation unavailable |
| M2 products/import/stock | Products/setup, lots, purchases, integer cost conservation; FEFO/guards pass | Import preview/commit and grid present | Export adapter, adversarial import suite, grid revisions and acceptable large-list performance |
| M3 sales/returns | Exact preview/create, partial return, original-lot cancellation and customer credit; fixtures/smoke/property tests pass | Manager cancellation timestamp edge and history regression coverage | Late closed-commission adjustment posting; desktop approval integration |
| M4 accounting | Customer ledger identities, receipts/allocation, refund, expenses, cash revisions; payment fixture/cash/smoke pass | Cheques, supplier payments, employees and load sheets have limited scenario evidence | Credit-application reversal, drawer opening/carry-forward, immutable printed snapshots and full correction acceptance |
| M5 reports/commission | Current-period commission fixture and dashboard backend | Limited report filters and close behavior | Late adjustments, product chart, closed-period history/version regression suite |
| M6 backup/release | Local backup create/list/import source; Electron main/preload and Windows NSIS/portable workflow supplied | Native file brokers, release packaging | Restore coordinator, Drive, scheduled backups, quit backup, Windows installation verification; unavailable/unimplemented |
| M7 validation | 12 actual tests and full-size benchmark logs supplied | Coverage matrix for acceptance1–24 | Complete acceptance API scenarios and frontend visual/printing checks; performance gate failed |

## Exact continuation order

1. **M1:** reconcile original review B1–B27 when available; fix users.list id schema and native-dialog authorization; settle legacy desktop versus payload-bound approvals/request_id; exercise every desktop adapter input/output and redaction error/event path. Complete main-process events, license protected storage and release secret boundary validation.
2. **M3:** add explicit sale-origin payment links for cancellation eligibility; complete closed-period commission adjustment posting before enabling affected returns/cancellations; verify out-of-order reversals and historical cost/quantity invariants.
3. **M4:** implement credit-application reversal/funding provenance, drawer opening/carry-forward, immutable statement/receipt snapshots; settle physical versus bookkeeping cash reversal and test all payroll/cheque corrections.
4. **M2:** replace per-product N+1 computations with bounded aggregate queries; rerun benchmark after that change. Finish export adapter, import adversarial coverage and stale-grid-write guards.
5. **M5:** implement late adjustment periods, rule versions/carryforward and report historical semantics; complete productChart.
6. **M6:** finish crash-safe restore/journal and native file brokers; implement Drive queue/OAuth and backup schedule/retention; run Windows build and offline fresh-install/portable checks.
7. **M7:** author and run all24 API acceptance scenarios, exhaustive method valid/invalid/wrong-role fixtures and frontend integration checks with Claude. Retain raw logs and mark each result honestly.

Unimplemented routes return UNSUPPORTED where explicitly guarded; this does not make untested implemented routes production-safe. KNOWN_GAPS.md gives detailed limitations. Dependencies are locked; node_modules is intentionally excluded. No production seed guesses or test activation bypass is included in the packaged release file allowlist.
