import { IUser } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUserByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  async findUserById(id: string): Promise<IUser | null> {
    return this.userRepository.findById(id);
  }

  async createUser(
    payload: Pick<IUser, 'name' | 'email' | 'mobile_number' | 'address' | 'password_hash' | 'role'>
  ): Promise<IUser> {
    return this.userRepository.create(payload);
  }

  async updateProfile(
    userId: string,
    payload: Pick<IUser, 'name' | 'email' | 'address'>
  ): Promise<IUser> {
    const normalizedName = payload.name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedAddress = payload.address.trim().replace(/\s+/g, ' ');

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      throw new AppError('Name must be between 2 and 100 characters.', 400);
    }

    if (normalizedAddress.length < 5 || normalizedAddress.length > 255) {
      throw new AppError('Address must be between 5 and 255 characters.', 400);
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser && existingUser.id !== userId) {
      throw new AppError('A user with this email already exists.', 409);
    }

    return this.userRepository.updateProfile(userId, {
      name: normalizedName,
      email: normalizedEmail,
      address: normalizedAddress
    });
  }
}
