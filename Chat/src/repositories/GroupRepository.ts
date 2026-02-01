import { Database } from "../config/Database.ts";
import { Group } from "../domain/Group.ts";
import type { ResultSetHeader } from "mysql2";

/**
 * Repository responsible for persistence of `Group` entities.
 *
 * Responsibilities:
 * - Create groups, add members, and query groups for a user.
 * - Use parameterized SQL via the `Database` helper to prevent injection.
 *
 * Notes:
 * - Prefer wrapping multi-step operations in a transaction (not implemented here).
 * - Query return types are raw DB rows; consider mapping results to domain models.
 * - Verify the import path `../domain/Group` matches your repo structure (`doman` vs `domain`).
 */
export class GroupRepository {
  /**
   * Create a group and return the number of affected rows (should be 1 on success).
   *
   * @param group - The `Group` domain entity to persist.
   * @returns A promise resolving to the number of affected rows (1 when inserted).
   * @throws Error when the underlying database operation fails.
   *
   * Note: Use a transaction if this method becomes part of a larger multi-statement operation.
   */
  public async create(group: Group, conn?: any): Promise<number> {
    const sql = `INSERT INTO \`groups\` (id, name, description, admin_id, created_at) VALUES (?, ?, ?, ?, ?)`;

    const rawParams = [
      group.id,
      group.name,
      group.description,
      group.adminId,
      group.createdAt
    ];
    const params = rawParams.map(p => p === undefined ? null : p);
    const result = await Database.query<ResultSetHeader>(sql, params, conn);

    return (result as any).affectedRows;
  }

  /**
   * Add a member to a group.
   *
   * @param groupId - ID of the group to modify.
   * @param userId - ID of the user to add.
   * @returns A promise that resolves when the insert completes.
   * @throws Error when the underlying database operation fails.
   *
   * Note: Consider adding unique constraint handling or checks to prevent duplicates.
   */
  public async addMember(groupId: string, userId: string, conn?: any): Promise<void> {
    const sql = `INSERT INTO group_members (group_id, user_id) VALUES (?, ?)`;
    const params = [groupId, userId].map(p => p === undefined ? null : p);
    await Database.query(sql, params, conn);
  }

  /**
   * Find all groups that a specific user belongs to.
   *
   * @param userId - The user id to search by.
   * @returns A promise resolving to an array of raw group rows from the database.
   *
   * Note: The method returns raw DB rows; map to `Group` domain objects if needed.
   */
  public async findUserGroups(userId: string): Promise<any[]> {
    const sql = `
      SELECT g.* FROM \`groups\` g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `;
    return await Database.query(sql, [userId]);
  }
  /**
   * Count how many groups a given user administers (created as admin).
   *
   * @param adminId - The user id of the admin to count groups for.
   */
  public async countByAdmin(adminId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as total FROM \`groups\` WHERE admin_id = ?`;
    const rows: any = await Database.query(sql, [adminId]);
    if (!Array.isArray(rows) || rows.length === 0) return 0;
    return Number(rows[0].total || 0);
  }}