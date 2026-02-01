/**
 * Data Transfer Object used when registering a user.
 *
 * Example:
 * ```ts
 * const dto = new RegisterUserDto(req.body);
 * const error = dto.validate();
 * if (error) {
 *   // handle validation error
 * }
 * ```
 *
 * Validation rules:
 * - `username`: required, 3-20 characters
 * - `email`: required, must be a valid email address
 * - `password`: required, minimum 8 characters
 */
export class RegisterUserDto {
  /** The desired username (3-20 characters). Example: `"john_doe"` */
  public username: string;
  /** The user's email address. Example: `"john@example.com"` */
  public email: string;
  /** The user's password (plain text). Example: `"s3cretP@ss"` */
  public password: string;

  /**
   * Create a DTO from a request body or plain object.
   * Missing properties will be `undefined`.
   * @param body - Object containing `username`, `email`, and `password`.
   */
  constructor(body: any) {
    this.username = body?.username;
    this.email = body?.email;
    this.password = body?.password;
  }

  /**
   * Validate the DTO fields and return a string error message when validation fails.
   * Returns `null` when all fields are valid.
   *
   * Rules:
   * - Username: required, between 3 and 20 characters
   * - Email: required, basic email format check
   * - Password: required, at least 8 characters
   *
   * @returns {string | null} Error message or `null` if valid
   */
  public validate(): string | null {
    if (!this.username || this.username.length < 3 || this.username.length > 20) {
      return "Username must be between 3 and 20 characters.";
    }
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      return "Invalid email address.";
    }
    if (!this.password || this.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return null; // No error
  }
}