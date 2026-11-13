ALTER TABLE `accounts` ADD COLUMN `is_system` integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX `accounts_user_system_idx` ON `accounts` (`user_id`) WHERE `is_system` = 1;
ALTER TABLE `transactions` ADD COLUMN `posting_key` text;
CREATE UNIQUE INDEX `transactions_posting_key_idx` ON `transactions` (`posting_key`);
ALTER TABLE `transaction_entries` ADD COLUMN `date` integer;
UPDATE `transaction_entries`
SET `date` = (SELECT `date` FROM `transactions` WHERE `transactions`.`id` = `transaction_entries`.`transaction_id`);

-- Each user gets a hidden equity account used to balance opening balances.
INSERT INTO `accounts` (`user_id`, `name`, `type`, `balance`, `currency`, `is_system`)
SELECT owner.`user_id`, 'Opening Balances', 'equity', 0, COALESCE((SELECT `currency` FROM `user_settings` WHERE `user_id` = owner.`user_id`), 'USD'), 1
FROM (SELECT `user_id` FROM `accounts` UNION SELECT `id` AS `user_id` FROM `users`) owner;

-- Backfill an opening entry equal to the difference between each legacy cached
-- balance and the net effect of its existing dated ledger entries.
INSERT INTO `transactions` (`user_id`, `date`, `description`, `amount`, `kind`, `posting_key`)
SELECT a.`user_id`, a.`created_at`, 'Opening balance', abs(a.`balance` - COALESCE(m.`movement`, 0)), 'opening_balance', 'opening:' || a.`id`
FROM `accounts` a
LEFT JOIN (
  SELECT e.`account_id`, SUM(CASE
    WHEN (a.`type` IN ('asset', 'expense') AND e.`type` = 'debit') OR (a.`type` IN ('liability', 'revenue', 'equity') AND e.`type` = 'credit') THEN e.`amount`
    ELSE -e.`amount`
  END) AS `movement`
  FROM `transaction_entries` e JOIN `accounts` a ON a.`id` = e.`account_id`
  GROUP BY e.`account_id`
) m ON m.`account_id` = a.`id`
WHERE a.`is_system` = 0 AND a.`balance` - COALESCE(m.`movement`, 0) != 0;

INSERT INTO `transaction_entries` (`transaction_id`, `account_id`, `type`, `amount`, `date`)
SELECT t.`id`, a.`id`,
  CASE WHEN (a.`type` IN ('asset', 'expense') AND a.`balance` - COALESCE(m.`movement`, 0) > 0)
    OR (a.`type` IN ('liability', 'revenue') AND a.`balance` - COALESCE(m.`movement`, 0) < 0) THEN 'debit' ELSE 'credit' END,
  abs(a.`balance` - COALESCE(m.`movement`, 0)), t.`date`
FROM `transactions` t JOIN `accounts` a ON t.`posting_key` = 'opening:' || a.`id`
LEFT JOIN (
  SELECT e.`account_id`, SUM(CASE
    WHEN (a.`type` IN ('asset', 'expense') AND e.`type` = 'debit') OR (a.`type` IN ('liability', 'revenue', 'equity') AND e.`type` = 'credit') THEN e.`amount`
    ELSE -e.`amount`
  END) AS `movement`
  FROM `transaction_entries` e JOIN `accounts` a ON a.`id` = e.`account_id`
  GROUP BY e.`account_id`
) m ON m.`account_id` = a.`id`;

-- Post the exact counter-entry to the hidden equity account and seed its cache.
INSERT INTO `transaction_entries` (`transaction_id`, `account_id`, `type`, `amount`, `date`)
SELECT t.`id`, equity.`id`, CASE WHEN e.`type` = 'debit' THEN 'credit' ELSE 'debit' END, e.`amount`, e.`date`
FROM `transactions` t JOIN `transaction_entries` e ON e.`transaction_id` = t.`id`
JOIN `accounts` a ON a.`id` = e.`account_id` AND a.`is_system` = 0
JOIN `accounts` equity ON equity.`user_id` = a.`user_id` AND equity.`is_system` = 1
WHERE t.`kind` = 'opening_balance';

UPDATE `accounts` SET `balance` = COALESCE((
  SELECT SUM(CASE
    WHEN (accounts.`type` IN ('asset', 'expense') AND e.`type` = 'debit') OR (accounts.`type` IN ('liability', 'revenue', 'equity') AND e.`type` = 'credit') THEN e.`amount`
    ELSE -e.`amount`
  END) FROM `transaction_entries` e WHERE e.`account_id` = accounts.`id`
), 0);

CREATE INDEX `transaction_entries_account_date_idx` ON `transaction_entries` (`account_id`, `date`);
