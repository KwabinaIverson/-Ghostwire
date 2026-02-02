// src/dtos/loginDTO.ts
export class LoginDto {
  public email: string;
  public password: string;

  constructor(body: any) {
    this.email = body.email;
    this.password = body.password;
  }

  public validate(): string | null {
    if (!this.email) return "Email is required.";
    if (!this.password) return "Password is required.";
    return null;
  }
}
