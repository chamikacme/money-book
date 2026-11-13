-- Repeatable local-only seed data for Clerk user: user_36WLuhYCq50DdgVZYuUQUGRmMpc.
-- This script intentionally clears only rows belonging to user_36WLuhYCq50DdgVZYuUQUGRmMpc.

PRAGMA foreign_keys = ON;

-- This is a disposable local database. Clear all local rows so the fixed
-- fixture IDs below remain deterministic. Never run this against production.
DELETE FROM transaction_entries;
DELETE FROM transactions;
DELETE FROM budgets;
DELETE FROM recurring_transactions;
DELETE FROM shortcuts;
DELETE FROM goals;
DELETE FROM user_settings;
DELETE FROM accounts;
DELETE FROM categories;

DELETE FROM transaction_entries
WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc');
DELETE FROM transactions WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM budgets WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM recurring_transactions WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM shortcuts WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM goals WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM user_settings WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM accounts WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';
DELETE FROM categories WHERE user_id = 'user_36WLuhYCq50DdgVZYuUQUGRmMpc';

INSERT INTO categories (id, user_id, name, type, created_at) VALUES
  (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Salary', 'revenue', unixepoch() * 1000),
  (2, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Food', 'expense', unixepoch() * 1000),
  (3, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Housing', 'expense', unixepoch() * 1000),
  (4, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Savings', 'expense', unixepoch() * 1000);

INSERT INTO accounts (id, user_id, name, type, balance, currency, is_pinned, created_at, updated_at) VALUES
  (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Checking', 'asset', 245000, 'USD', 1, unixepoch() * 1000, unixepoch() * 1000),
  (2, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Credit Card', 'liability', 12500, 'USD', 1, unixepoch() * 1000, unixepoch() * 1000),
  (3, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Emergency Savings', 'asset', 50000, 'USD', 1, unixepoch() * 1000, unixepoch() * 1000),
  (4, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Salary', 'revenue', 300000, 'USD', 0, unixepoch() * 1000, unixepoch() * 1000),
  (5, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Food Expense', 'expense', 17500, 'USD', 0, unixepoch() * 1000, unixepoch() * 1000),
  (6, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Holiday Fund', 'asset', 25000, 'USD', 0, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO accounts (id, user_id, name, type, balance, currency, is_pinned, created_at, updated_at)
VALUES (7, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Housing Expense', 'expense', 120000, 'USD', 0, unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO transactions (id, user_id, date, description, amount, category_id, created_at) VALUES
  (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-18 days') * 1000, 'Monthly salary', 300000, 1, unixepoch() * 1000),
  (2, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-12 days') * 1000, 'Grocery shopping', 7500, 2, unixepoch() * 1000),
  (3, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-8 days') * 1000, 'Rent payment', 120000, 3, unixepoch() * 1000),
  (4, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-5 days') * 1000, 'Restaurant dinner', 10000, 2, unixepoch() * 1000),
  (5, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-2 days') * 1000, 'Move money to savings', 50000, 4, unixepoch() * 1000),
  (6, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', unixepoch('now', '-1 day') * 1000, 'Credit card purchase', 12500, 2, unixepoch() * 1000);

INSERT INTO transaction_entries (id, transaction_id, account_id, type, amount) VALUES
  (1, 1, 4, 'credit', 300000), (2, 1, 1, 'debit', 300000),
  (3, 2, 1, 'credit', 7500), (4, 2, 5, 'debit', 7500),
  (5, 3, 1, 'credit', 120000), (6, 3, 7, 'debit', 120000),
  (7, 4, 1, 'credit', 10000), (8, 4, 5, 'debit', 10000),
  (9, 5, 1, 'credit', 50000), (10, 5, 3, 'debit', 50000),
  (11, 6, 2, 'credit', 12500), (12, 6, 5, 'debit', 12500);

INSERT INTO budgets (id, user_id, category_id, amount, period, created_at)
VALUES (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 2, 60000, 'monthly', unixepoch() * 1000),
       (2, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 3, 150000, 'monthly', unixepoch() * 1000);

INSERT INTO goals (id, user_id, name, target_amount, current_amount, account_id, completed, created_at)
VALUES (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Holiday Fund', 100000, 25000, 6, 0, unixepoch() * 1000);

INSERT INTO recurring_transactions (id, user_id, description, amount, category_id, type, from_account_id, to_account_id, frequency, next_run_date, active, completed_occurrences, created_at)
VALUES (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Monthly rent', 120000, 3, 'withdrawal', 1, 7, 'monthly', unixepoch('now', '+12 days') * 1000, 1, 0, unixepoch() * 1000);

INSERT INTO shortcuts (id, user_id, name, description, icon, from_account_id, to_account_id, category_id, type, created_at)
VALUES (1, 'user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'Quick grocery', 'Record a grocery purchase', '🛒', 1, 5, 2, 'withdrawal', unixepoch() * 1000);

INSERT INTO user_settings (user_id, currency, show_net_worth, show_monthly_spending, show_defined_net_worth, defined_net_worth_includes, created_at, updated_at)
VALUES ('user_36WLuhYCq50DdgVZYuUQUGRmMpc', 'USD', 1, 1, 0, '[]', unixepoch() * 1000, unixepoch() * 1000);

