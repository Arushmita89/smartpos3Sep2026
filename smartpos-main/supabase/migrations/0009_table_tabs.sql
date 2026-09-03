-- Add table_number and tab_number to orders table
-- These already exist in the database schema

ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tab_number INTEGER;

-- Index for fast lookups by table
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_tab ON orders(table_number, tab_number);
