-- Add delivery address to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add address to customers directory
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;