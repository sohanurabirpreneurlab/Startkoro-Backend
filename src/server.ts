import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { realtimeService } from './services/realtime.service';
import { logger } from './utils/logger';

const server = createServer(app);
realtimeService.initialize(server);

server.listen(env.PORT, () => {
  logger.info('StartKoro backend running.', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV
  });
});
