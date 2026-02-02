import { BaseEntity } from "../Core/BaseEntity.ts";

export interface GroupMember {
  userId: string;
}

export class Group extends BaseEntity {
  private _name: string;
  private _description: string;
  private _adminId: string;
  private _members: GroupMember[] = [];

  constructor(name: string, description: string, adminId: string) {
    super();

    if (!name || name.trim().length < 3 || name.length > 50) {
      throw new Error("group name must be between 3 and 50 characters");
    }

    if (!adminId || adminId.trim().length === 0) {
      throw new Error("admin id is required");
    }

    if (description && description.length > 200) {
      throw new Error("description too long");
    }

    this._name = name;
    this._description = description || "";
    this._adminId = adminId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get adminId(): string {
    return this._adminId;
  }

  get members(): GroupMember[] {
    return [...this._members];
  }

  public isAdmin(userId: string): boolean {
    return this._adminId === userId;
  }

  public addMember(userId: string): void {
    if (this._members.some(m => m.userId === userId)) {
      throw new Error("user already in group");
    }
    this._members.push({ userId });
  }
}