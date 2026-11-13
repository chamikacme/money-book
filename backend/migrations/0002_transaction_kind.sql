ALTER TABLE `transactions` ADD COLUMN `kind` text NOT NULL DEFAULT 'unknown';

-- Reclassify only legacy rows with clear ledger evidence. Rows involving only
-- balance-sheet accounts are transfers; an expense/revenue ledger account is
-- strong evidence of an outflow/inflow. Leave other shapes explicitly unknown.
UPDATE `transactions`
SET `kind` = 'transfer'
WHERE EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type IN ('asset', 'liability')
)
AND NOT EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type IN ('expense', 'revenue')
);

UPDATE `transactions`
SET `kind` = 'withdrawal'
WHERE EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type = 'expense'
)
AND NOT EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type = 'revenue'
);

UPDATE `transactions`
SET `kind` = 'deposit'
WHERE EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type = 'revenue'
)
AND NOT EXISTS (
  SELECT 1 FROM `transaction_entries` e
  JOIN `accounts` a ON a.id = e.account_id
  WHERE e.transaction_id = transactions.id AND a.type = 'expense'
);
