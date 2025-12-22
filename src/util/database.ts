import pkg from "pg";
const { Pool } = pkg;

// Create pool connection using env variables
const pool = new Pool({
  user: "nn",
  host: "172.235.60.152",
  database: "nnnn",
  password: "nnn",
  port: 5432,
  max: 40,
  idleTimeoutMillis: 30000,         // 30 seconds
  connectionTimeoutMillis: 8000,    // 8 seconds
});

const client = await pool.connect();

export default client;
