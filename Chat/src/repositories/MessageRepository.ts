import { Database } from "../config/Database.ts";

export class MessageRepository {
  static async getMessagesByGroupId(groupId: string) {
    const sql = `
      SELECT m.id, m.group_id, m.sender_id, m.content, m.created_at,
             u.username AS sender_name, u.avatar_url AS avatarUrl
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.group_id = ?
      ORDER BY m.created_at ASC
    `;
    const rows = await Database.query(sql, [groupId]);
    return rows;
  }
}