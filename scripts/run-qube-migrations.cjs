const path = require('node:path');
const { createRequire } = require('node:module');

const requireApi = createRequire(path.join(__dirname, '../apps/api/package.json'));
const { Pool } = requireApi('pg');
const { drizzle } = requireApi('drizzle-orm/node-postgres');
const { migrate } = requireApi('drizzle-orm/node-postgres/migrator');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Qube database migrations failed: DATABASE_URL is required.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
});
let client;
let lockAcquired = false;

async function runMigrations() {
  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock(hashtext('qube:drizzle:migrations'))");
    lockAcquired = true;

    await migrate(drizzle(client), {
      migrationsFolder: path.join(__dirname, '../apps/api/drizzle'),
    });
    console.log('Qube database migrations completed successfully.');
  } catch (error) {
    console.error('Qube database migrations failed with the original database error:');
    console.error(error?.stack || error);
    process.exitCode = 1;
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext('qube:drizzle:migrations'))");
      } catch (error) {
        console.error('Could not release the Qube migration advisory lock:', error?.message || error);
        process.exitCode = 1;
      }
    }
    client?.release();
    await pool.end();
  }
}

void runMigrations();
