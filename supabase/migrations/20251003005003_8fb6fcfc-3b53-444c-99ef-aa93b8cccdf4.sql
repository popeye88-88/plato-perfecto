-- Add fields to orders table for edit history and discounts
ALTER TABLE orders 
ADD COLUMN edited BOOLEAN DEFAULT false,
ADD COLUMN discount_amount NUMERIC DEFAULT 0,
ADD COLUMN discount_reason TEXT;

-- Create table for order edit history
CREATE TABLE order_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  edited_by TEXT,
  edit_type TEXT NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on order_edit_history
ALTER TABLE order_edit_history ENABLE ROW LEVEL SECURITY;

-- Create policies for order_edit_history
CREATE POLICY "Order edit history is viewable by everyone"
  ON order_edit_history FOR SELECT
  USING (true);

CREATE POLICY "Order edit history can be created by everyone"
  ON order_edit_history FOR INSERT
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_order_edit_history_order_id ON order_edit_history(order_id);
CREATE INDEX idx_order_edit_history_created_at ON order_edit_history(created_at DESC);