import { BaseEntity } from "../Core/BaseEntity.ts";
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents an application user.
 *
 * Extends `BaseEntity` to inherit `id`, `createdAt`, and `updatedAt`.
 *
 * Validation rules:
 * - username: 3–20 characters, not null/undefined
 * - email: must match a basic email regex
 * - passwordHash: minimum 8 characters
 */
export class User extends BaseEntity {
  /**
   * The user's username.
   * Use the `username` setter to validate (3–20 characters).
   */
  private _username!: string;

  /**
   * The user's email address.
   * Use the `email` setter to validate format.
   */
  private _email!: string;


  public isOnline: boolean;

  /**
   * Optional avatar URL (image) provided by the user.
   */
  private _avatarUrl?: string | null;

  /**
   * User-specific color (hex or hsl) used for avatars and username accents.
   */
  private _color?: string | null;

  /**
   * The user's password hash.
   * There is intentionally no public getter to avoid exposing the hash.
   */
  private _passwordHash!: string;

  /**
   * Sets the user's username after validating length and presence.
   * @param username - New username to set.
   * @throws {Error} If username is null/undefined or not within 3–20 characters.
   */
  public set username(username: string) {
    if (username === null || username === undefined) {
      throw new Error("Username cannot be null or undefined.");
    }

    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters long.");
    }

    if (username.length > 20) {
      throw new Error("Username cannot exceed 20 characters.");
    }

    this._username = username;
  }

  /**
   * Gets the user's username.
   * @returns The username string.
   */
  public get username(): string {
    return this._username;
  }

  /**
   * Sets the user's email after validating basic email format.
   * @param email - New email to set.
   * @throws {Error} If email format is invalid.
   */
  public set email(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }
    this._email = email;
  }

  /**
   * Gets the user's email.
   * @returns The email string.
   */
  public get email(): string {
    return this._email;
  }

  /**
   * Sets the user's password hash after validating minimum length.
   * @param passwordHash - Hashed password (min 8 characters).
   * @throws {Error} If passwordHash is shorter than 8 characters.
   */
  public set passwordHash(passwordHash: string) {
    if (passwordHash.length < 8) {
      throw new Error("Password hash must be at least 8 characters long.");
    }

    this._passwordHash = passwordHash;
  }

  /**
   * Returns the stored password hash.
   *
   * NOTE: This exposes a sensitive value for server-side use (e.g., bcrypt.compare).
   * Prefer `User.verifyPassword()` if you'd rather keep verification inside the domain.
   */
  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get avatarUrl(): string | null | undefined {
    return this._avatarUrl;
  }

  public set avatarUrl(url: string | null | undefined) {
    this._avatarUrl = url;
  }

  public get color(): string | null | undefined {
    return this._color;
  }

  public set color(color: string | null | undefined) {
    this._color = color;
  }

  constructor(username: string, email: string, passwordHash: string) {
    super();
    if (username && email && passwordHash) {
      this.username = username;
      this.email = email;
      this.passwordHash = passwordHash;
      this.id = uuidv4();
      this.isOnline = false;
    }
  }

  // Helper to send data to frontend without leaking the hash
  public toProfile() {
    return {
      id: this.id, // Uses the V4 ID
      username: this.username,
      email: this.email,
      online: this.isOnline,
      joinedAt: this.createdAt,
      avatarUrl: this.avatarUrl,
      color: this.color
    };
  }

  public static fromPersistence(row: any): User {
    const user = new User(row.username, row.email, row.password_hash);
    // Overwrite generated fields with DB values so the returned User reflects DB state.
    (user as any).id = row.id;
    (user as any).createdAt = row.created_at;
    (user as any).updatedAt = row.updated_at;
    user.avatarUrl = row.avatar_url;
    user.color = row.color;
    return user;
  }
}