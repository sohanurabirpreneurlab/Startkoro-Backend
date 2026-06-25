import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { AdminController } from './controllers/admin.controller';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { KnowledgeController } from './controllers/knowledge.controller';
import { errorMiddleware } from './middlewares/error.middleware';
import { ChatRepository } from './repositories/chat.repository';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';
import { KnowledgeRepository } from './repositories/knowledge.repository';
import { MessageRepository } from './repositories/message.repository';
import { UploadBatchRepository } from './repositories/upload-batch.repository';
import { UserRepository } from './repositories/user.repository';
import { createAdminRoutes } from './routes/admin.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createChatRoutes } from './routes/chat.routes';
import { createKnowledgeRoutes } from './routes/knowledge.routes';
import { AdminService } from './services/admin.service';
import { AIService } from './services/ai.service';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { EmbeddingService } from './services/embedding.service';
import { ExcelParserService } from './services/excel-parser.service';
import { KnowledgeService } from './services/knowledge.service';
import { MessageService } from './services/message.service';
import { realtimeService } from './services/realtime.service';
import { UserService } from './services/user.service';
import { VectorService } from './services/vector.service';

const app = express();

// These middlewares handle the common web API basics: security headers, JSON bodies, logs, and CORS.
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan('dev'));

const userRepository = new UserRepository();
const chatRepository = new ChatRepository();
const messageRepository = new MessageRepository();
const knowledgeRepository = new KnowledgeRepository();
const documentChunkRepository = new DocumentChunkRepository();
const uploadBatchRepository = new UploadBatchRepository();

const userService = new UserService(userRepository);
const authService = new AuthService(userService);
const messageService = new MessageService(messageRepository);
const embeddingService = new EmbeddingService();
const vectorService = new VectorService(documentChunkRepository);
const aiService = new AIService();
const excelParserService = new ExcelParserService();
const chatService = new ChatService(
  chatRepository,
  messageService,
  embeddingService,
  vectorService,
  aiService,
  realtimeService
);
const knowledgeService = new KnowledgeService(
  knowledgeRepository,
  documentChunkRepository,
  embeddingService
);
const adminService = new AdminService(
  uploadBatchRepository,
  knowledgeRepository,
  documentChunkRepository,
  userRepository,
  excelParserService,
  embeddingService
);

const adminController = new AdminController(adminService);
const authController = new AuthController(authService, userService);
const chatController = new ChatController(chatService, messageService);
const knowledgeController = new KnowledgeController(knowledgeService);

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'StartKoro backend is running.'
  });
});

app.use('/api/auth', createAuthRoutes(authController));
app.use('/api/admin', createAdminRoutes(adminController));
app.use('/api/chats', createChatRoutes(chatController));
app.use('/api/knowledge', createKnowledgeRoutes(knowledgeController));

app.use(errorMiddleware);

export default app;
