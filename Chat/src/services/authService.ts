import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RegisterUserDto } from '../dtos/registerDTO.ts';
import { LoginDto } from '../dtos/loginDTO.ts';
import { UserRepository } from '../repositories/UserRepository.ts';
import { User } from '../domain/User.ts';

/**
 * AuthService handles user registration and authentication.
 *
 * Responsibilities:
 * - Register new users (validate uniqueness, hash password, persist user).
 * - Authenticate users (verify password and issue JWT tokens).
 *
 * Notes:
 * - Password hashing uses `bcrypt` with 10 salt rounds.
 * - JWT secret is read from `process.env.JWT_SECRET`; set this in your environment.
 * - Current code momentarily reads the user's private password hash via casting:
 *   `(user as any)._passwordHash`. Prefer adding `User.verifyPassword()` or a
 *   controlled accessor for security and clarity.
 */
export class AuthService {
  private userRepo: UserRepository;

  /**
   * Create a new AuthService.
   * Initializes a `UserRepository` for persistence operations.
   */
  constructor() {
    this.userRepo = new UserRepository();
  }

  /**
   * Register a new user.
   *
   * Steps:
   * 1. Ensure email is not already registered.
   * 2. Hash the password using bcrypt (10 salt rounds).
   * 3. Construct the `User` domain entity and persist it.
   * 4. Return a cleaned profile object (no password hash).
   *
   * @param dto - Data transfer object with `username`, `email`, and `password`.
   * @returns A promise resolving to a sanitized user profile (no sensitive fields).
   * @throws Error if the email is already registered or persistence fails.
   */
  public async register(dto: RegisterUserDto): Promise<any> {
    // 1. Check if email already exists
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new Error("Email already registered.");
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 3. Create Entity (The V4 ID is generated inside the constructor)
    const newUser = new User(dto.username, dto.email, hashedPassword);

    // 4. Save to DB and use the rehydrated record returned from the DB
    const savedUser = await this.userRepo.save(newUser);

    // 5. Return clean data (No password hash!) from the DB-backed user
    return savedUser.toProfile();
  }

  /**
   * Authenticate a user and issue a JWT.
   *
   * Steps:
   * 1. Load user by email.
   * 2. Verify the provided password against the stored hash.
   * 3. Generate a JWT (payload includes `id` and `username`, expires in 7 days).
   *
   * @param dto - Data transfer object with `email` and `password`.
   * @returns A promise resolving to an object with `token` and user profile.
   * @throws Error when credentials are invalid or authentication fails.
   *
   * Security notes:
   * - Ensure `process.env.JWT_SECRET` is set to a strong secret in production.
   * - Replace the current private-field read `(user as any)._passwordHash` with
   *   a safe method on `User` such as `verifyPassword()` to avoid direct access.
   */
  public async login(dto: LoginDto): Promise<{ token: string, user: any }> {
    // 1. Find User
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error("Invalid credentials.");
    }

    // 2. Verify Password (we need to access the private hash via a getter or helper in User class, 
    //    but since it's private, we usually do the comparison logic here or inside User)
    //    For now, let's assume we can access it via a public accessor or helper we add to User.ts
    //    *Hack:* We cast to any to read the private field for now, or add a method 'verifyPassword' to User.ts.
    const isMatch = await bcrypt.compare(dto.password, (user as any)._passwordHash);
    
    if (!isMatch) {
      throw new Error("Invalid credentials.");
    }

    // 3. Generate JWT
    const secret = process.env.JWT_SECRET || "default_secret";
    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      secret, 
      { expiresIn: '7d' }
    );

    return {
      token,
      user: user.toProfile()
    };
  }
}