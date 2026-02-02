export class CreateGroupDto {
  public name: string;
  public description: string;
  public adminId: string;

  constructor(body: any, userId: string) {
    this.name = body.name;
    this.description = body.description || "";
    this.adminId = userId;
  }

  validate(): string | null {
    if (!this.name || this.name.length < 3 || this.name.length > 50) {
      return "group name must be between 3 and 50 characters";
    }
    if (this.description.length > 200) {
      return "description too long";
    }
    if (!this.adminId) {
      return "admin id missing";
    }
    return null;
  }
}

export class AddMemberDto {
  public groupId: string;
  public targetUserId: string;

  constructor(body: any) {
    this.groupId = body.groupId;
    this.targetUserId = body.userId;
  }

  validate(): string | null {
    if (!this.groupId) return "group id required";
    if (!this.targetUserId) return "target user id required";
    return null;
  }
}