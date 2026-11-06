# PetraDMS frontend: status (Stage 2: all screens done)

Contract version in use: 0.1.0 (copy in `contract/`). Astra's v0.2.0 changes go in `renderer/api/` only.

## What works now

Open `renderer/index.html` in Chrome (or later inside Electron). No build step, no internet needed, fonts are bundled.
It runs on a **mock backend** that follows the contract (same envelopes, roles, error codes). Data lives in the browser's localStorage for the mock only.

Test data: any license code shaped like `PETRA-XXXX-XXXX-XXXX` is accepted (use `PETRA-MMTR-2026-DEMO`). You choose the owner and manager PINs in setup.

- First run: license code, business setup (two different PINs), login (owner or manager), "forgot owner PIN" reset with the license code, PIN throttle (5 wrong tries, wait 30 s), idle lock and manual lock with PIN.
- Shell: sidebar (owner sees 14 screens, manager sees 12: no audit log, no company commission), top bar, status bar.
- Top bar, right side: Calculator (F8), Games (F9), Bangla | EN switch, theme button (light, dark, system).
- Calculator: floating, draggable, exact decimals (0.1 + 0.2 = 0.3), % like a shop calculator, memory MC/MR/M+/M-, history of 20, keyboard, **Insert** into the last focused number field, helper rows (discount and carton), position, history and memory saved with the user's preferences.
- Games: 2048, Snake, Memory match, Block puzzle. Best scores saved. Auto-pause when the window loses focus, a dialog opens, the screen locks, or the games window closes. No timer runs while paused or closed.
- Owner can switch off the calculator, the games, or games for the manager (Settings).
- Settings: language, theme, numerals (1,23,456 or ১,২৩,৪৫৬), default invoice size and language, change my PIN, shop name, idle lock minutes.
- Language: every text goes through `PD.t()`. Bangla and English key sets are identical (tested).
- Stage 2 added every remaining screen: dashboard, new sale (live preview, per-line discount, owner-approval flow, F2 save) and invoice list, payments (receive, history, day book, cheques, company payments), returns, load sheet, cash close, expenses and staff, inventory grid (keyboard, copy/paste, fill-down, undo, owner edit mode with PIN, staged changes, dry-run review, change log, import wizard), lots and expiry, purchases and companies, customers and ledger, company commission, audit log, backups, Google Drive, license reveal.
- Invoice, receipt and statement renderer: 58 mm, 80 mm, A4; PNG and PDF export; share via `files.share`. Printer calls return UNSUPPORTED from the backend until Astra provides them.
- Mock backend is now complete (`renderer/api/mock/h-*.js`): FEFO lots, caps plus approval tokens, payment allocation oldest-first, returns, commission slabs, hash-chain audit.

## Tests

`npm i` then `npm test` (needs `jsdom`). 324 checks: translation parity and used/undefined keys, calculator, games, mock business rules (rounding, FEFO, caps, approval, allocation, reversal, returns, commission, audit chain, roles), every screen for both roles in both languages with no page errors and no missing keys, sale to invoice to PDF flow, manager restrictions.

## Folder map

- `contract/`: backend contract copy. `tools/sync-contract.js` regenerates `renderer/api/contract.js` (method names, who may call, input keys).
- `renderer/api/client.js`: the only place that talks to a backend. Uses `window.api` (Electron preload) if present, else the mock. `PD.rpc()` returns data or throws `{code, message, details}`.
- `renderer/api/mock/`: mock engine and handlers. Add handlers per stage.
- `renderer/app/`: core helpers (formatting, icons), theme, session (lock), shell (screens, navigation).
- `renderer/widgets/`: toast, modal (confirm, ask, owner approval), floating window, calculator, games.
- `renderer/views/`: screens. `renderer/i18n/`: Bangla and English text.

## Rules the code follows

No business arithmetic in the UI (money and quantities come from the backend as integers or `Qty` objects; the calculator and game scores are the only exceptions). No browser `alert` or `confirm`. Manager-only hidden values are omitted by the backend, never blanked by the UI.

## For Astra / contract 0.2.0 (ask)

- `customers.ledger` open_items should include `sale_id` and `opening` (UI uses them).
- Approval scope for over-cap discounts is `discount_override`; sensitive scopes: cancel_invoice, reverse_payment, restore_backup, edit_mode, license_reveal.
- Money is integer paisa, quantities base units; the UI does no business arithmetic.

## Next stage

Merge Astra's backend: apply `CHANGELOG.md` and `FRONTEND_INTEGRATION.md` of contract 0.2.0 inside `renderer/api/` only, then rerun `npm test` against the real backend. Open owner questions: see `docs/QUESTIONS_FOR_OWNER.md`.
