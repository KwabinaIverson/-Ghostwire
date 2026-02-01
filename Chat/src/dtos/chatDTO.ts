export class SendMessageDto {
  public senderId: string;
  public targetId: string;
  public content: string;
  public type: 'private' | 'group';

  constructor(senderId: string, payload: any) {
    this.senderId = senderId;
    this.targetId = payload.targetId;
    this.content = payload.content;
    this.type = payload.type;
  }

  public validate(): string | null {
    if (!this.targetId) {
        return "Target ID is required.";
    }
    
    if (!this.content || this.content.trim().length === 0) {
        return "Message content cannot be empty.";
    }
    
    if (this.content.length > 1000) {
        return "Message content cannot exceed 1000 characters.";
    }

    if (this.type !== 'private' && this.type !== 'group') {
        return "Invalid message type. Must be 'private' or 'group'.";
    }

    return null;
  }
}