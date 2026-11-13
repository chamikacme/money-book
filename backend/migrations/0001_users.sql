CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text,
  `display_name` text,
  `image_url` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
