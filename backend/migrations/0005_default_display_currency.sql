ALTER TABLE `accounts` ADD COLUMN `creation_key` text;
CREATE UNIQUE INDEX `accounts_creation_key_idx` ON `accounts` (`creation_key`);

-- Account currency is retained as a compatibility/display field only. Existing
-- numeric amounts are not converted; align labels with each user's preference.
UPDATE `accounts`
SET `currency` = COALESCE((SELECT `currency` FROM `user_settings` WHERE `user_settings`.`user_id` = `accounts`.`user_id`), 'USD');
