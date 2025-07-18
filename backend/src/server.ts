import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import multer from 'multer';
import { config } from 'dotenv';
import path from 'path';

import NovelController from './controllers/NovelController';
import AdvancedAIService from './services/AdvancedAIService';

// Load environment variables
config();

// Get directory name for CommonJS
const __dirname = path.resolve();

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'OPENAI_API_KEY',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

class Server {
  private app: express.Application;
  private novelController: NovelController;
  private aiService: AdvancedAIService;

  constructor() {
    this.app = express();
    this.novelController = new NovelController();
    this.aiService = new AdvancedAIService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.connectToDatabase();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Generation-specific rate limiting
    const generationLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // Limit each IP to 5 generation requests per hour
      message: {
        success: false,
        error: 'Too many generation requests from this IP, please try again later.'
      }
    });
    this.app.use('/api/novels/generate', generationLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // File upload configuration
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/plain', 'text/markdown'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only .txt and .md files are allowed'));
        }
      }
    });

    // Make upload available to routes
    this.app.set('upload', upload);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    const apiRouter = express.Router();

    // Genre routes
    apiRouter.get('/genres', this.novelController.getGenres);

    // Novel generation routes
    apiRouter.post('/novels/generate', this.novelController.generateNovel);
    apiRouter.get('/novels/calculate', this.novelController.calculateChapters);
    
    // Job status routes
    apiRouter.get('/jobs/:jobId/status', this.novelController.getJobStatus);
    apiRouter.get('/jobs/:jobId/stream', this.novelController.streamProgress);

    // File upload routes
    const upload = this.app.get('upload');
    apiRouter.post('/upload/synopsis', upload.single('synopsis'), this.novelController.uploadSynopsis);

    // Novel management routes
    apiRouter.get('/novels', this.novelController.listNovels);
    apiRouter.get('/novels/:novelId', this.novelController.getNovel);

    // Mount API router
    this.app.use('/api', apiRouter);

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../../frontend/dist')));
      
      // Handle client-side routing
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
      });
    }

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', error);

      // Multer errors
      if (error instanceof multer.MulterError) {
        const multerError = error as multer.MulterError;
        if (multerError.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
          });
        }
        if (multerError.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files. Only one file allowed.'
          });
        }
      }

      // File type errors
      if (error.message === 'Only .txt and .md files are allowed') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      // MongoDB errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.message
        });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return res.status(500).json({
          success: false,
          error: 'Database error'
        });
      }

      // Default error response
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      });
      return;
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Graceful shutdown
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      this.shutdown();
    });

    // Graceful shutdown on signals
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await mongoose.connect(process.env.MONGODB_URI!, {
        retryWrites: true,
        w: 'majority'
      });
      
      console.log('Connected to MongoDB successfully');

      // Resume incomplete jobs
      await this.aiService.resumeIncompleteJobs();
      
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('Shutting down server...');
    
    try {
      // Close database connection
      await mongoose.connection.close();
      console.log('Database connection closed');
      
      // Exit process
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public start(): void {
    const port = process.env.PORT || 3000;
    
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    });
  }
}

// Start server
const server = new Server();
server.start();
