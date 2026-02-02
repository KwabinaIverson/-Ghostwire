import { Database } from "../config/Database.ts";
import { Group } from "../domain/Group.ts";
import type { ResultSetHeader } from "mysql2";

export class GroupRepository {
  async create(group: Group, conn?: any): Promise<number> {
    const sql = `
      INSERT INTO \`groups\`
      (id, name, description, admin_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      group.id,
      group.name,
      group.description,
      group.adminId,
      group.createdAt
    ];

    const result = await Database.query<ResultSetHeader>(sql, params, conn);
    return result.affectedRows;
  }

  async addMember(groupId: string, userId: string, conn?: any): Promise<void> {
    const sql = `
      INSERT INTO group_members (group_id, user_id)
      VALUES (?, ?)
    `;
    await Database.query(sql, [groupId, userId], conn);
  }

  async findUserGroups(userId: string): Promise<any[]> {
    const sql = `
      SELECT g.*
      FROM \`groups\` g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `;
    return Database.query(sql, [userId]);
  }

  async countByAdmin(adminId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM \`groups\`
      WHERE admin_id = ?
    `;
    const rows: any = await Database.query(sql, [adminId]);
    return Number(rows?.[0]?.total || 0);
  }
}