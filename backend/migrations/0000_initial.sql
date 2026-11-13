CREATE TABLE `categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `categories_user_id_idx` ON `categories` (`user_id`);

CREATE TABLE `accounts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `balance` integer DEFAULT 0 NOT NULL,
  `currency` text DEFAULT 'USD' NOT NULL,
  `statement_balance` integer,
  `due_date` integer,
  `default_category_id` integer,
  `is_pinned` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`)
);

CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);

CREATE TABLE `transactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `date` integer NOT NULL,
  `description` text NOT NULL,
  `amount` integer NOT NULL,
  `category_id` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);

CREATE INDEX `transactions_user_id_idx` ON `transactions` (`user_id`);
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);

CREATE TABLE `transaction_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `transaction_id` integer NOT NULL,
  `account_id` integer NOT NULL,
  `type` text NOT NULL,
  `amount` integer NOT NULL,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE
);

CREATE INDEX `transaction_entries_transaction_id_idx`
  ON `transaction_entries` (`transaction_id`);

CREATE TABLE `budgets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `category_id` integer NOT NULL,
  `amount` integer NOT NULL,
  `period` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);

CREATE INDEX `budgets_user_id_idx` ON `budgets` (`user_id`);

CREATE TABLE `goals` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `target_amount` integer NOT NULL,
  `current_amount` integer DEFAULT 0 NOT NULL,
  `account_id` integer,
  `completed` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
);

CREATE INDEX `goals_user_id_idx` ON `goals` (`user_id`);

CREATE TABLE `user_settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL UNIQUE,
  `currency` text DEFAULT 'USD' NOT NULL,
  `show_net_worth` integer DEFAULT 1 NOT NULL,
  `show_monthly_spending` integer DEFAULT 1 NOT NULL,
  `show_defined_net_worth` integer DEFAULT 0 NOT NULL,
  `defined_net_worth_includes` text DEFAULT '[]',
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE `recurring_transactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `description` text NOT NULL,
  `amount` integer NOT NULL,
  `category_id` integer,
  `type` text NOT NULL,
  `from_account_id` integer,
  `to_account_id` integer,
  `frequency` text NOT NULL,
  `next_run_date` integer NOT NULL,
  `last_run_date` integer,
  `active` integer DEFAULT 1 NOT NULL,
  `total_occurrences` integer,
  `completed_occurrences` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
  FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`),
  FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`)
);

CREATE INDEX `recurring_transactions_user_id_idx`
  ON `recurring_transactions` (`user_id`);

CREATE TABLE `shortcuts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `icon` text,
  `from_account_id` integer NOT NULL,
  `to_account_id` integer NOT NULL,
  `category_id` integer,
  `type` text DEFAULT 'withdrawal' NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`),
  FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);

CREATE INDEX `shortcuts_user_id_idx` ON `shortcuts` (`user_id`);
