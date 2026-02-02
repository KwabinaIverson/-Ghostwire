// src/repositories/UserRepository.ts
import { Database } from "../config/Database.ts";
import { User } from "../domain/User.ts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export class UserRepository {
  public async save(user: User): Promise<User> {
    const sql = `
      INSERT INTO users (id, username, email, password_hash, avatar_url, color, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await Database.query<ResultSetHeader>(sql, [
      user.id,
      user.username,
      user.email,
      (user as any)._passwordHash,
      user.avatarUrl || null,
      user.color || null,
      user.createdAt
    ]);
    return await this.findByEmail(user.email) as User;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const rows = await Database.query<RowDataPacket[]>(sql, [email]);
    if (!rows.length) return null;
    return User.fromPersistence(rows[0]);
  }

  public async findById(id: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const rows = await Database.query<RowDataPacket[]>(sql, [id]);
    if (!rows.length) return null;
    return User.fromPersistence(rows[0]);
  }

  public async updateProfile(id: string, data: { username?: string, avatarUrl?: string | null, color?: string | null }): Promise<User> {
    const sql = `UPDATE users SET username = ?, avatar_url = ?, color = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`;
    await Database.query<ResultSetHeader>(sql, [data.username, data.avatarUrl || null, data.color || null, id]);
    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to fetch updated user');
    return updated;
  }

  public async search(term: string): Promise<User[]> {
    const sql = `SELECT * FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 20`;
    const pattern = `%${term}%`;
    const rows = await Database.query<RowDataPacket[]>(sql, [pattern, pattern]);
    return rows.map(User.fromPersistence);
  }
}
