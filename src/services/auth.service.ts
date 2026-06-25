import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IAuthTokenPayload, ISafeUser, IUser } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';
import { UserService } from './user.service';

export class AuthService {
  constructor(private readonly userService: UserService) {}

  async register(
    name: string,
    email: string,
    mobileNumber: string,
    address: string,
    password: string
  ): Promise<{ user: ISafeUser; token: string }> {
    const normalizedName = this.normalizeName(name);
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedMobileNumber = this.normalizeMobileNumber(mobileNumber);
    const normalizedAddress = this.normalizeAddress(address);
    const existingUser = await this.userService.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409);
    }

    const password_hash = await this.hashPassword(password);
    const user = await this.userService.createUser({
      name: normalizedName,
      email: normalizedEmail,
      mobile_number: normalizedMobileNumber,
      address: normalizedAddress,
      password_hash,
      role: 'user'
    });

    return {
      user: this.toSafeUser(user),
      token: this.generateJWT(user)
    };
  }

  async login(email: string, password: string): Promise<{ user: ISafeUser; token: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userService.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await this.comparePassword(password, user.password_hash);

    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    return {
      user: this.toSafeUser(user),
      token: this.generateJWT(user)
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateJWT(user: IUser): string {
    const payload: IAuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
  }

  toSafeUser(user: IUser): ISafeUser {
    const { password_hash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeName(name: string): string {
    // This collapses repeated spaces so the database stores a clean full name.
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeMobileNumber(mobileNumber: string): string {
    return mobileNumber.trim().replace(/\s+/g, ' ');
  }

  private normalizeAddress(address: string): string {
    return address.trim().replace(/\s+/g, ' ');
  }
}
