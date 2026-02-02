// src/dtos/registerDTO.ts
export class RegisterUserDto {
  public username: string;
  public email: string;
  public password: string;

  constructor(body: any) {
    this.username = body?.username;
    this.email = body?.email;
    this.password = body?.password;
  }

  public validate(): string | null {
    if (!this.username || this.username.length < 3 || this.username.length > 20)
      return "Username must be between 3 and 20 characters.";
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
      return "Invalid email address.";
    if (!this.password || this.password.length < 8)
      return "Password must be at least 8 characters.";
    return null;
  }
}