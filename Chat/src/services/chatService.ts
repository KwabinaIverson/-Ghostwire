import { Database } from "../config/Database.ts";
import { SendMessageDto } from "../dtos/chatDTO.ts";
import { v7 as uuidv7 } from 'uuid';

export class ChatService {
  
  // Save a message to MySQL
  public async saveMessage(senderId: string, dto: SendMessageDto) {
    const id = uuidv7();
    const createdAt = new Date();

    // Determine if it's a Group chat or DM
    // If Group: group_id = targetId, recipient_id = NULL
    // If Private: group_id = NULL, recipient_id = targetId
    const groupId = dto.type === 'group' ? dto.targetId : null;
    const recipientId = dto.type === 'private' ? dto.targetId : null;

    const sql = `
      INSERT INTO messages (id, sender_id, group_id, recipient_id, type, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await Database.query(sql, [
      id,
      senderId,
      groupId,
      recipientId,
      dto.type,
      dto.content,
      createdAt
    ]);

    // Return the object so we can send it back to the client immediately
    return {
      id,
      senderId,
      targetId: dto.targetId,
      content: dto.content,
      type: dto.type,
      createdAt
    };
  }

  // Fetch last 50 messages for a group
  public async getGroupHistory(groupId: string) {
    const sql = `
      SELECT m.*, u.username as sender_name, u.avatar_url as avatarUrl, u.color as color
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.created_at ASC
      LIMIT 50
    `;
    return await Database.query(sql, [groupId]);
  }
}