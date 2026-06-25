const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config();

async function runSchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running db:migrate.");
  }

  const schemaPath = path.resolve(__dirname, "../src/database/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });

  try {
    await client.connect();

    // This keeps your live table structure in sync with the schema file in the repo.
    await client.query(schemaSql);

    console.log("Schema migration completed successfully.");
  } finally {
    await client.end();
  }
}

runSchema().catch((error) => {
  console.error("Schema migration failed.");
  console.error(error);
  process.exit(1);
});
