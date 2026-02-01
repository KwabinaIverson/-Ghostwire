import { Database } from "../config/Database.ts";
import { User } from "../domain/User.ts";
import type { ResultSetHeader, RowDataPacket } from "mysql2";


/**
 * Repository responsible for CRUD operations for `User` entities.
 *
 * Uses the `Database` singleton to run parameterized SQL statements.
 *
 * Note: This implementation assumes the `User` domain object exposes
 * the necessary data (id, username, email, createdAt) either via public
 * getters or a persistence-friendly API. The current code contains
 * small "access hacks" to reach private fields — consider adding a
 * `User.toPersistence()` or `User.fromDatabase()` factory for correctness.
 */
export class UserRepository {
  /**
   * Persist a new user to the database.
   *
   * @param user - Domain `User` instance (must be validated before calling).
   * @returns A promise that resolves when the insert completes.
   * @throws Error when the underlying database operation fails.
   *
   * Notes:
   * - Uses a parameterized INSERT to avoid SQL injection.
   * - Current code reads the password hash via a private-field access hack:
   *   `(user as any)._passwordHash`. It's safer to expose a controlled accessor
   *   or convert the entity to a plain object before persisting.
   */
  public async save(user: User): Promise<User> {
    const sql = `
      INSERT INTO users (id, username, email, password_hash, avatar_url, color, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await Database.query<ResultSetHeader>(sql, [
      user.id, // UUIDv4 (ensure `id` is accessible or add a getter)
      user.username,
      user.email,
      (user as any)._passwordHash, // TODO: replace with a safe accessor
      user.avatarUrl || null,
      user.color || null,
      user.createdAt
    ]);

    // Re-fetch the saved user from the DB to ensure the in-memory object reflects
    // persisted values (id, createdAt, updatedAt, etc.). This guarantees the id
    // used in JWT tokens and responses matches the DB value.
    const saved = await this.findByEmail(user.email);
    if (!saved) {
      throw new Error('Failed to retrieve saved user from DB after insert.');
    }
    return saved;
  }

  /**
   * Find a user by email address.
   *
   * @param email - The email to search for.
   * @returns A `User` instance if found; otherwise `null`.
   * @throws Error when the underlying database operation fails.
   *
   * Notes:
   * - Uses `SELECT ... LIMIT 1` and returns `null` if no rows match.
   * - The current rehydration constructs a `User` with public setters, then
   *   forcibly sets internal fields (e.g., `(user as any)._id = row.id`).
   *   Consider implementing `User.fromDatabase(row)` or constructor overloads
   *   to make rehydration explicit and type-safe.
   */
  public async findByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;

    const rows = await Database.query<RowDataPacket[]>(sql, [email]);

    if (rows.length === 0) return null;

    const row = rows[0];

    // Rehydrate the domain entity - prefer a factory method instead of hacks.
    const user = new User(row.username, row.email, row.password_hash);
    // Ensure we overwrite the generated id/timestamps with DB values so the in-memory
    // entity matches persisted state (prevents mismatches in tokens, etc.).
    (user as any).id = row.id;
    (user as any).createdAt = row.created_at;
    (user as any).updatedAt = row.updated_at;
    user.avatarUrl = row.avatar_url;
    user.color = row.color;

    return user;
  }

  public async findById(id: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;

    const rows = await Database.query<RowDataPacket[]>(sql, [id]);
    if (rows.length === 0) return null;
    const row = rows[0];

    const user = new User(row.username, row.email, row.password_hash);
    (user as any).id = row.id;
    (user as any).createdAt = row.created_at;
    (user as any).updatedAt = row.updated_at;
    user.avatarUrl = row.avatar_url;
    user.color = row.color;

    return user;
  }

  /**
   * Search users by `username` or `email` (case-insensitive)
   */
  public async search(term: string): Promise<User[]> {
    const sql = `SELECT * FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 20`;
    const pattern = `%${term}%`;
    const rows = await Database.query<RowDataPacket[]>(sql, [pattern, pattern]);
    return rows.map((row: any) => {
      const user = new User(row.username, row.email, row.password_hash);
      (user as any).id = row.id;
      (user as any).createdAt = row.created_at;
      (user as any).updatedAt = row.updated_at;
      user.avatarUrl = row.avatar_url;
      user.color = row.color;
      return user;
    });
  }

  public async updateProfile(id: string, data: { username?: string, avatarUrl?: string | null, color?: string | null }): Promise<User> {
    const sql = `UPDATE users SET username = ?, avatar_url = ?, color = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`;

    await Database.query<ResultSetHeader>(sql, [data.username, data.avatarUrl || null, data.color || null, id]);

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to re-fetch user after update');
    return updated;
  }
}