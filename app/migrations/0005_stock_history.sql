CREATE TABLE stock_history(id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL,lot_id INTEGER NOT NULL,date TEXT NOT NULL,ts INTEGER NOT NULL,delta INTEGER NOT NULL,cost_delta INTEGER NOT NULL,operation TEXT NOT NULL);
CREATE INDEX ix_stock_history_product_date ON stock_history(product_id,date);
CREATE TRIGGER lot_history_insert AFTER INSERT ON stock_lots BEGIN
 INSERT INTO stock_history(product_id,lot_id,date,ts,delta,cost_delta,operation) VALUES(NEW.product_id,NEW.id,COALESCE(json_extract((SELECT value FROM settings WHERE key='system.tx'),'$.date'),NEW.received_date),NEW.created_at,NEW.qty_remaining,NEW.cost_remaining,COALESCE(json_extract((SELECT value FROM settings WHERE key='system.tx'),'$.method'),'migration'));
END;
CREATE TRIGGER lot_history_update AFTER UPDATE OF qty_remaining,cost_remaining ON stock_lots WHEN NEW.qty_remaining!=OLD.qty_remaining OR NEW.cost_remaining!=OLD.cost_remaining BEGIN
 INSERT INTO stock_history(product_id,lot_id,date,ts,delta,cost_delta,operation) VALUES(NEW.product_id,NEW.id,COALESCE(json_extract((SELECT value FROM settings WHERE key='system.tx'),'$.date'),NEW.received_date),COALESCE(json_extract((SELECT value FROM settings WHERE key='system.tx'),'$.ts'),NEW.created_at),NEW.qty_remaining-OLD.qty_remaining,NEW.cost_remaining-OLD.cost_remaining,COALESCE(json_extract((SELECT value FROM settings WHERE key='system.tx'),'$.method'),'migration'));
END;
CREATE TRIGGER stock_history_no_update BEFORE UPDATE ON stock_history BEGIN SELECT RAISE(ABORT,'stock history immutable'); END;
CREATE TRIGGER stock_history_no_delete BEFORE DELETE ON stock_history BEGIN SELECT RAISE(ABORT,'stock history immutable'); END;
