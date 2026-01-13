-- Fix form_type column size - was VARCHAR(10) but form types like 'special_order' are longer
ALTER TABLE order_number_sequences 
ALTER COLUMN form_type TYPE VARCHAR(30);
