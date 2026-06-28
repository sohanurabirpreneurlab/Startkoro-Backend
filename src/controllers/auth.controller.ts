import { Request, Response } from 'express';
import { z } from 'zod';
import { IAuthenticatedRequest } from '../interfaces/user.interface';
import { AppError } from '../utils/AppError';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  mobile_number: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(255),
  password: z.string().min(6).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(128)
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  address: z.string().trim().min(5).max(255)
});

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const payload = registerSchema.parse(req.body);
    const result = await this.authService.register(
      payload.name,
      payload.email,
      payload.mobile_number,
      payload.address,
      payload.password
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: result
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const payload = loginSchema.parse(req.body);
    const result = await this.authService.login(payload.email, payload.password);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result
    });
  };

  me = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('Authenticated user was not found in the request.', 401);
    }

    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: this.authService.toSafeUser(user)
    });
  };

  updateMe = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError('Authenticated user was not found in the request.', 401);
    }

    const payload = updateProfileSchema.parse(req.body);
    const updatedUser = await this.userService.updateProfile(userId, payload);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: this.authService.toSafeUser(updatedUser)
    });
  };
}
