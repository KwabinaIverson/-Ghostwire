// src/services/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RegisterUserDto } from '../dtos/registerDTO.ts';
import { LoginDto } from '../dtos/loginDTO.ts';
import { UserRepository } from '../repositories/UserRepository.ts';
import { User } from '../domain/User.ts';

export class AuthService {
  private userRepo = new UserRepository();

  public async register(dto: RegisterUserDto): Promise<any> {
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) throw new Error("Email already registered.");

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = new User(dto.username, dto.email, hashedPassword);
    const savedUser = await this.userRepo.save(user);
    return savedUser.toProfile();
  }

  public async login(dto: LoginDto): Promise<{ token: string, user: any }> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !(await user.verifyPassword(dto.password))) {
      throw new Error("Invalid credentials.");
    }

    const secret = process.env.JWT_SECRET || "default_secret";
    const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '7d' });
    return { token, user: user.toProfile() };
  }
}
