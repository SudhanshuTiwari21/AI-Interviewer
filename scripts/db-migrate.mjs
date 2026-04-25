#!/usr/bin/env node
/**
 * Apply raw SQL migrations from ./drizzle/*.sql in lexical order.
 * Tracks applied files in a "_hiro_migrations" table.
 *
 * Usage:
 *   npm run db:migrate
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "drizzle");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set. Add it to .env.local.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "_hiro_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await client.query(
    `SELECT name FROM "_hiro_migrations"`,
  );
  const applied = new Set(rows.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`→ applying ${file}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO "_hiro_migrations" (name) VALUES ($1)`,
        [file],
      );
      await client.query("COMMIT");
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`✗ failed: ${file}`);
      console.error(err);
      process.exit(1);
    }
  }

  await client.end();
  console.log(
    ran === 0
      ? "✓ database is up to date (no new migrations)"
      : `✓ applied ${ran} migration${ran === 1 ? "" : "s"}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
