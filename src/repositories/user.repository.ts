import { db } from '../config/database';
import { IUser } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      const result = await db.query<IUser>('select * from users where email = $1 limit 1', [email]);
      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch user by email.', 500, error);
    }
  }

  async findById(id: string): Promise<IUser | null> {
    try {
      const result = await db.query<IUser>('select * from users where id = $1 limit 1', [id]);
      return result.rows[0] ?? null;
    } catch (error) {
      throw new AppError('Failed to fetch user by id.', 500, error);
    }
  }

  async create(
    payload: Pick<IUser, 'name' | 'email' | 'mobile_number' | 'address' | 'password_hash' | 'role'>
  ): Promise<IUser> {
    try {
      const result = await db.query<IUser>(
        `
          insert into users (name, email, mobile_number, address, password_hash, role)
          values ($1, $2, $3, $4, $5, $6)
          returning *
        `,
        [
          payload.name,
          payload.email,
          payload.mobile_number,
          payload.address,
          payload.password_hash,
          payload.role
        ]
      );

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create user.', 500, error);
    }
  }

  async list(search?: string): Promise<IUser[]> {
    try {
      if (!search?.trim()) {
        const result = await db.query<IUser>('select * from users order by updated_at desc, created_at desc');
        return result.rows;
      }

      const normalizedSearch = `%${search.trim().toLowerCase()}%`;
      const result = await db.query<IUser>(
        `
          select *
          from users
          where lower(name) like $1
             or lower(email) like $1
             or lower(coalesce(mobile_number, '')) like $1
          order by updated_at desc, created_at desc
        `,
        [normalizedSearch]
      );
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to list users.', 500, error);
    }
  }

  async updateRole(userId: string, role: 'user' | 'admin'): Promise<IUser> {
    try {
      const result = await db.query<IUser>(
        `
          update users
          set role = $2
          where id = $1
          returning *
        `,
        [userId, role]
      );

      const user = result.rows[0];

      if (!user) {
        throw new AppError('User not found.', 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user role.', 500, error);
    }
  }
}
