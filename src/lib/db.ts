import { Pool } from "pg";

let pool: Pool;

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/tastechain",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  if (!global.__dbPool) {
    global.__dbPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/tastechain",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  pool = global.__dbPool;
}

export default pool;

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 200) {
    console.log("Slow query:", { text, duration, rows: res.rowCount });
  }
  return res.rows;
}
