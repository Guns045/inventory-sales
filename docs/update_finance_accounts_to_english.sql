-- Update Finance Account Names from Indonesian to English
-- Run this query in your MySQL database

UPDATE finance_accounts 
SET name = CASE 
    WHEN name = 'Kas Besar' THEN 'Main Cash'
    WHEN name = 'Kas Kecil' THEN 'Petty Cash'
    WHEN name = 'Bank BCA' THEN 'Bank BCA'
    WHEN name = 'Bank Mandiri' THEN 'Bank Mandiri'
    ELSE name
END
WHERE name IN ('Kas Besar', 'Kas Kecil', 'Bank BCA', 'Bank Mandiri');

-- Verify the changes
SELECT id, name, type, balance FROM finance_accounts;
