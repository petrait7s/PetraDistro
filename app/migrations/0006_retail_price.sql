ALTER TABLE products ADD COLUMN retail_price INTEGER CHECK(retail_price IS NULL OR retail_price>=0);
