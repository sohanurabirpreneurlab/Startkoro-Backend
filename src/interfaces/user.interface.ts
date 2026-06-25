import { Request } from 'express';

export interface IUser {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  address: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface ISafeUser {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  address: string;
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface IAuthTokenPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface IAuthenticatedRequest extends Request {
  user?: IAuthTokenPayload;
}
