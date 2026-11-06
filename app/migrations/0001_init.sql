-- PetraDMS schema v1 (SQLite). Migration 0001. Backend may refine names but must keep the semantics.
-- Money: INTEGER paisa. Quantities: INTEGER base units (pcs, or grams for by_kg). Dates: TEXT 'YYYY-MM-DD'. Times: INTEGER epoch ms (UTC).
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL);

CREATE TABLE app_license (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  code_hash TEXT NOT NULL,          -- sha256(salt || normalized code)
  salt TEXT NOT NULL,
  code_masked TEXT NOT NULL,        -- PETRA-MMTR-••••-••••
  code_enc BLOB,                    -- optional: code encrypted with a key kept by OS (DPAPI/safeStorage) for license.reveal
  client_tag TEXT,                  -- 4 letters inside the code
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','invalid','revoked')),
  activated_at INTEGER NOT NULL
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, public INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager')),
  pin_hash TEXT NOT NULL,           -- scrypt/argon2 with per-user salt, never plain
  active INTEGER NOT NULL DEFAULT 1,
  failed_tries INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  last_login INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX ux_users_one_owner ON users(role) WHERE role = 'owner';

CREATE TABLE user_prefs (user_id INTEGER PRIMARY KEY REFERENCES users(id), json TEXT NOT NULL, updated_at INTEGER NOT NULL);

CREATE TABLE approvals (
  token_hash TEXT PRIMARY KEY, scope TEXT NOT NULL, for_user_id INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER
);

CREATE TABLE companies (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, phone TEXT, opening_due INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  company_id INTEGER REFERENCES companies(id),
  name TEXT NOT NULL,
  original_name TEXT,
  sell_mode TEXT NOT NULL CHECK (sell_mode IN ('carton_pcs','by_kg')),
  pcs_per_carton INTEGER CHECK (pcs_per_carton IS NULL OR pcs_per_carton > 0),
  pcs_per_dozen INTEGER,
  grams_per_carton INTEGER CHECK (grams_per_carton IS NULL OR grams_per_carton > 0),
  list_price INTEGER NOT NULL CHECK (list_price >= 0),     -- per carton, or per kg when by_kg
  cost_price INTEGER,                                       -- last cost; per carton or per kg
  max_discount_per_unit INTEGER NOT NULL DEFAULT 0,
  max_discount_bp INTEGER,
  min_sell_price INTEGER,
  min_stock_base INTEGER NOT NULL DEFAULT 0,
  assumed_ppc INTEGER NOT NULL DEFAULT 0,                   -- 1 until owner confirmed pcs_per_carton
  assumed_cost INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  CHECK (sell_mode <> 'carton_pcs' OR pcs_per_carton IS NOT NULL OR assumed_ppc = 1)
);
CREATE INDEX ix_products_company ON products(company_id);

CREATE TABLE commission_rules (
  id INTEGER PRIMARY KEY, company_id INTEGER REFERENCES companies(id), name TEXT NOT NULL,
  basis TEXT NOT NULL DEFAULT 'net_kg_sold', period TEXT NOT NULL CHECK (period IN ('month','quarter','year')),
  scope TEXT NOT NULL CHECK (scope IN ('all_tea','group','product')), scope_ref INTEGER,
  type TEXT NOT NULL CHECK (type IN ('per_kg','slab')), per_kg_paisa INTEGER, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE commission_slabs (id INTEGER PRIMARY KEY, rule_id INTEGER NOT NULL REFERENCES commission_rules(id) ON DELETE CASCADE, from_grams INTEGER NOT NULL, to_grams INTEGER, per_kg_paisa INTEGER NOT NULL);
CREATE TABLE commission_accruals (
  id INTEGER PRIMARY KEY, rule_id INTEGER NOT NULL REFERENCES commission_rules(id), period_start TEXT NOT NULL, period_end TEXT NOT NULL,
  net_grams INTEGER NOT NULL, amount_paisa INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('accruing','due','received')), received_date TEXT, settle TEXT, note TEXT
);

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY, no TEXT NOT NULL UNIQUE, date TEXT NOT NULL, company_id INTEGER NOT NULL REFERENCES companies(id), supplier_invoice TEXT,
  total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')), cancel_reason TEXT, created_by INTEGER NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
);
CREATE TABLE stock_lots (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), purchase_id INTEGER REFERENCES purchases(id),
  source TEXT NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase','adjustment','return','opening')),
  received_date TEXT NOT NULL, expiry_date TEXT,
  qty_received INTEGER NOT NULL CHECK (qty_received >= 0), qty_remaining INTEGER NOT NULL CHECK (qty_remaining >= 0),
  unit_cost INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX ix_lots_pick ON stock_lots(product_id, qty_remaining, expiry_date, received_date);
CREATE TABLE purchase_items (id INTEGER PRIMARY KEY, purchase_id INTEGER NOT NULL REFERENCES purchases(id), product_id INTEGER NOT NULL REFERENCES products(id), qty_base INTEGER NOT NULL, unit_cost INTEGER NOT NULL, line_total INTEGER NOT NULL, lot_id INTEGER REFERENCES stock_lots(id));

CREATE TABLE stock_adjustments (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), lot_id INTEGER REFERENCES stock_lots(id), delta_base INTEGER NOT NULL, reason TEXT NOT NULL, by_user INTEGER NOT NULL REFERENCES users(id), ts INTEGER NOT NULL);
CREATE TABLE stock_counts (id INTEGER PRIMARY KEY, date TEXT NOT NULL, by_user INTEGER NOT NULL REFERENCES users(id), ts INTEGER NOT NULL);
CREATE TABLE stock_count_items (id INTEGER PRIMARY KEY, count_id INTEGER NOT NULL REFERENCES stock_counts(id), product_id INTEGER NOT NULL REFERENCES products(id), expected_base INTEGER NOT NULL, counted_base INTEGER NOT NULL);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, owner_name TEXT, phone TEXT, area TEXT, address TEXT, route TEXT, credit_limit INTEGER, opening_due INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE INDEX ix_customers_phone ON customers(phone);

CREATE TABLE sales (
  id INTEGER PRIMARY KEY, invoice_no TEXT NOT NULL UNIQUE, date TEXT NOT NULL, ts INTEGER NOT NULL, customer_id INTEGER NOT NULL REFERENCES customers(id),
  subtotal INTEGER NOT NULL, line_discount INTEGER NOT NULL DEFAULT 0, invoice_discount_type TEXT, invoice_discount_input INTEGER, invoice_discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,                -- paid AT SALE TIME; later payments live in payments/allocations
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled')),
  salesman_id INTEGER REFERENCES employees(id), created_by INTEGER NOT NULL REFERENCES users(id),
  cancel_reason TEXT, cancelled_by INTEGER REFERENCES users(id), cancelled_at INTEGER, print_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_sales_date ON sales(date); CREATE INDEX ix_sales_customer ON sales(customer_id);
CREATE TABLE sale_items (
  id INTEGER PRIMARY KEY, sale_id INTEGER NOT NULL REFERENCES sales(id), line_no INTEGER NOT NULL, product_id INTEGER NOT NULL REFERENCES products(id),
  qty_base INTEGER NOT NULL CHECK (qty_base > 0), list_price INTEGER NOT NULL, gross INTEGER NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none','per_unit','percent','line')), discount_input INTEGER NOT NULL DEFAULT 0, discount_paisa INTEGER NOT NULL DEFAULT 0,
  net INTEGER NOT NULL, cost_snapshot INTEGER NOT NULL DEFAULT 0, over_cap INTEGER NOT NULL DEFAULT 0, returned_base INTEGER NOT NULL DEFAULT 0,
  UNIQUE (sale_id, line_no)
);
CREATE TABLE sale_item_lots (id INTEGER PRIMARY KEY, sale_item_id INTEGER NOT NULL REFERENCES sale_items(id), lot_id INTEGER NOT NULL REFERENCES stock_lots(id), qty_base INTEGER NOT NULL CHECK (qty_base > 0), unit_cost INTEGER NOT NULL);
CREATE TABLE discount_overrides (id INTEGER PRIMARY KEY, sale_item_id INTEGER NOT NULL REFERENCES sale_items(id), requested_per_unit INTEGER NOT NULL, allowed_per_unit INTEGER NOT NULL, approved_by INTEGER NOT NULL REFERENCES users(id), reason TEXT NOT NULL, ts INTEGER NOT NULL);

CREATE TABLE returns (
  id INTEGER PRIMARY KEY, no TEXT NOT NULL UNIQUE, sale_id INTEGER NOT NULL REFERENCES sales(id), date TEXT NOT NULL, ts INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('expired','damaged','unsold','wrong_item','other')), note TEXT,
  destination TEXT NOT NULL CHECK (destination IN ('good','damaged')), refund TEXT NOT NULL DEFAULT 'ledger' CHECK (refund IN ('ledger','cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), value INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id), approved_by INTEGER REFERENCES users(id), decided_at INTEGER, reject_reason TEXT
);
CREATE TABLE return_items (id INTEGER PRIMARY KEY, return_id INTEGER NOT NULL REFERENCES returns(id), sale_item_id INTEGER NOT NULL REFERENCES sale_items(id), qty_base INTEGER NOT NULL CHECK (qty_base > 0), value INTEGER NOT NULL);

-- Payments: both directions. Append-only; reversal is a status change + reversing ledger rows.
CREATE TABLE payments (
  id INTEGER PRIMARY KEY, receipt_no TEXT NOT NULL UNIQUE, date TEXT NOT NULL, ts INTEGER NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('customer','company')), party_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), method TEXT NOT NULL CHECK (method IN ('cash','bkash','nagad','bank','cheque')),
  ref TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reversed')),
  created_by INTEGER NOT NULL REFERENCES users(id), reversed_by INTEGER REFERENCES users(id), reversed_at INTEGER, reverse_reason TEXT, print_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_payments_party ON payments(party_type, party_id); CREATE INDEX ix_payments_date ON payments(date);
CREATE TABLE payment_allocations (id INTEGER PRIMARY KEY, payment_id INTEGER NOT NULL REFERENCES payments(id), sale_id INTEGER REFERENCES sales(id), purchase_id INTEGER REFERENCES purchases(id), opening INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL CHECK (amount > 0));
CREATE TABLE cheques (id INTEGER PRIMARY KEY, payment_id INTEGER NOT NULL REFERENCES payments(id), no TEXT NOT NULL, bank TEXT, deposit_date TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cleared','bounced')), note TEXT, updated_at INTEGER);

-- Ledger: the only source for balances. due = SUM(debit) - SUM(credit).
CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY, party_type TEXT NOT NULL CHECK (party_type IN ('customer','company')), party_id INTEGER NOT NULL, date TEXT NOT NULL, ts INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('opening','sale','payment','return','refund','cancel','reversal','purchase','commission')),
  ref_type TEXT, ref_id INTEGER, ref TEXT, debit INTEGER NOT NULL DEFAULT 0 CHECK (debit >= 0), credit INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0), created_by INTEGER REFERENCES users(id)
);
CREATE INDEX ix_ledger_party ON ledger_entries(party_type, party_id, date);

CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, phone TEXT, van TEXT, salary INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE employee_ledger (id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id), date TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('salary','advance','commission','advance_recovered')), amount INTEGER NOT NULL, month TEXT, note TEXT, created_by INTEGER REFERENCES users(id));
CREATE TABLE expenses (id INTEGER PRIMARY KEY, date TEXT NOT NULL, ts INTEGER NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0), note TEXT, created_by INTEGER NOT NULL REFERENCES users(id));

CREATE TABLE load_sheets (id INTEGER PRIMARY KEY, date TEXT NOT NULL, van TEXT NOT NULL DEFAULT 'van1', submitted INTEGER NOT NULL DEFAULT 0, submitted_by INTEGER REFERENCES users(id), ts INTEGER, UNIQUE (date, van));
CREATE TABLE load_sheet_items (id INTEGER PRIMARY KEY, load_sheet_id INTEGER NOT NULL REFERENCES load_sheets(id), product_id INTEGER NOT NULL REFERENCES products(id), loaded_base INTEGER NOT NULL DEFAULT 0, counted_base INTEGER, UNIQUE (load_sheet_id, product_id));
CREATE TABLE cash_closes (id INTEGER PRIMARY KEY, date TEXT NOT NULL UNIQUE, expected INTEGER NOT NULL, counted INTEGER NOT NULL, difference INTEGER NOT NULL, note TEXT, created_by INTEGER NOT NULL REFERENCES users(id), ts INTEGER NOT NULL);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, user_id INTEGER, user_name TEXT NOT NULL, role TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT,
  old_json TEXT, new_json TEXT, reason TEXT, flag INTEGER NOT NULL DEFAULT 0, flag_kind TEXT, prev_hash TEXT NOT NULL, hash TEXT NOT NULL
);
CREATE INDEX ix_audit_ts ON audit_log(ts); CREATE INDEX ix_audit_flag ON audit_log(flag, ts);

CREATE TABLE backups (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, bytes INTEGER NOT NULL, products INTEGER, invoices INTEGER, verified INTEGER NOT NULL DEFAULT 0, reason TEXT, drive_state TEXT NOT NULL DEFAULT 'none' CHECK (drive_state IN ('none','queued','uploaded','failed')), drive_file_id TEXT);

-- ---------- append-only guards ----------
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT, 'payments are never deleted'); END;
CREATE TRIGGER payments_immutable_core BEFORE UPDATE OF amount, method, party_type, party_id, date, receipt_no ON payments BEGIN SELECT RAISE(ABORT, 'payment core fields are immutable'); END;
CREATE TRIGGER sales_no_delete BEFORE DELETE ON sales BEGIN SELECT RAISE(ABORT, 'sales are never deleted'); END;
CREATE TRIGGER sale_items_core_immutable BEFORE UPDATE OF qty_base, list_price, gross, discount_type, discount_input, discount_paisa, net, cost_snapshot, product_id ON sale_items BEGIN SELECT RAISE(ABORT, 'saved invoice lines are immutable'); END;
CREATE TRIGGER sale_items_no_delete BEFORE DELETE ON sale_items BEGIN SELECT RAISE(ABORT, 'saved invoice lines are immutable'); END;
CREATE TRIGGER lots_nonneg BEFORE UPDATE OF qty_remaining ON stock_lots WHEN NEW.qty_remaining < 0 BEGIN SELECT RAISE(ABORT, 'lot cannot go negative'); END;

-- ---------- derived views (read-only helpers; services may use their own queries) ----------
CREATE VIEW v_customer_due AS
  SELECT c.id AS customer_id, COALESCE(SUM(l.debit) - SUM(l.credit), 0) AS due FROM customers c LEFT JOIN ledger_entries l ON l.party_type = 'customer' AND l.party_id = c.id GROUP BY c.id;
CREATE VIEW v_company_due AS
  SELECT c.id AS company_id, COALESCE(SUM(l.credit) - SUM(l.debit), 0) AS due FROM companies c LEFT JOIN ledger_entries l ON l.party_type = 'company' AND l.party_id = c.id GROUP BY c.id;
CREATE VIEW v_product_stock AS
  SELECT p.id AS product_id, COALESCE(SUM(l.qty_remaining), 0) AS stock_base FROM products p LEFT JOIN stock_lots l ON l.product_id = p.id GROUP BY p.id;
-- Sign convention (one place, test it):
--   customer ledger: debit  = customer owes more (sale, payment reversal, bounced cheque, cancelled return); credit = customer owes less (payment, approved return/credit note).  due = SUM(debit) - SUM(credit).
--   company ledger : credit = we owe more (purchase, opening due);  debit = we owe less (payment to company, commission offset).  due(we owe) = SUM(credit) - SUM(debit).
