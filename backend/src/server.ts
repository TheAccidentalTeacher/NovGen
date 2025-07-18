import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { NovelController } from './controllers/NovelController';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Environment variables
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novgen';

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize controller
const novelController = new NovelController();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NovGen API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Authentication routes
app.post('/api/auth/register', (req, res) => novelController.register(req, res));
app.post('/api/auth/login', (req, res) => novelController.login(req, res));

// API routes (will need auth middleware for most of these in production)
app.get('/api/genres', (req, res) => novelController.getGenres(req as any, res));
app.post('/api/estimate', (req, res) => novelController.estimateGeneration(req as any, res));
app.post('/api/novels/generate', (req, res) => novelController.generateNovel(req as any, res));
app.get('/api/jobs/:jobId/progress', (req, res) => novelController.getGenerationProgress(req as any, res));
app.post('/api/jobs/:jobId/cancel', (req, res) => novelController.cancelGeneration(req as any, res));
app.get('/api/novels', (req, res) => novelController.getUserNovels(req as any, res));
app.get('/api/novels/:novelId', (req, res) => novelController.getNovel(req as any, res));
app.delete('/api/novels/:novelId', (req, res) => novelController.deleteNovel(req as any, res));
app.get('/api/novels/:novelId/export', (req, res) => novelController.exportNovel(req as any, res));
app.get('/api/novels/:novelId/chapters', (req, res) => novelController.getNovelChapters(req as any, res));
app.get('/api/chapters/:chapterId', (req, res) => novelController.getChapter(req as any, res));
app.post('/api/chapters/:chapterId/enhance', (req, res) => novelController.enhanceChapter(req as any, res));
app.post('/api/novels/:novelId/chapters/generate', (req, res) => novelController.generateAdditionalChapters(req as any, res));
app.get('/api/user/profile', (req, res) => novelController.getProfile(req as any, res));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('join-generation', (jobId) => {
    socket.join(`generation-${jobId}`);
    console.log(`User ${socket.id} joined generation room: ${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server startup
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer().catch(console.error);
