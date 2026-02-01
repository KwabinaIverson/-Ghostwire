import { BaseEntity } from "../Core/BaseEntity.ts";

/**
 * Represents a group in the application.
 *
 * Extends `BaseEntity` to inherit `id`, `createdAt`, and `updatedAt`.
 *
 * Validation rules:
 * - name: required, 3–50 characters
 * - description: optional, max 200 characters
 * - adminId: required, non-empty string
 */
export class Group extends BaseEntity {
  /**
   * The group's name. See setter for validation (3–50 characters).
   */
  private _name!: string;

  /**
   * A short description of the group. Max 200 characters.
   */
  private _description!: string;

  /**
   * The ID of the group's admin (owner).
   */
  private _adminId!: string;

  /**
   * The group's members. Stored as an array of objects (member shape handled elsewhere).
   */
  private _member: object[] = [];

  /**
   * Sets the group name after validating non-empty and length constraints.
   * @param name - The new group name.
   * @throws {Error} If name is empty or not between 3 and 50 characters.
   */
  public set name(name: string) {
    if (!name || name.trim().length === 0) {
      throw new Error("Group name cannot be empty.");
    }

    if (name.length > 50) {
      throw new Error("Group name cannot exceed 50 characters.");
    }

    if (name.length < 3) {
      throw new Error("Group name must be at least 3 characters long.");
    }
    this._name = name;
  }

  /**
   * Gets the group name.
   * @returns The group's name.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Sets the group description with a maximum length constraint.
   * @param description - The group's description.
   * @throws {Error} If description exceeds 200 characters.
   */
  public set description(description: string) {
    if (description.length > 200) {
      throw new Error("Group description cannot exceed 200 characters.");
    }
    this._description = description;
  }

  /**
   * Gets the group description.
   * @returns The group's description.
   */
  public get description(): string {
    return this._description;
  }

  /**
   * Sets the admin ID for the group.
   * @param adminId - The user ID to set as admin.
   * @throws {Error} If adminId is empty or invalid.
   */
  public set adminId(adminId: string) {
    if (!adminId || adminId.trim().length === 0) {
      throw new Error("Admin ID cannot be empty.");
    }
    this._adminId = adminId;
  }

  /**
   * Gets the current admin ID.
   * @returns The admin user's ID.
   */
  public get adminId(): string {
    return this._adminId;
  }

  /**
   * Gets a shallow copy of the members array.
   * @returns An array of member objects.
   */
  public get members(): object[] {
    return this._member;
  }

  /**
   * Adds a member to the group.
   * @param member - The member object to add.
   * @throws {Error} If `member` is null or undefined.
   */
  public addMember(member: object): void {
    if (!member) {
      throw new Error("Member cannot be null or undefined.");
    }
    this._member.push(member);
  }

  /**
   * Removes a member from the group.
   * @param member - The member object to remove.
   * @throws {Error} If the member is not found in the group.
   */
  public removeMember(member: object): void {
    const index = this._member.indexOf(member);
    if (index === -1) {
      throw new Error("Member not found in the group.");
    }
    this._member.splice(index, 1);
  }

  /**
   * Checks if the provided user ID matches the group's admin ID.
   * @param userId - The user ID to check.
   * @returns `true` if the user is the admin; otherwise `false`.
   */
  public isAdmin(userId: string): boolean {
    return this._adminId === userId;
  }

  /**
   * Creates a new Group instance.
   * @param name - Group name (3–50 characters).
   * @param description - Group description (max 200 characters).
   * @param adminId - Initial admin user ID (non-empty).
   */
  constructor(name: string, description: string, adminId: string) {
    super();
    // `name` and `adminId` are required. `description` is optional (default empty string).
    if (name && adminId) {
      this.name = name;
      this.description = description || "";
      this.adminId = adminId;
    }
  }
}