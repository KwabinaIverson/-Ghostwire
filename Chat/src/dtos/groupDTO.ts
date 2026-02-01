/**
 * Data transfer object used to create a new group.
 *
 * Responsibilities:
 * - Initialize required properties from request body and authenticated user.
 * - Provide a simple `validate` method to surface input validation errors.
 */
export class CreateGroupDto {
  /**
   * The name of the group.
   * Must be between 3 and 50 characters.
   */
  public name: string;

  /**
   * Optional description of the group.
   * Max length: 200 characters.
   */
  public description: string;

  /**
   * The id of the user creating the group (set from authenticated user).
   */
  public adminId: string;

  /**
   * Construct a DTO from request body and current user's id.
   * @param body - Raw request body (expects `name` and optionally `description`).
   * @param userId - Authenticated user id to set as `adminId`.
   */
  constructor(body: any, userId: string) {
    this.name = body.name;
    this.description = body.description || "";
    this.adminId = userId;
  }

  /**
   * Validates DTO values and returns an error message or `null` on success.
   * @returns A string error message when invalid, otherwise `null`.
   *
   * Validation rules:
   * - `name` is required and must be 3–50 characters.
   * - `description` must not exceed 200 characters.
   */
  public validate(): string | null {
    if (!this.name || this.name.length < 3 || this.name.length > 50) {
      return "Group name must be between 3 and 50 characters.";
    }
    if (this.description.length > 200) {
      return "Description too long.";
    }
    return null;
  }
}

/**
 * Data transfer object for adding a member to an existing group.
 *
 * Responsibilities:
 * - Carry `groupId` and `targetUserId` from the request.
 * - Provide a `validate` method to ensure required fields are present.
 */
export class AddMemberDto {
  /**
   * The target group id in which to add the member.
   */
  public groupId: string;

  /**
   * The id of the user to be added to the group.
   */
  public targetUserId: string;

  /**
   * Construct DTO from request body.
   * @param body - Raw request body (expects `groupId` and `userId`).
   */
  constructor(body: any) {
    this.groupId = body.groupId;
    this.targetUserId = body.userId;
  }

  /**
   * Validates DTO values and returns an error message or `null` on success.
   * @returns A string error message when invalid, otherwise `null`.
   *
   * Validation rules:
   * - `groupId` is required.
   * - `targetUserId` is required.
   */
  public validate(): string | null {
    if (!this.groupId) return "Group ID is required.";
    if (!this.targetUserId) return "Target User ID is required.";
    return null;
  }
}