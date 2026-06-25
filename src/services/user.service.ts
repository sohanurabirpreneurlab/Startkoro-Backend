import { IUser } from '../interfaces/user.interface';
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
}
