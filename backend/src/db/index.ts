import { drizzle } from "drizzle-orm/d1";
import { schema } from "./schema";

export type Database = D1Database;

export function createDb(database: Database) {
  return drizzle(database, { schema });
}
