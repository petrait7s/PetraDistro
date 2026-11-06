# Desktop contract v0.2.0

Original 104 method input keys remain v0.1.0-compatible. Additional methods are listed below. Unsafe legacy flows explicitly return UNSUPPORTED; see KNOWN_GAPS.md.

| Method | Role | Input |
|---|---|---|
| license.status | public | `{}` |
| license.activate | public | `{"code": "string  (PETRA-XXXX-XXXX-XXXX)"}` |
| setup.complete | public | `{"business": {"name": "string", "address": "string?", "phone": "string?"}, "owner": {"name": "string", "pin": "string (min 4)"}, "manager": {"name": "string", "pin": "string (min 4)"}, "language": "enum(bn/en)?", "theme": "enum(light/dark/system)?"}` |
| license.reveal | owner | `{"approval": "Approval"}` |
| auth.login | public | `{"role": "enum(owner/manager)", "pin": "string"}` |
| auth.logout | both | `{}` |
| auth.lock | both | `{}` |
| auth.unlock | both | `{"pin": "string"}` |
| auth.resetPin | public | `{"license_code": "string", "new_pin": "string"}` |
| auth.changePin | both | `{"old_pin": "string", "new_pin": "string"}` |
| auth.requestApproval | both | `{"owner_pin": "string", "scope": "enum(discount_override/cancel_invoice/reverse_payment/approve_return/edit_mode/stock_adjust/restore_backup/license_reveal)"}` |
| users.list | owner | `{}` |
| users.setPin | owner | `{"user_id": "id", "new_pin": "string"}` |
| users.update | owner | `{"user_id": "id", "name": "string?", "active": "bool?"}` |
| prefs.get | both | `{}` |
| prefs.set | both | `{"patch": "Prefs (partial)"}` |
| settings.get | both | `{"keys": "[string]?"}` |
| settings.set | owner | `{"patch": "{[key]: any}"}` |
| companies.list | both | `{"q": "string?"}` |
| companies.save | owner | `{"id": "id?", "name": "string", "phone": "string?", "opening_due": "money?"}` |
| companies.ledger | owner | `{"company_id": "id", "from": "date?", "to": "date?"}` |
| products.list | both | `{"limit": "int?", "cursor": "string?", "q": "string?", "company_id": "id?", "status": "enum(ok/low/out/near_expiry)?", "sort": "{key:string, dir:enum(asc/desc)}?", "include_archived": "bool?"}` |
| products.get | both | `{"id": "id"}` |
| products.save | owner | `{"id": "id?", "sku": "string", "name": "string", "company_id": "id?", "sell_mode": "enum(carton_pcs/by_kg)", "pcs_per_carton": "int?", "pcs_per_dozen": "int?", "grams_per_carton": "int?", "list_price": "money", "cost_price": "money?", "max_discount": {"per_unit": "money", "percent_bp": "int?"}, "min_sell_price": "money?", "min_stock": "QtyIn?"}` |
| products.archive | owner | `{"id": "id", "archived": "bool"}` |
| products.validate | owner | `{"id": "id", "field": "string", "value": "any"}` |
| editmode.enable | owner | `{"owner_pin": "string"}` |
| editmode.disable | owner | `{}` |
| grid.applyBatch | owner | `{"edits": "[{product_id:id, field:enum(list_price/cost_price/max_discount_per_unit/min_stock/stock/pcs_per_carton/grams_per_carton/min_sell_price/name/sku), value:any, reason:string?}]", "dry_run": "bool?"}` |
| stock.adjust | owner | `{"product_id": "id", "delta": "QtyIn", "sign": "enum(plus/minus)", "reason": "string", "received_date": "date?", "expiry_date": "date?"}` |
| stock.count.submit | both | `{"date": "date", "lines": "[{product_id:id, counted:QtyIn}]"}` |
| stock.count.list | owner | `{"from": "date?", "to": "date?"}` |
| import.pickFile | owner | `{"kind": "enum(products_csv/products_xlsx)"}` |
| import.preview | owner | `{"handle": "string", "mapping": "{[column]: string}?"}` |
| import.commit | owner | `{"handle": "string", "mapping": "{[column]: string}", "resolutions": "[{row:int, action:enum(skip/import_as_is/set), values:any?}]", "mode": "enum(insert_only/upsert_by_sku)"}` |
| export.table | owner | `{"table": "enum(products/customers/sales/payments/audit/lots)", "format": "enum(csv/xlsx)", "filters": "any?"}` |
| lots.list | both | `{"limit": "int?", "cursor": "string?", "product_id": "id?", "group_by": "enum(received_month/expiry_month)?", "near_expiry_days": "int?", "only_remaining": "bool?"}` |
| purchases.create | owner | `{"company_id": "id", "date": "date", "supplier_invoice": "string?", "lines": "[{product_id:id, qty:QtyIn, unit_cost:money  (per carton or per kg), received_date:date?, expiry_date:date?}]", "paid_now": "{amount:money, method:string}?"}` |
| purchases.list | owner | `{"limit": "int?", "cursor": "string?", "company_id": "id?", "from": "date?", "to": "date?"}` |
| purchases.get | owner | `{"id": "id"}` |
| purchases.cancel | owner | `{"id": "id", "reason": "string"}` |
| sales.preview | both | `{"customer_id": "id", "lines": "[SaleLineIn]", "invoice_discount": "{type:enum(none/percent/amount), value:int}?", "pay_now": "money?"}` |
| sales.create | both | `{"customer_id": "id", "date": "date?  (owner may back-date within settings; manager today only)", "lines": "[SaleLineIn]", "invoice_discount": "{type:string, value:int}?", "payment": "{amount:money, method:enum(cash/bkash/nagad/bank/cheque), ref:string?}?", "salesman_id": "id?", "approval": "Approval?  (required if any line is over cap / below min price / over credit limit(block))"}` |
| sales.list | both | `{"limit": "int?", "cursor": "string?", "q": "string?", "from": "date?", "to": "date?", "customer_id": "id?", "status": "string?", "user_id": "id?"}` |
| sales.get | both | `{"id": "id"}` |
| sales.cancel | both | `{"id": "id", "reason": "string", "approval": "Approval?"}` |
| invoice.data | both | `{"sale_id": "id", "size": "enum(58/80/a4)", "language": "enum(bn/en/both)?", "mark_printed": "bool?"}` |
| files.saveBytes | both | `{"suggested_name": "string", "mime": "enum(application/pdf/image/png)", "bytes_b64": "string", "where": "enum(default_folder/dialog)"}` |
| files.share | both | `{"path": "string  (must come from files.saveBytes this session)"}` |
| printer.list | both | `{}` |
| printer.print | both | `{"adapter_id": "string", "png_b64": "string", "copies": "int?"}` |
| returns.create | both | `{"sale_id": "id", "lines": "[{sale_item_id:id, qty:QtyIn}]", "reason": "enum(expired/damaged/unsold/wrong_item/other)", "note": "string?", "destination": "enum(good/damaged)", "refund": "enum(ledger/cash)"}` |
| returns.list | both | `{"limit": "int?", "cursor": "string?", "status": "string?", "from": "date?", "to": "date?"}` |
| returns.approve | owner | `{"id": "id", "approval": "Approval?"}` |
| returns.reject | owner | `{"id": "id", "reason": "string"}` |
| customers.list | both | `{"limit": "int?", "cursor": "string?", "q": "string?", "area": "string?", "route": "string?", "has_due": "bool?", "sort": "string?"}` |
| customers.save | both | `{"id": "id?", "name": "string", "owner": "string?", "phone": "string?", "area": "string?", "address": "string?", "route": "string?", "credit_limit": "money?", "opening_due": "money?  (create only)"}` |
| customers.ledger | both | `{"customer_id": "id", "from": "date?", "to": "date?"}` |
| customers.statement | both | `{"customer_id": "id", "from": "date", "to": "date", "language": "enum(bn/en/both)?"}` |
| customers.dueList | both | `{"min_days": "int?", "route": "string?"}` |
| payments.receive | both | `{"customer_id": "id", "amount": "money", "method": "enum(cash/bkash/nagad/bank/cheque)", "date": "date?  (owner may back-date)", "ref": "string?  (bKash trx id, bank ref)", "note": "string?", "allocation": "{mode:enum(auto_oldest/manual/on_account), items:[{sale_id:id?, opening:bool?, amount:money}]?}?", "cheque": "{no:string, bank:string?, deposit_date:date?}?"}` |
| payments.preview | both | `{"customer_id": "id", "amount": "money", "allocation": "any?"}` |
| payments.list | both | `{"limit": "int?", "cursor": "string?", "party_type": "enum(customer/company)?", "customer_id": "id?", "method": "string?", "status": "string?", "from": "date?", "to": "date?", "user_id": "id?", "q": "string?"}` |
| payments.get | both | `{"id": "id"}` |
| payments.receipt | both | `{"payment_id": "id", "size": "enum(58/80/a4)", "language": "enum(bn/en/both)?", "mark_printed": "bool?"}` |
| payments.reverse | owner | `{"id": "id", "reason": "string", "approval": "Approval?"}` |
| payments.dayBook | both | `{"date": "date"}` |
| payments.cheques.list | owner | `{"limit": "int?", "cursor": "string?", "status": "enum(pending/cleared/bounced)?"}` |
| payments.cheques.setStatus | owner | `{"id": "id", "status": "enum(cleared/bounced)", "note": "string?"}` |
| payments.payCompany | owner | `{"company_id": "id", "amount": "money", "method": "string", "date": "date?", "ref": "string?", "note": "string?", "allocation": "{items:[{purchase_id:id, amount:money}]}?"}` |
| employees.list | owner | `{}` |
| employees.save | owner | `{"id": "id?", "name": "string", "role": "string", "phone": "string?", "van": "string?", "salary": "money"}` |
| employees.paySalary | owner | `{"employee_id": "id", "month": "string (YYYY-MM)", "method": "string?"}` |
| employees.advance | owner | `{"employee_id": "id", "amount": "money", "note": "string?"}` |
| expenses.create | both | `{"type": "string", "amount": "money", "note": "string?", "date": "date?  (owner back-date only)"}` |
| expenses.list | both | `{"limit": "int?", "cursor": "string?", "from": "date?", "to": "date?", "type": "string?"}` |
| loadsheet.get | both | `{"date": "date", "van": "string?"}` |
| loadsheet.setLoaded | both | `{"date": "date", "van": "string?", "lines": "[{product_id:id, loaded:QtyIn}]"}` |
| loadsheet.submit | both | `{"date": "date", "van": "string?", "counted": "[{product_id:id, counted:QtyIn}]"}` |
| cash.expected | both | `{"date": "date"}` |
| cash.close | both | `{"date": "date", "counted": "money", "note": "string?"}` |
| cash.history | owner | `{"limit": "int?", "cursor": "string?"}` |
| commission.rules.list | owner | `{}` |
| commission.rules.save | owner | `{"id": "id?", "company_id": "id?", "name": "string", "period": "string", "scope": "string", "scope_ref": "id?", "type": "string", "per_kg": "money?", "slabs": "[any]?", "active": "bool?"}` |
| commission.status | owner | `{"rule_id": "id?", "period_start": "date?"}` |
| commission.accruals.list | owner | `{}` |
| commission.accruals.markReceived | owner | `{"id": "id", "date": "date?", "settle": "enum(cash/against_company_due)"}` |
| dashboard.summary | both | `{"from": "date", "to": "date"}` |
| dashboard.discounts | owner | `{"from": "date", "to": "date", "group_by": "enum(product/per_carton/user/customer/invoice)"}` |
| dashboard.series | owner | `{"from": "date", "to": "date", "metric": "enum(sales/collected/due/expenses/discount/profit/returns)", "product_id": "id?", "customer_id": "id?", "area": "string?", "bucket": "enum(day/week/month)"}` |
| dashboard.productChart | owner | `{"product_id": "id", "from": "date", "to": "date"}` |
| dashboard.flags | owner | `{"from": "date", "to": "date", "limit": "int?"}` |
| dashboard.alerts | both | `{"limit": "int?"}` |
| audit.list | owner | `{"limit": "int?", "cursor": "string?", "from": "date?", "to": "date?", "flag": "bool?", "user_id": "id?", "action": "string?", "q": "string?"}` |
| audit.verify | owner | `{}` |
| backup.list | owner | `{}` |
| backup.create | owner | `{"reason": "string?"}` |
| backup.restore | owner | `{"id": "string", "approval": "Approval"}` |
| drive.status | owner | `{}` |
| drive.connect | owner | `{}` |
| drive.disconnect | owner | `{}` |
| drive.uploadNow | owner | `{}` |
| system.info | both | `{}` |
| system.clockCheck | both | `{}` |
| cash.reopen | owner | `{"date": "date", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| cash.preview | both | `{"date": "date", "counted": "money"}` |
| returns.preview | both | `{"sale_id": "id", "lines": "[{sale_item_id:id, qty:QtyIn}]", "reason": "enum(expired/damaged/unsold/wrong_item/other)", "note": "string?", "destination": "enum(good/damaged)", "refund": "enum(ledger/cash)", "van_id": "id?"}` |
| purchases.preview | owner | `{"company_id": "id", "date": "date", "supplier_invoice": "string?", "lines": "[{product_id:id, qty:QtyIn, unit_cost:money  (per carton or per kg), received_date:date?, expiry_date:date?}]", "paid_now": "{amount:money, method:string}?"}` |
| payments.refund | owner | `{"customer_id": "id", "amount": "money", "method": "enum(cash/bkash/nagad/bank)", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| payments.applyCredit | owner | `{"customer_id": "id", "sale_id": "id", "amount": "money", "reason": "string", "request_id": "string?"}` |
| expenses.reverse | owner | `{"id": "id", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| returns.reverse | owner | `{"id": "id", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| employees.reverse | owner | `{"id": "id", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| backup.import | owner | `{"handle": "string", "request_id": "string?"}` |
| opening.import | owner | `{"cutover_date": "date", "customers": "[{customer_id:id,amount:money}]?", "companies": "[{company_id:id,amount:money}]?", "request_id": "string?"}` |
| products.aggregate | both | `{"ids": "[id]"}` |
| loadsheet.reopen | owner | `{"id": "id", "reason": "string", "approval": "Approval", "request_id": "string?"}` |
| groups.save | owner | `{"id": "id?", "name": "string", "request_id": "string?"}` |
| groups.list | owner | `{}` |
