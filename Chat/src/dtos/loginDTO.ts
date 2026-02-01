/**
 * Data transfer object used for user login requests.
 *
 * Responsibilities:
 * - Hold `email` and `password` values from the request body.
 * - Provide a `validate` method to surface input validation errors.
 */
export class LoginDto {
  /**
   * The user's email address used to log in.
   * This field is required.
   */
  public email: string;

  /**
   * The user's password.
   * This field is required.
   */
  public password: string;

  /**
   * Construct the DTO from a raw request body.
   * @param body - Raw request body (expects `email` and `password`).
   */
  constructor(body: any) {
    this.email = body.email;
    this.password = body.password;
  }

  /**
   * Validates DTO values and returns an error message or `null` on success.
   * @returns A string error message when invalid, otherwise `null`.
   *
   * Validation rules:
   * - `email` is required.
   * - `password` is required.
   */
  public validate(): string | null {
    if (!this.email) return "Email is required.";
    if (!this.password) return "Password is required.";
    return null;
  }
}