import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Make database optional in development - prefer MemStorage per guidelines
let client: Client | undefined;
let db: ReturnType<typeof drizzle> | undefined;

if (process.env.DATABASE_URL) {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  client.connect().catch(console.error);
  db = drizzle(client, { schema });
  console.log("Connected to PostgreSQL database");
} else {
  console.log("DATABASE_URL not set - using MemStorage for data persistence");
}

export { client, db };