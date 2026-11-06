ALTER TABLE stock_lots ADD COLUMN cost_remaining INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sale_item_lots ADD COLUMN cost_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employee_ledger ADD COLUMN reversed_at INTEGER;
ALTER TABLE employee_ledger ADD COLUMN linked_id INTEGER;
CREATE TABLE employee_corrections(id INTEGER PRIMARY KEY,entry_id INTEGER NOT NULL UNIQUE REFERENCES employee_ledger(id),reason TEXT NOT NULL,date TEXT NOT NULL,ts INTEGER NOT NULL,user_id INTEGER NOT NULL);
CREATE TRIGGER closed_commission_immutable BEFORE UPDATE OF rule_id,period_start,period_end,net_grams,amount_paisa ON commission_accruals BEGIN SELECT RAISE(ABORT,'closed accrual immutable'); END;
CREATE TRIGGER closed_commission_no_delete BEFORE DELETE ON commission_accruals BEGIN SELECT RAISE(ABORT,'closed accrual immutable'); END;
CREATE TRIGGER cash_revision_immutable BEFORE UPDATE ON cash_close_revisions BEGIN SELECT RAISE(ABORT,'revision immutable'); END;
CREATE TRIGGER cash_revision_no_delete BEFORE DELETE ON cash_close_revisions BEGIN SELECT RAISE(ABORT,'revision immutable'); END;
