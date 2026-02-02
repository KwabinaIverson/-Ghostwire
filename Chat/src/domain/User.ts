// src/domain/User.ts
import { BaseEntity } from "../Core/BaseEntity.ts";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export class User extends BaseEntity {
  private _username!: string;
  private _email!: string;
  private _passwordHash!: string;
  public isOnline: boolean = false;
  private _avatarUrl?: string | null;
  private _color?: string | null;

  constructor(username: string, email: string, passwordHash: string) {
    super();
    // override BaseEntity id with secure v4 uuid
    (this as any)._id = uuidv4();

    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
  }

  // --- username ---
  public set username(name: string) {
    if (!name || name.length < 3 || name.length > 20)
      throw new Error("Username must be between 3 and 20 characters.");
    this._username = name;
  }
  public get username() {
    return this._username;
  }

  // --- email ---
  public set email(e: string) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(e)) throw new Error("Invalid email format.");
    this._email = e;
  }
  public get email() {
    return this._email;
  }

  // --- password hash ---
  public set passwordHash(hash: string) {
    if (!hash || hash.length < 8)
      throw new Error("Password hash must be at least 8 characters.");
    this._passwordHash = hash;
  }

  // verify password helper
  public async verifyPassword(plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this._passwordHash);
  }

  // --- avatar & color ---
  public get avatarUrl() {
    return this._avatarUrl;
  }
  public set avatarUrl(url: string | null | undefined) {
    this._avatarUrl = url;
  }

  public get color() {
    return this._color;
  }
  public set color(c: string | null | undefined) {
    this._color = c;
  }

  // return safe profile for frontend
  public toProfile() {
    return {
      id: this.id, // getter from BaseEntity, now guaranteed v4 uuid
      username: this.username,
      email: this.email,
      online: this.isOnline,
      joinedAt: this.createdAt,
      avatarUrl: this.avatarUrl,
      color: this.color,
    };
  }

  // rehydrate from DB row
  public static fromPersistence(row: any): User {
    const user = new User(row.username, row.email, row.password_hash);
    (user as any)._id = row.id;
    (user as any)._createdAt = row.created_at;
    (user as any)._updatedAt = row.updated_at;
    user.avatarUrl = row.avatar_url;
    user.color = row.color;
    return user;
  }
}