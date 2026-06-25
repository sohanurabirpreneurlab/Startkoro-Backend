import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { IAuthTokenPayload } from '../interfaces/user.interface';
import { IMessage } from '../interfaces/message.interface';

export interface ChatMessageEventPayload {
  chatId: string;
  chatTitle: string | null;
  userMessage: IMessage;
  assistantMessage: IMessage;
}

export class RealtimeService {
  private io: Server | null = null;

  initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true
      }
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token is required.'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as IAuthTokenPayload;
        socket.data.user = decoded;
        next();
      } catch (_error) {
        next(new Error('Invalid socket token.'));
      }
    });

    this.io.on('connection', (socket) => {
      const user = socket.data.user as IAuthTokenPayload;

      // Each user gets a private room so all of their open tabs receive the same chat updates.
      socket.join(this.userRoom(user.sub));
    });
  }

  emitChatMessageCreated(userId: string, payload: ChatMessageEventPayload): void {
    this.io?.to(this.userRoom(userId)).emit('chat:message-created', payload);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}

export const realtimeService = new RealtimeService();
