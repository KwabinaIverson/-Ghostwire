import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import dotenv from 'dotenv';


dotenv.config();

/**
 * Database is a simple singleton wrapper around a MySQL connection pool.
 *
 * Responsibilities:
 * - Initialize a single connection pool using environment variables.
 * - Provide a generic `query<T>` helper that executes parameterized SQL
 *   using prepared statements (via `execute`) to reduce risk of SQL injection.
 *
 * Environment variables:
 * - DB_HOST (default: 'localhost')
 * - DB_USER (default: 'root')
 * - DB_PASSWORD (default: '')
 * - DB_NAME (default: 'ghostwire')
 *
 * Notes:
 * - This class intentionally exposes only static methods so it can be used
 *   across the codebase without instantiating.
 * - The `query<T>` method returns rows cast to `T`. For queries that return
 *   metadata (INSERT/UPDATE) the underlying result may be `ResultSetHeader`.
 */
export class Database {
  /**
   * Internal MySQL connection pool (singleton).
   * Initialized by `init()` on first use.
   */
  private static _pool: Pool;

  /**
   * Initialize the connection pool if not already initialized.
   *
   * This uses the `mysql2/promise` pool interface and reads connection
   * information from environment variables (see class description).
   *
   * Safe to call multiple times; subsequent calls do nothing if the pool
   * has already been created.
   */
  public static init(): void {
    if (this._pool) return; // Already initialized

    this._pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ghostwire',
      waitForConnections: true,
      connectionLimit: 10, // Max 10 simultaneous connections
      queueLimit: 0
    });

    console.log("MySQL Connection Pool Initialized");
  }

  /**
   * Executes a parameterized SQL statement and returns typed results.
   *
   * @template T - The expected return type (e.g., `RowDataPacket[]`, `MyType[]`, or `ResultSetHeader`).
   * @param sql - SQL query string (use `?` placeholders for parameters).
   * @param params - Optional array of parameter values to bind to placeholders.
   * @returns A Promise resolving to the query result cast to `T`.
   *
   * Behavior:
   * - Ensures the pool is initialized before executing.
   * - Uses `execute()` to leverage prepared statements.
   * - On error, logs the underlying error and throws a generic `Error`
   *   to avoid leaking internal database details upstream.
   */
  public static async query<T>(sql: string, params?: any[], conn?: PoolConnection): Promise<T> {
    if (!this._pool) {
      this.init();
    }

    try {
      // If a connection is supplied (transaction), use it; otherwise use the pool
      if (conn) {
        const [rows] = await conn.execute(sql, params);
        return rows as T;
      }
      const [rows] = await this._pool.execute(sql, params);
      return rows as T;
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  }

  /**
   * Run a callback within a DB transaction (auto-commit/rollback).
   * Example: await Database.transaction(conn => { await Database.query(sql, params, conn); });
   */
  public static async transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    if (!this._pool) this.init();
    const conn = await this._pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      try { await conn.rollback(); } catch (e) { /* ignore */ }
      throw err;
    } finally {
      conn.release();
    }
  }
}