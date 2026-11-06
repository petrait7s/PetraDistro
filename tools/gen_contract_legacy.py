#!/usr/bin/env python3
"""Generates contract/methods.json, contract/errors.json, contract/types.json and contract/METHODS.md.
Edit THIS file to change the contract, bump CONTRACT_VERSION, regenerate."""
import json, os, sys
CONTRACT_VERSION = "0.1.0"
OUT = sys.argv[1] if len(sys.argv) > 1 else "."

TYPES = {
 "_notation": "Leaf types: int, string, bool, money (int paisa), date (YYYY-MM-DD, business date), ts (ISO-8601 UTC), id (int). enum(a|b). 'T?' optional/nullable. '[T]' array. Names starting with a capital letter refer to this table. Anything else is an object literal.",
 "Page": {"limit": "int?", "cursor": "string?"},
 "PageOut": {"next_cursor": "string?", "total": "int"},
 "Qty": {"base": "int  (pcs for carton_pcs products, grams for by_kg)", "unit": "enum(pcs|g)", "cartons": "int", "pcs": "int  (remainder pcs; 0 for by_kg)", "kg": "string?  (decimal, 3 places; total weight, by_kg or when grams_per_carton known)", "text": {"bn": "string", "en": "string"}},
 "QtyIn": {"cartons": "int?", "pcs": "int?", "kg": "string?  (decimal string up to 3 places, only for by_kg products; backend parses exactly, UI never uses float)"},
 "DiscountIn": {"type": "enum(none|per_unit|percent|line)", "value": "int  (per_unit: paisa per carton or per kg; percent: basis points, 250 = 2.5%; line: paisa for the whole line)"},
 "Approval": {"token": "string  (from auth.requestApproval, single use)", "reason": "string"},
 "User": {"id": "id", "name": "string", "role": "enum(owner|manager)"},
 "Company": {"id": "id", "name": "string", "phone": "string?", "due": "money?  (owner only)"},
 "Product": {
   "id": "id", "sku": "string", "company_id": "id?", "company_name": "string?", "name": "string", "original_name": "string?",
   "sell_mode": "enum(carton_pcs|by_kg)", "pcs_per_carton": "int?", "pcs_per_dozen": "int?", "grams_per_carton": "int?",
   "list_price": "money  (per carton for carton_pcs, per kg for by_kg)",
   "cost_price": "money?  (OWNER ONLY, omitted for manager)", "margin_bp": "int?  (OWNER ONLY)",
   "max_discount": {"per_unit": "money", "percent_bp": "int?"},
   "min_sell_price": "money?  (OWNER ONLY)", "min_stock": "Qty?",
   "stock": "Qty", "stock_value": "money?  (OWNER ONLY, at lot cost)",
   "status": "enum(ok|low|out|near_expiry)", "next_expiry": "date?", "trend30": "[int]  (daily sold, base units, oldest first)",
   "assumed": {"pcs_per_carton": "bool", "cost_price": "bool"}, "active": "bool"},
 "Lot": {"id": "id", "product_id": "id", "purchase_id": "id?", "received_date": "date", "expiry_date": "date?", "received": "Qty", "remaining": "Qty", "unit_cost": "money?  (OWNER ONLY)", "days_to_expiry": "int?"},
 "CustomerRow": {"id": "id", "name": "string", "owner": "string?", "phone": "string?", "area": "string?", "route": "string?", "credit_limit": "money?", "due": "money", "last_payment_date": "date?", "days_since_payment": "int?", "limit_used_bp": "int?"},
 "LedgerRow": {"date": "date", "ts": "ts", "kind": "enum(opening|sale|payment|return|refund|cancel|reversal)", "ref": "string", "ref_id": "id?", "debit": "money", "credit": "money", "balance": "money"},
 "SaleLineIn": {"product_id": "id", "qty": "QtyIn", "discount": "DiscountIn?"},
 "SaleLine": {"line_no": "int", "product_id": "id", "name": "string", "qty": "Qty", "list_price": "money", "gross": "money", "discount": {"type": "string", "input": "int", "amount": "money", "per_unit": "money"}, "net": "money", "over_cap": "bool", "allowed_per_unit": "money", "below_min_price": "bool", "lots": "[{lot_id:id, received_date:date, expiry_date:date?, qty:Qty}]  (FEFO preview)", "cost": "money?  (OWNER ONLY)", "profit": "money?  (OWNER ONLY)"},
 "SaleTotals": {"subtotal": "money", "line_discount": "money", "invoice_discount": "money", "total": "money", "paid": "money", "due": "money", "customer_due_before": "money", "customer_due_after": "money", "credit_state": "enum(ok|warn|blocked)", "over_cap_lines": "[int]", "needs_owner_pin": "bool"},
 "Sale": {"id": "id", "invoice_no": "string", "date": "date", "ts": "ts", "customer": "{id:id,name:string}", "status": "enum(completed|cancelled)", "lines": "[SaleLine]", "totals": "SaleTotals", "created_by": "string", "salesman": "string?", "override": "{approved_by:string, reason:string}?", "cancel": "{by:string, reason:string, ts:ts}?", "print_count": "int"},
 "Payment": {"id": "id", "receipt_no": "string", "ts": "ts", "date": "date", "party_type": "enum(customer|company)", "party_id": "id", "party_name": "string", "amount": "money", "method": "enum(cash|bkash|nagad|bank|cheque)", "ref": "string?", "note": "string?", "status": "enum(active|reversed)", "created_by": "string", "allocations": "[{sale_id:id?, invoice_no:string?, opening:bool?, amount:money}]", "cheque": "{no:string, bank:string?, deposit_date:date?, status:enum(pending|cleared|bounced)}?", "reversal": "{by:string, reason:string, ts:ts}?"},
 "Invoice": {"sale": "Sale", "business": {"name": "string", "address": "string", "phone": "string", "logo": "string?  (data URI)"}, "size": "enum(58|80|a4)", "language": "enum(bn|en|both)", "is_copy": "bool", "copy_no": "int", "watermark": "enum(none|copy|cancelled)", "footer": "string?"},
 "Receipt": {"payment": "Payment", "business": "Invoice.business", "customer_due_after": "money?", "size": "enum(58|80|a4)", "is_copy": "bool"},
 "AuditRow": {"id": "id", "ts": "ts", "user": "string", "role": "string", "action": "string", "entity": "string", "entity_id": "string?", "old": "string?", "new": "string?", "reason": "string?", "flag": "bool", "flag_kind": "string?", "prev_hash": "string", "hash": "string"},
 "Prefs": {"language": "enum(bn|en)", "theme": "enum(light|dark|system)", "numerals": "enum(latin|bengali)", "invoice_size": "enum(58|80|a4)", "invoice_language": "enum(bn|en|both)", "calc": {"x": "int", "y": "int", "open": "bool", "history": "[string]", "memory": "string?"}, "games": {"enabled": "bool", "scores": "{2048:int, snake:int, memory:int, blocks:int}"}},
}

ERRORS = {
 "_envelope": {"ok": "{ok:true, data}", "err": "{ok:false, code, message, details?}", "note": "message is a short English developer message. The UI maps `code` (+ details) to Bangla/English text itself via i18n keys 'err.<CODE>'."},
 "VALIDATION": "Bad input. details.fields = [{path, rule, message}].",
 "STOCK": "Not enough stock. details.lines = [{index, product_id, requested, available}].",
 "DUPLICATE": "Unique value already exists (sku, phone, invoice no).",
 "FORBIDDEN": "Role may not call this method, or may not see/change this field. Never leaks field values.",
 "NEEDS_OWNER_PIN": "Action allowed only with an owner approval. details.reason_kind = discount_over_cap|below_min_price|cancel_invoice|reverse_payment|edit_mode|restore_backup|stock_adjust. Retry with approval:{token,reason}.",
 "DISCOUNT_LIMIT": "Discount exceeds a hard limit (e.g. more than the line total). Not overridable.",
 "LOCKED": "Session locked, edit mode off, day closed, or record locked.",
 "NOT_FOUND": "Unknown id.",
 "DB": "Database or file-system failure. details.recoverable:bool.",
 "UNAUTHENTICATED": "No session (login or unlock needed).",
 "LICENSE": "License missing/invalid. details.state = none|invalid|revoked.",
 "UNSUPPORTED": "Reserved feature not built yet (e.g. printer.print before printer adapters exist).",
 "CREDIT_LIMIT": "Customer would exceed credit limit and setting credit.mode=block. Overridable with owner approval.",
 "STATE": "Wrong state for this action (e.g. cancel an already-cancelled sale, reverse a reversed payment)."
}

def M(name, who, summary, inp=None, out=None, errs=None, manager=None, notes=None, audit=None):
    d = {"name": name, "who": who, "summary": summary, "input": inp if inp is not None else {}, "output": out if out is not None else "null"}
    d["errors"] = errs or []
    if manager: d["manager_view"] = manager
    if notes: d["notes"] = notes
    if audit: d["audit"] = audit
    return d
O, B = "owner", "both"
AUTH = ["UNAUTHENTICATED", "LOCKED"]
PG = {"limit": "int?", "cursor": "string?"}

METHODS = [
# ---------- license / setup ----------
M("license.status", "public", "Is this install activated? Called first at every start.", {}, {"state": "enum(none|active|invalid|revoked)", "business_name": "string?", "code_masked": "string?  (PETRA-MMTR-••••-••••)", "setup_done": "bool"}),
M("license.activate", "public", "First install: validate the Petra code and store it (hashed + masked copy). Offline check only.", {"code": "string  (PETRA-XXXX-XXXX-XXXX)"}, {"state": "active"}, ["VALIDATION", "LICENSE"], audit="license.activate"),
M("setup.complete", "public", "After activation: business details, owner + manager accounts. Allowed once.", {"business": {"name": "string", "address": "string?", "phone": "string?"}, "owner": {"name": "string", "pin": "string (min 4)"}, "manager": {"name": "string", "pin": "string (min 4)"}, "language": "enum(bn|en)?", "theme": "enum(light|dark|system)?"}, {"done": "bool"}, ["VALIDATION", "STATE", "LICENSE"], audit="setup.complete"),
M("license.reveal", O, "Show the full license code. Needs fresh owner approval token (scope license_reveal).", {"approval": "Approval"}, {"code": "string"}, ["NEEDS_OWNER_PIN", "FORBIDDEN"], audit="license.reveal"),
# ---------- auth ----------
M("auth.login", "public", "Login with PIN. Rate-limited: 5 wrong tries then 30 s wait (backend enforced).", {"role": "enum(owner|manager)", "pin": "string"}, {"user": "User", "session": {"token": "string", "lock_after_sec": "int"}, "prefs": "Prefs", "settings_public": "{business_name:string, language:string, theme:string, games_enabled:bool, features:{commission:bool, games:bool}}"}, ["VALIDATION", "FORBIDDEN", "LICENSE"], audit="auth.login"),
M("auth.logout", B, "End session.", {}, "null", AUTH),
M("auth.lock", B, "Lock screen now (also automatic after idle).", {}, "null", AUTH),
M("auth.unlock", B, "Unlock with PIN of the same user.", {"pin": "string"}, "null", ["FORBIDDEN"]),
M("auth.resetPin", "public", "Forgot PIN: reset the OWNER PIN using the license code. Manager PIN is then reset by owner in settings.", {"license_code": "string", "new_pin": "string"}, "null", ["VALIDATION", "LICENSE"], audit="auth.resetPin"),
M("auth.changePin", B, "Change own PIN (old PIN needed). Owner may reset manager PIN via users.setPin.", {"old_pin": "string", "new_pin": "string"}, "null", ["FORBIDDEN", "VALIDATION"], audit="auth.changePin"),
M("auth.requestApproval", B, "Manager (or owner for sensitive actions) enters OWNER PIN to obtain a single-use approval token, valid 2 minutes, bound to one scope. Pass it as `approval` to the next call.", {"owner_pin": "string", "scope": "enum(discount_override|cancel_invoice|reverse_payment|approve_return|edit_mode|stock_adjust|restore_backup|license_reveal)"}, {"token": "string", "expires_at": "ts", "scope": "string"}, ["FORBIDDEN"], audit="auth.approval"),
M("users.list", O, "Users with last login.", {}, {"rows": "[{id,name,role,last_login:ts?,active:bool}]"}),
M("users.setPin", O, "Reset another user's PIN (manager).", {"user_id": "id", "new_pin": "string"}, "null", ["NOT_FOUND", "VALIDATION"], audit="users.setPin"),
M("users.update", O, "Rename user, activate/deactivate manager.", {"user_id": "id", "name": "string?", "active": "bool?"}, "User", ["NOT_FOUND"], audit="users.update"),
# ---------- prefs / settings ----------
M("prefs.get", B, "Per-user UI preferences: language bn/en, theme light/dark/system, numerals, default invoice size, calculator state, game scores.", {}, "Prefs", AUTH),
M("prefs.set", B, "Patch own prefs (partial object; unknown keys rejected).", {"patch": "Prefs (partial)"}, "Prefs", ["VALIDATION"] + AUTH, notes="No audit rows for prefs (noise). Calculator history is capped at 20 entries, game scores store best score only."),
M("settings.get", B, "Shop settings. Manager gets only keys flagged public.", {"keys": "[string]?"}, "{[key]: any}", AUTH, manager="public keys only"),
M("settings.set", O, "Patch settings. Keys: business.*, invoice.footer, invoice.default_size, discount.require_pin_over_cap, returns.manager_needs_approval, cancel.manager_needs_approval, credit.mode(warn|block), expiry.warn_days, stock.low_default_days, lock.idle_minutes, games.enabled, games.manager_enabled, calc.enabled, commission.enabled, numerals.default.", {"patch": "{[key]: any}"}, "{[key]: any}", ["VALIDATION", "FORBIDDEN"], audit="settings.set"),
# ---------- companies / products ----------
M("companies.list", B, "Companies (suppliers). Manager gets id+name only.", {"q": "string?"}, {"rows": "[Company]"}, AUTH, manager="no due/phone"),
M("companies.save", O, "Create or update a company.", {"id": "id?", "name": "string", "phone": "string?", "opening_due": "money?"}, "Company", ["VALIDATION", "DUPLICATE"], audit="companies.save"),
M("companies.ledger", O, "Company ledger: purchases, payments, commission received.", {"company_id": "id", "from": "date?", "to": "date?"}, {"rows": "[LedgerRow]", "due": "money"}, ["NOT_FOUND"]),
M("products.list", B, "Inventory grid data. Server-side filter, sort, page. All 75..5000 rows fit one page of up to 5000.", dict(PG, q="string?", company_id="id?", status="enum(ok|low|out|near_expiry)?", sort="{key:string, dir:enum(asc|desc)}?", include_archived="bool?"), {"rows": "[Product]", "page": "PageOut", "totals": {"count": "int", "stock_cartons": "int", "stock_value": "money?  (OWNER ONLY)"}}, AUTH, manager="cost_price, margin_bp, min_sell_price, stock_value omitted"),
M("products.get", B, "One product with lots, month-wise received vs remaining, 30-day series.", {"id": "id"}, {"product": "Product", "lots": "[Lot]", "by_month": "[{month:string, received:Qty, remaining:Qty}]", "sold30": "[{date:date, qty_base:int, discount:money?, profit:money?}]"}, ["NOT_FOUND"], manager="lot.unit_cost and profit omitted"),
M("products.save", O, "Create/update one product (form).", {"id": "id?", "sku": "string", "name": "string", "company_id": "id?", "sell_mode": "enum(carton_pcs|by_kg)", "pcs_per_carton": "int?", "pcs_per_dozen": "int?", "grams_per_carton": "int?", "list_price": "money", "cost_price": "money?", "max_discount": {"per_unit": "money", "percent_bp": "int?"}, "min_sell_price": "money?", "min_stock": "QtyIn?"}, "Product", ["VALIDATION", "DUPLICATE", "NOT_FOUND"], audit="products.save"),
M("products.archive", O, "Archive (never hard-delete a sold product).", {"id": "id", "archived": "bool"}, "null", ["NOT_FOUND"], audit="products.archive"),
M("products.validate", B, "Dry-run validation of a value before commit (grid cell).", {"id": "id", "field": "string", "value": "any"}, {"ok": "bool", "normalized": "any?", "message": "string?"}, ["NOT_FOUND"]),
# ---------- grid / edit mode / stock ----------
M("editmode.enable", O, "Turn on manual edit mode. Owner PIN required each time; auto-off after idle/lock/logout. After 21:00-06:00 the audit row is flagged.", {"owner_pin": "string"}, {"edit_token": "string", "expires_at": "ts"}, ["FORBIDDEN"], audit="editmode.enable (flag if after hours)"),
M("editmode.disable", O, "Turn off edit mode.", {}, "null", audit="editmode.disable"),
M("grid.applyBatch", O, "Atomic batch of cell edits or an Excel paste. Requires edit mode. Stock cells are converted to stock adjustments (delta + reason). Returns per-row result and the inverse batch for Ctrl+Z.", {"edits": "[{product_id:id, field:enum(list_price|cost_price|max_discount_per_unit|min_stock|stock|pcs_per_carton|grams_per_carton|min_sell_price|name|sku), value:any, reason:string?}]", "dry_run": "bool?"}, {"results": "[{index:int, ok:bool, code:string?, message:string?, old:any?, new:any?}]", "applied": "int", "inverse": "[same as edits]?"}, ["LOCKED", "VALIDATION"], audit="one audit row per changed cell (old, new, reason); stock deltas flagged"),
M("stock.adjust", O, "Explicit stock adjustment: +/- delta with reason, creates/consumes a lot (adjustment lot, unit cost = last cost).", {"product_id": "id", "delta": "QtyIn", "sign": "enum(plus|minus)", "reason": "string", "received_date": "date?", "expiry_date": "date?"}, {"stock": "Qty"}, ["VALIDATION", "STOCK", "LOCKED"], audit="stock.adjust (flag)"),
M("stock.count.submit", B, "Physical count. Manager can submit counts, never fix stock.", {"date": "date", "lines": "[{product_id:id, counted:QtyIn}]"}, {"count_id": "id"}, ["VALIDATION"] + AUTH, audit="stock.count.submit"),
M("stock.count.list", O, "Counts with expected vs counted and value of difference.", {"from": "date?", "to": "date?"}, {"rows": "[{count_id:id, date:date, by:string, lines:[{product_id:id, name:string, expected:Qty, counted:Qty, diff:Qty, diff_value:money}]}]"}),
# ---------- import ----------
M("import.pickFile", O, "Open native file dialog (main process) and return a handle. UI never sees raw paths.", {"kind": "enum(products_csv|products_xlsx)"}, {"handle": "string", "name": "string", "bytes": "int"}, ["NOT_FOUND"]),
M("import.preview", O, "Parse and validate an import file (untrusted). Never writes.", {"handle": "string", "mapping": "{[column]: string}?"}, {"columns": "[string]", "suggested_mapping": "{[column]: string}", "valid": "int", "issues": "[{row:int, sku:string?, severity:enum(error|warning), kind:enum(missing_company|missing_price|missing_size|missing_pcs_per_carton|duplicate_name|duplicate_sku|bad_number|formula_cell), message:string}]", "sample": "[any]"}, ["VALIDATION"]),
M("import.commit", O, "Insert valid rows, skip or fix issue rows by owner resolution. Atomic.", {"handle": "string", "mapping": "{[column]: string}", "resolutions": "[{row:int, action:enum(skip|import_as_is|set), values:any?}]", "mode": "enum(insert_only|upsert_by_sku)"}, {"inserted": "int", "updated": "int", "skipped": "int", "report_handle": "string?"}, ["VALIDATION", "DB"], audit="import.commit"),
M("export.table", O, "Export a table to CSV/XLSX file via save dialog. Cells starting with = + - @ are escaped.", {"table": "enum(products|customers|sales|payments|audit|lots)", "format": "enum(csv|xlsx)", "filters": "any?"}, {"saved_to": "string"}, ["FORBIDDEN"], audit="export.table"),
# ---------- lots ----------
M("lots.list", B, "Lots, optionally grouped. Remaining only for manager (no cost).", dict(PG, product_id="id?", group_by="enum(received_month|expiry_month)?", near_expiry_days="int?", only_remaining="bool?"), {"rows": "[Lot]", "groups": "[{key:string, label:string, received:Qty, remaining:Qty}]?", "page": "PageOut"}, AUTH, manager="unit_cost omitted"),
# ---------- purchases ----------
M("purchases.create", O, "Receive goods from a company: creates one lot per line, raises stock, company due. Optional payment now.", {"company_id": "id", "date": "date", "supplier_invoice": "string?", "lines": "[{product_id:id, qty:QtyIn, unit_cost:money  (per carton or per kg), received_date:date?, expiry_date:date?}]", "paid_now": "{amount:money, method:string}?"}, {"purchase": "{id:id, no:string, total:money, due:money, lots:[Lot]}"}, ["VALIDATION", "NOT_FOUND"], audit="purchases.create"),
M("purchases.list", O, "Purchases.", dict(PG, company_id="id?", from_="date?", to="date?"), {"rows": "[{id:id, no:string, date:date, company:string, lines:int, total:money, paid:money, due:money}]", "page": "PageOut"}),
M("purchases.get", O, "One purchase with lines and lots.", {"id": "id"}, {"purchase": "any"}, ["NOT_FOUND"]),
M("purchases.cancel", O, "Cancel a purchase only if none of its lots has been sold. Needs approval(owner PIN re-entry).", {"id": "id", "reason": "string"}, "null", ["STATE", "NEEDS_OWNER_PIN"], audit="purchases.cancel (flag)"),
# ---------- sales ----------
M("sales.preview", B, "Compute lines, discounts, FEFO lots and totals WITHOUT saving. The UI shows exactly these numbers; it does no arithmetic.", {"customer_id": "id", "lines": "[SaleLineIn]", "invoice_discount": "{type:enum(none|percent|amount), value:int}?", "pay_now": "money?"}, {"lines": "[SaleLine]", "totals": "SaleTotals"}, ["VALIDATION", "STOCK", "NOT_FOUND"] + AUTH, manager="cost/profit omitted"),
M("sales.create", B, "Save an invoice. Re-validates everything server-side; role and discount limits enforced here regardless of UI.", {"customer_id": "id", "date": "date?  (owner may back-date within settings; manager today only)", "lines": "[SaleLineIn]", "invoice_discount": "{type:string, value:int}?", "payment": "{amount:money, method:enum(cash|bkash|nagad|bank|cheque), ref:string?}?", "salesman_id": "id?", "approval": "Approval?  (required if any line is over cap / below min price / over credit limit(block))"}, {"sale": "Sale", "payment": "Payment?"}, ["VALIDATION", "STOCK", "NEEDS_OWNER_PIN", "DISCOUNT_LIMIT", "CREDIT_LIMIT", "NOT_FOUND"] + AUTH, notes="Single DB transaction: invoice no (gapless), lines with price/discount/cost snapshots, lot deductions (FEFO then FIFO) into sale_item_lots, ledger entry, optional payment + allocation, audit rows. Over-cap with valid approval writes discount_overrides + flagged audit row.", audit="sales.create; sales.override (flag) if approval used"),
M("sales.list", B, "Invoices. Manager sees own invoices of today and the last 2 days only.", dict(PG, q="string?", from_="date?", to="date?", customer_id="id?", status="string?", user_id="id?"), {"rows": "[{id:id, invoice_no:string, ts:ts, customer:string, lines:int, total:money, paid:money, due:money, status:string, created_by:string, has_override:bool}]", "page": "PageOut"}, AUTH, manager="own + last 2 days"),
M("sales.get", B, "Full invoice.", {"id": "id"}, "Sale", ["NOT_FOUND", "FORBIDDEN"] + AUTH, manager="cost/profit omitted; only own"),
M("sales.cancel", B, "Cancel an invoice: stock returns to the same lots, ledger reversed, payment reversal rows created. Reason required. Manager cancels flag the audit and (setting) wait for owner approval.", {"id": "id", "reason": "string", "approval": "Approval?"}, "Sale", ["STATE", "NEEDS_OWNER_PIN", "VALIDATION", "NOT_FOUND"] + AUTH, audit="sales.cancel (flag always)"),
M("invoice.data", B, "Everything needed to render the invoice image/PDF. print_count increments when mark_printed is true; second and later outputs are watermarked COPY.", {"sale_id": "id", "size": "enum(58|80|a4)", "language": "enum(bn|en|both)?", "mark_printed": "bool?"}, "Invoice", ["NOT_FOUND"] + AUTH),
M("files.saveBytes", B, "Save rendered bytes (PDF/PNG) to the user's invoice folder or via Save dialog. Main process writes; renderer never gets a path it can reuse.", {"suggested_name": "string", "mime": "enum(application/pdf|image/png)", "bytes_b64": "string", "where": "enum(default_folder|dialog)"}, {"saved_to": "string"}, ["DB"] + AUTH, notes="Used for invoices, receipts, statements."),
M("files.share", B, "Open the OS share/explorer-select for a saved file (WhatsApp Web friendly).", {"path": "string  (must come from files.saveBytes this session)"}, "null", ["NOT_FOUND"]),
M("printer.list", B, "Reserved. Returns installed system printers and adapters; empty until adapters exist.", {}, {"adapters": "[{id:string, kind:enum(system|bluetooth|usb|network), name:string, paper:[string]}]"}),
M("printer.print", B, "Reserved: send a rendered PNG to an adapter. Returns UNSUPPORTED until printers are bought.", {"adapter_id": "string", "png_b64": "string", "copies": "int?"}, "null", ["UNSUPPORTED"]),
# ---------- returns ----------
M("returns.create", B, "Return request. Owner's returns apply immediately; manager's wait for owner approval (setting).", {"sale_id": "id", "lines": "[{sale_item_id:id, qty:QtyIn}]", "reason": "enum(expired|damaged|unsold|wrong_item|other)", "note": "string?", "destination": "enum(good|damaged)", "refund": "enum(ledger|cash)"}, {"return": "{id:id, no:string, status:enum(pending|approved|rejected), value:money}"}, ["VALIDATION", "STATE", "NOT_FOUND"] + AUTH, audit="returns.create (flag)"),
M("returns.list", B, "Returns. Manager sees own.", dict(PG, status="string?", from_="date?", to="date?"), {"rows": "[{id:id, no:string, ts:ts, sale_no:string, customer:string, product:string, qty:Qty, reason:string, destination:string, value:money, status:string, created_by:string}]", "page": "PageOut"}, AUTH),
M("returns.approve", O, "Approve: good stock goes back into the original lots, damaged goes to loss; customer ledger credited.", {"id": "id", "approval": "Approval?"}, "null", ["STATE", "NOT_FOUND"], audit="returns.approve (flag)"),
M("returns.reject", O, "Reject with reason.", {"id": "id", "reason": "string"}, "null", ["STATE", "NOT_FOUND"], audit="returns.reject"),
# ---------- customers ----------
M("customers.list", B, "Shops with due, limit usage, aging.", dict(PG, q="string?", area="string?", route="string?", has_due="bool?", sort="string?"), {"rows": "[CustomerRow]", "page": "PageOut", "total_due": "money"}, AUTH),
M("customers.save", B, "Create (manager+owner) or update (owner only; manager may not change credit limit).", {"id": "id?", "name": "string", "owner": "string?", "phone": "string?", "area": "string?", "address": "string?", "route": "string?", "credit_limit": "money?", "opening_due": "money?  (create only)"}, "CustomerRow", ["VALIDATION", "DUPLICATE", "FORBIDDEN", "NOT_FOUND"] + AUTH, audit="customers.save"),
M("customers.ledger", B, "Ledger rows with running balance and aging buckets.", {"customer_id": "id", "from": "date?", "to": "date?"}, {"rows": "[LedgerRow]", "due": "money", "aging": "{d0_7:money, d8_30:money, d31_60:money, d60p:money}", "open_items": "[{ref:string, date:date, left:money}]"}, ["NOT_FOUND"] + AUTH),
M("customers.statement", B, "Data for a customer statement PDF.", {"customer_id": "id", "from": "date", "to": "date", "language": "enum(bn|en|both)?"}, {"business": "any", "customer": "CustomerRow", "rows": "[LedgerRow]", "opening": "money", "closing": "money"}, ["NOT_FOUND"] + AUTH),
M("customers.dueList", B, "Who to chase today: due, days overdue, last payment; includes a ready reminder text (bn/en). Sending SMS is out of scope.", {"min_days": "int?", "route": "string?"}, {"rows": "[{customer:CustomerRow, reminder:{bn:string, en:string}}]"}, AUTH),
# ---------- payments (received + paid) ----------
M("payments.receive", B, "RECEIVE money from a customer. Allocation default auto_oldest (oldest unpaid invoice / opening due first). Cannot exceed due unless allocation.mode=on_account (owner only, creates credit). Cheque creates a pending cheque row.", {"customer_id": "id", "amount": "money", "method": "enum(cash|bkash|nagad|bank|cheque)", "date": "date?  (owner may back-date)", "ref": "string?  (bKash trx id, bank ref)", "note": "string?", "allocation": "{mode:enum(auto_oldest|manual|on_account), items:[{sale_id:id?, opening:bool?, amount:money}]?}?", "cheque": "{no:string, bank:string?, deposit_date:date?}?"}, {"payment": "Payment", "customer_due_before": "money", "customer_due_after": "money", "receipt": "Receipt"}, ["VALIDATION", "FORBIDDEN", "NOT_FOUND"] + AUTH, notes="Gapless receipt numbers RCV-00001. Ledger credit entry + payment_allocations rows in one transaction. Manager's payments carry created_by for the day book and cash close.", audit="payments.receive"),
M("payments.preview", B, "Show how an amount would be allocated, without saving.", {"customer_id": "id", "amount": "money", "allocation": "any?"}, {"allocations": "[{ref:string, date:date, due:money, applied:money}]", "due_after": "money"}, ["NOT_FOUND", "VALIDATION"] + AUTH),
M("payments.list", B, "Payments received (and for owner: paid to companies). Manager sees only own.", dict(PG, party_type="enum(customer|company)?", customer_id="id?", method="string?", status="string?", from_="date?", to="date?", user_id="id?", q="string?"), {"rows": "[Payment]", "page": "PageOut", "totals": "{by_method:{[m]:money}, grand:money}"}, AUTH, manager="party_type=customer, own only"),
M("payments.get", B, "One payment.", {"id": "id"}, "Payment", ["NOT_FOUND", "FORBIDDEN"] + AUTH),
M("payments.receipt", B, "Receipt data (58/80/A4). Render in UI like invoices; reprint is marked COPY.", {"payment_id": "id", "size": "enum(58|80|a4)", "language": "enum(bn|en|both)?", "mark_printed": "bool?"}, "Receipt", ["NOT_FOUND"] + AUTH),
M("payments.reverse", O, "Reverse a payment (wrong amount, bounced). Never deletes: writes a reversing ledger row, re-opens the allocated invoices, original stays visible as REVERSED. Owner PIN + reason.", {"id": "id", "reason": "string", "approval": "Approval?"}, "Payment", ["STATE", "NEEDS_OWNER_PIN", "NOT_FOUND", "VALIDATION"], audit="payments.reverse (flag)"),
M("payments.dayBook", B, "Collection for one day: by method, by collector, count. Manager sees own only.", {"date": "date"}, {"by_method": "{[m]:money}", "by_user": "[{user:string, amount:money, count:int}]", "total": "money", "cash_in_hand_expected": "money?  (owner: cash received minus cash expenses)"}, AUTH, manager="own rows only"),
M("payments.cheques.list", O, "Cheques with status.", dict(PG, status="enum(pending|cleared|bounced)?"), {"rows": "[{id:id, payment_id:id, no:string, bank:string?, customer:string, amount:money, deposit_date:date?, status:string}]"}),
M("payments.cheques.setStatus", O, "Mark cleared or bounced. Bounced reverses the payment (ledger re-opens).", {"id": "id", "status": "enum(cleared|bounced)", "note": "string?"}, "null", ["STATE", "NOT_FOUND"], audit="cheque status (bounced = flag)"),
M("payments.payCompany", O, "PAY money to a company (reduces company due). Optionally allocate to purchases.", {"company_id": "id", "amount": "money", "method": "string", "date": "date?", "ref": "string?", "note": "string?", "allocation": "{items:[{purchase_id:id, amount:money}]}?"}, {"payment": "Payment", "company_due_after": "money"}, ["VALIDATION", "NOT_FOUND"], audit="payments.payCompany"),
# ---------- employees / expenses ----------
M("employees.list", O, "Employees with salary, advance, this-month status, 7-day sales.", {}, {"rows": "[{id:id, name:string, role:string, phone:string?, van:string?, salary:money, advance:money, paid_this_month:bool, sold_7d:money}]"}),
M("employees.save", O, "Create/update employee.", {"id": "id?", "name": "string", "role": "string", "phone": "string?", "van": "string?", "salary": "money"}, "any", ["VALIDATION"], audit="employees.save"),
M("employees.paySalary", O, "Pay salary, net of advance. Also creates an expense row type=salary.", {"employee_id": "id", "month": "string (YYYY-MM)", "method": "string?"}, "{net:money}", ["STATE", "NOT_FOUND"], audit="employees.paySalary"),
M("employees.advance", O, "Give an advance.", {"employee_id": "id", "amount": "money", "note": "string?"}, "null", ["VALIDATION", "NOT_FOUND"], audit="employees.advance"),
M("expenses.create", B, "Add an expense. Append-only.", {"type": "string", "amount": "money", "note": "string?", "date": "date?  (owner back-date only)"}, "any", ["VALIDATION"] + AUTH, audit="expenses.create"),
M("expenses.list", B, "Expenses. Manager sees own, today only.", dict(PG, from_="date?", to="date?", type="string?"), {"rows": "[{id:id, ts:ts, type:string, amount:money, note:string?, created_by:string}]", "page": "PageOut", "total": "money"}, AUTH, manager="own, today"),
# ---------- load sheet / cash ----------
M("loadsheet.get", B, "Today's van load sheet with loaded / sold / returned / expected / counted / shortage (+ value).", {"date": "date", "van": "string?"}, {"id": "id?", "lines": "[{product_id:id, name:string, loaded:Qty, sold:Qty, returned:Qty, expected:Qty, counted:Qty?, diff:Qty?, diff_value:money?}]", "submitted": "bool", "shortage_value": "money"}, AUTH),
M("loadsheet.setLoaded", B, "Morning: set loaded quantities.", {"date": "date", "van": "string?", "lines": "[{product_id:id, loaded:QtyIn}]"}, "null", ["VALIDATION", "STOCK", "LOCKED"] + AUTH, audit="loadsheet.setLoaded"),
M("loadsheet.submit", B, "Evening: submit counted quantities. Shortages are flagged. Locks the sheet.", {"date": "date", "van": "string?", "counted": "[{product_id:id, counted:QtyIn}]"}, {"shortage_value": "money", "flagged": "bool"}, ["VALIDATION", "LOCKED"] + AUTH, audit="loadsheet.submit (flag if shortage)"),
M("cash.expected", B, "Expected cash in hand for a date = cash received - cash expenses (opening drawer optional).", {"date": "date"}, {"by_method": "{[m]:money}", "expenses": "money", "expected_cash": "money", "closed": "bool"}, AUTH),
M("cash.close", B, "Close the day with counted cash. Difference is stored and flagged when not zero.", {"date": "date", "counted": "money", "note": "string?"}, {"expected": "money", "counted": "money", "difference": "money"}, ["STATE", "VALIDATION"] + AUTH, audit="cash.close (flag if diff)"),
M("cash.history", O, "Past closes.", dict(PG), {"rows": "[{date:date, expected:money, counted:money, difference:money, by:string, note:string?}]"}),
# ---------- commission ----------
M("commission.rules.list", O, "Company commission rules.", {}, {"rows": "[{id:id, company_id:id?, name:string, basis:enum(net_kg_sold), period:enum(month|quarter|year), scope:enum(all_tea|group|product), type:enum(per_kg|slab), per_kg:money?, slabs:[{from_kg:int, to_kg:int?, rate_per_kg:money}], active:bool}]"}),
M("commission.rules.save", O, "Create/update a rule (rates are NOT hard-coded; demo slabs 4/6/8 are sample data).", {"id": "id?", "company_id": "id?", "name": "string", "period": "string", "scope": "string", "scope_ref": "id?", "type": "string", "per_kg": "money?", "slabs": "[any]?", "active": "bool?"}, "any", ["VALIDATION"], audit="commission.rules.save"),
M("commission.status", O, "Current period: net kg (sales minus returns minus cancelled), band, estimated amount, kg to next band.", {"rule_id": "id?", "period_start": "date?"}, {"net_kg": "string", "estimate": "money", "bands": "[{from_kg:int, to_kg:int?, rate_per_kg:money, kg_in_band:string, amount:money}]", "to_next_kg": "string?", "by_product": "[{product_id:id, name:string, kg:string}]"}),
M("commission.accruals.list", O, "Closed periods with amount and status.", {}, {"rows": "[{id:id, period:string, net_kg:string, amount:money, status:enum(accruing|due|received), received_date:date?}]"}),
M("commission.accruals.markReceived", O, "Mark received (cash or settled against company due).", {"id": "id", "date": "date?", "settle": "enum(cash|against_company_due)"}, "null", ["STATE", "NOT_FOUND"], audit="commission.received"),
# ---------- dashboard ----------
M("dashboard.summary", B, "KPI block for a range. Manager gets only own-day numbers.", {"from": "date", "to": "date"}, {"sales": "money", "invoices": "int", "collected": "money", "collected_by_method": "{[m]:money}", "new_due": "money", "total_due": "money", "discount_total": "money?", "discount_per_carton_avg": "money?", "returns_value": "money", "expenses": "money", "expected_cash": "money", "profit": "money?  (OWNER ONLY)", "tea_net_kg": "string?  (OWNER ONLY)", "commission_estimate": "money?  (OWNER ONLY)"}, AUTH, manager="own sales/collected/expenses only"),
M("dashboard.discounts", O, "Discount breakdown, grouped.", {"from": "date", "to": "date", "group_by": "enum(product|per_carton|user|customer|invoice)"}, {"rows": "[{key:string, label:string, amount:money, qty:Qty?, avg_per_carton:money?, invoices:int}]", "total": "money"}),
M("dashboard.series", O, "Time series for charts.", {"from": "date", "to": "date", "metric": "enum(sales|collected|due|expenses|discount|profit|returns)", "product_id": "id?", "customer_id": "id?", "area": "string?", "bucket": "enum(day|week|month)"}, {"points": "[{date:date, value:int}]"}),
M("dashboard.productChart", O, "Per-product chart data: sales, discount, profit, stock level over time.", {"product_id": "id", "from": "date", "to": "date"}, {"sold": "[{date:date,qty_base:int}]", "discount": "[{date:date,amount:money}]", "profit": "[{date:date,amount:money}]", "stock": "[{date:date,qty_base:int}]", "stats": {"total": "Qty", "per_day": "Qty", "days_left": "int?"}}, ["NOT_FOUND"]),
M("dashboard.flags", O, "Red flags: over-cap discounts, cancellations, returns, stock adjustments, count diffs, load-sheet shortages, cash differences, after-hours edits, clock moved back, payment reversals, bounced cheques.", {"from": "date", "to": "date", "limit": "int?"}, {"rows": "[{audit_id:id, ts:ts, kind:string, user:string, title:string, amount:money?}]"}),
M("dashboard.alerts", B, "Low stock, out of stock, near expiry.", {"limit": "int?"}, {"low": "[{product:Product}]", "out": "[{product:Product}]", "near_expiry": "[{product_id:id, name:string, lot_id:id, days:int, remaining:Qty}]"}, AUTH, manager="no values"),
# ---------- audit ----------
M("audit.list", O, "Append-only audit log.", dict(PG, from_="date?", to="date?", flag="bool?", user_id="id?", action="string?", q="string?"), {"rows": "[AuditRow]", "page": "PageOut"}),
M("audit.verify", O, "Walk the hash chain. Returns first broken id if tampered.", {}, {"ok": "bool", "checked": "int", "broken_at": "id?"}),
# ---------- backup / drive / system ----------
M("backup.list", O, "Local backups (newest first) with size, counts, verified flag, drive status.", {}, {"rows": "[{id:string, ts:ts, bytes:int, products:int, invoices:int, verified:bool, drive:enum(none|queued|uploaded|failed)}]"}),
M("backup.create", O, "Backup now (verify after write). Also runs automatically every N minutes, on close, and before restore/migration.", {"reason": "string?"}, {"id": "string"}, ["DB"], audit="backup.create"),
M("backup.restore", O, "Verify then restore. Takes a safety backup first. App restarts the DB handle.", {"id": "string", "approval": "Approval"}, "null", ["NEEDS_OWNER_PIN", "NOT_FOUND", "DB"], audit="backup.restore (flag)"),
M("drive.status", O, "Google Drive: connected account, online, queue length, last upload.", {}, {"connected": "bool", "account": "string?", "online": "bool", "queued": "int", "last_upload": "ts?"}),
M("drive.connect", O, "Start OAuth (system browser, loopback redirect, PKCE). Verify current Google desktop OAuth rules at implementation time.", {}, {"connected": "bool", "account": "string"}, ["DB"], audit="drive.connect"),
M("drive.disconnect", O, "Forget tokens.", {}, "null", audit="drive.disconnect"),
M("drive.uploadNow", O, "Upload queued backups now (needs net).", {}, {"uploaded": "int", "queued": "int"}),
M("system.info", B, "Versions and paths for the About box.", {}, {"app_version": "string", "contract_version": "string", "db_version": "int", "data_dir": "string?  (owner)", "now": "ts"}),
M("system.clockCheck", B, "Detect system date moved backwards since the last write. Called at start and hourly.", {}, {"ok": "bool", "last_seen": "ts?", "now": "ts"}, notes="When not ok the backend writes a flagged audit row and the UI shows a banner."),
]

EVENTS = {
 "_how": "window.api.on(name, cb) -> unsubscribe fn. Main process pushes, payload is small.",
 "session.locked": "{reason: idle|manual}", "net.status": "{online:bool}", "drive.queue": "{queued:int}", "backup.completed": "{id:string, ts:ts, drive:string}",
 "clock.warning": "{last_seen:ts, now:ts}", "license.changed": "{state:string}", "stock.alert": "{low:int, out:int, near_expiry:int}"}

def fix(name):  # python kwargs cannot be 'from'; contract uses 'from'
    return name[:-1] if name.endswith('_') and name[:-1] in ('from',) else name
for m in METHODS:
    if isinstance(m['input'], dict):
        m['input'] = {fix(k): v for k, v in m['input'].items()}

names = [m['name'] for m in METHODS]
assert len(names) == len(set(names)), "duplicate method"
doc = {"contract_version": CONTRACT_VERSION, "transport": "window.api.call(method, args) -> {ok:true,data} | {ok:false,code,message,details?}", "methods": METHODS, "events": EVENTS}
os.makedirs(OUT, exist_ok=True)
json.dump(doc, open(os.path.join(OUT, "methods.json"), "w"), ensure_ascii=False, indent=1)
json.dump(ERRORS, open(os.path.join(OUT, "errors.json"), "w"), ensure_ascii=False, indent=1)
json.dump(TYPES, open(os.path.join(OUT, "types.json"), "w"), ensure_ascii=False, indent=1)

# human-readable table
fams = {}
for m in METHODS: fams.setdefault(m['name'].split('.')[0], []).append(m)
L = [f"# PetraDMS Contract: method reference (v{CONTRACT_VERSION})", "", "Generated from `tools/gen_contract.py`. Do not edit by hand. Shapes and types: see `types.json` and CONTRACT.md.", "", f"{len(METHODS)} methods in {len(fams)} families.", ""]
for f, ms in fams.items():
    L += [f"## {f}", "", "| Method | Who | What it does | Manager sees |", "|---|---|---|---|"]
    for m in ms: L.append(f"| `{m['name']}` | {m['who']} | {m['summary']} | {m.get('manager_view','') or ('-' if m['who']=='both' else '')} |")
    L.append("")
open(os.path.join(OUT, "METHODS.md"), "w").write("\n".join(L))
print(len(METHODS), "methods;", len(fams), "families")
