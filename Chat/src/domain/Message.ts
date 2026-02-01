import { BaseEntity } from "../Core/BaseEntity.ts";

/**
 * Represents a chat message exchanged between users.
 *
 * Extends `BaseEntity` to inherit `id`, `createdAt`, and `updatedAt`.
 *
 * Validation:
 * - `content` must be non-empty and cannot exceed 1000 characters.
 */
export class Message extends BaseEntity {
  /**
   * The ID of the user who sent the message.
   */
  private _senderId!: string;

  /**
   * The ID of the recipient (user or group).
   */
  private _recipientId!: string;

  /**
   * The text content of the message.
   * Must be non-empty and no longer than 1000 characters.
   */
  private _content!: string;

  /**
   * The timestamp indicating when the message was created/sent.
   */
  private _timestamp!: Date;

  /**
   * Sets the sender's user ID.
   * @param senderId - ID of the user sending the message.
   */
  public set senderId(senderId: string) {
    this._senderId = senderId;
  }

  /**
   * Gets the sender's user ID.
   * @returns The sender's ID.
   */
  public get senderId(): string {
    return this._senderId;
  }

  /**
   * Sets the recipient's ID.
   * @param recipientId - ID of the recipient (user or group).
   */
  public set recipientId(recipientId: string) {
    this._recipientId = recipientId;
  }

  /**
   * Gets the recipient's ID.
   * @returns The recipient's ID.
   */
  public get recipientId(): string {
    return this._recipientId;
  }

  /**
   * Sets the message content after validating constraints.
   * @param content - The message text.
   * @throws {Error} If content is empty or exceeds 1000 characters.
   */
  public set content(content: string) {
    if (content.length === 0) {
      throw new Error("Message content cannot be empty.");
    }
    if (content.length > 1000) {
      throw new Error("Message content cannot exceed 1000 characters.");
    }
    this._content = content;
  }

  /**
   * Gets the message content.
   * @returns The message text.
   */
  public get content(): string {
    return this._content;
  }

  /**
   * Sets the message timestamp.
   * @param timestamp - Date of when the message was created/sent.
   */
  public set timestamp(timestamp: Date) {
    this._timestamp = timestamp;
  }

  /**
   * Gets the message timestamp.
   * @returns The timestamp Date.
   */
  public get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * Constructs a new `Message`.
   * @param senderId - ID of the sender.
   * @param recipientId - ID of the recipient.
   * @param content - Message text (non-empty, max 1000 chars).
   * @param timestamp - Date/time when the message was sent/created.
   */
  constructor(senderId: string, recipientId: string, content: string, timestamp: Date) {
    super();
    if (senderId && recipientId && content && timestamp) {
      this.senderId = senderId;
      this.recipientId = recipientId;
      this.content = content;
      this.timestamp = timestamp;
    }
  }
}