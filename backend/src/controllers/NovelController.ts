import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import NovelGenerationService from '../services/NovelGenerationService';
import { Novel, Chapter, Job } from '../models/index';
import { genreInstructions } from '../../shared/genreInstructions';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class NovelController {
  private generationService: NovelGenerationService;

  constructor(generationService?: NovelGenerationService) {
    this.generationService = generationService || new NovelGenerationService();
  }

  /**
   * Get available genres and subgenres
   */
  getGenres = async (req: Request, res: Response): Promise<void> => {
    try {
      // Transform genre instructions into client-friendly format
      const genres = Object.keys(genreInstructions).map(genreKey => ({
        id: genreKey,
        name: this.formatGenreName(genreKey),
        subgenres: Object.keys(genreInstructions[genreKey]).map(subgenreKey => ({
          id: subgenreKey,
          name: this.formatGenreName(subgenreKey),
          description: genreInstructions[genreKey][subgenreKey].substring(0, 100) + '...'
        }))
      }));

      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      logger.error('Error fetching genres:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch genres'
      });
    }
  };

  /**
   * Start novel generation
   */
  generateNovel = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        title,
        genre,
        subgenre,
        synopsis,
        wordCount,
        chapters,
        targetChapterLength,
        wordCountVariance,
        fictionLength
      } = req.body;

      // Start generation
      const jobId = await this.generationService.startGeneration({
        title,
        genre,
        subgenre,
        synopsis,
        wordCount: parseInt(wordCount),
        chapters: parseInt(chapters),
        targetChapterLength: parseInt(targetChapterLength),
        wordCountVariance: parseInt(wordCountVariance),
        fictionLength
      });

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Novel generation started',
          estimatedTime: `${Math.ceil(chapters * 2)} minutes`
        }
      });

    } catch (error) {
      logger.error('Error starting generation:', error);
      res.status(500).json({
        success: false,
        error: (error as Error)?.message || 'Failed to start novel generation'
      });
    }
  };

  /**
   * Get generation job status
   */
  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      const status = await this.generationService.getJobStatus(jobId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Error fetching job status:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch job status'
        });
      }
    }
  };

  /**
   * Stream generation progress
   */
  streamProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Get progress stream
      const stream = this.generationService.createProgressStream(jobId);

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        jobId, 
        timestamp: new Date() 
      })}\n\n`);

      // Listen for progress events
      const progressHandler = (data: any) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          ...data 
        })}\n\n`);
      };

      stream.on('progress', progressHandler);

      // Handle client disconnect
      req.on('close', () => {
        stream.removeListener('progress', progressHandler);
        res.end();
      });

      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: new Date() 
        })}\n\n`);
      }, 30000); // Every 30 seconds

      req.on('close', () => {
        clearInterval(heartbeat);
      });

    } catch (error) {
      logger.error('Error setting up progress stream:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set up progress stream'
      });
    }
  };

  /**
   * Calculate chapter configuration
   */
  calculateChapters = async (req: Request, res: Response): Promise<void> => {
    try {
      const { wordCount, targetChapterLength } = req.query;

      const totalWords = parseInt(wordCount as string);
      const chapterLength = parseInt(targetChapterLength as string);

      if (!totalWords || !chapterLength) {
        res.status(400).json({
          success: false,
          error: 'Word count and target chapter length are required'
        });
        return;
      }

      if (totalWords < 10000 || totalWords > 500000) {
        res.status(400).json({
          success: false,
          error: 'Word count must be between 10,000 and 500,000'
        });
        return;
      }

      if (chapterLength < 500 || chapterLength > 10000) {
        res.status(400).json({
          success: false,
          error: 'Target chapter length must be between 500 and 10,000'
        });
        return;
      }

      const chapters = Math.round(totalWords / chapterLength);
      const actualChapterLength = Math.round(totalWords / chapters);
      
      let fictionLength: string;
      if (totalWords < 40000) {
        fictionLength = 'novella';
      } else if (totalWords < 120000) {
        fictionLength = 'novel';
      } else {
        fictionLength = 'epic';
      }

      res.json({
        success: true,
        data: {
          totalWords,
          chapters,
          targetChapterLength: chapterLength,
          actualChapterLength,
          fictionLength
        }
      });

    } catch (error) {
      logger.error('Error calculating chapters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate chapter configuration'
      });
    }
  };

  /**
   * Upload and validate synopsis file
   */
  uploadSynopsis = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const file = req.file;

      // Validate file type
      const allowedTypes = ['text/plain', 'text/markdown'];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          error: 'Only .txt and .md files are allowed'
        });
        return;
      }

      // Convert buffer to string
      const content = file.buffer.toString('utf-8');

      // Validate content length
      if (content.length > 10000) {
        res.status(400).json({
          success: false,
          error: 'Synopsis must be less than 10,000 characters'
        });
        return;
      }

      if (content.length < 50) {
        res.status(400).json({
          success: false,
          error: 'Synopsis must be at least 50 characters'
        });
        return;
      }

      // Basic content validation
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      res.json({
        success: true,
        data: {
          content: content.trim(),
          characterCount: content.length,
          wordCount,
          filename: file.originalname
        }
      });

    } catch (error) {
      logger.error('Error processing synopsis upload:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process synopsis file'
      });
    }
  };

  /**
   * Get novel details with chapters
   */
  getNovel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { novelId } = req.params;

      if (!novelId) {
        res.status(400).json({
          success: false,
          error: 'Novel ID is required'
        });
        return;
      }

      // This would fetch from database - placeholder for now
      res.json({
        success: true,
        data: {
          message: 'Novel retrieval endpoint - implementation pending'
        }
      });

    } catch (error) {
      logger.error('Error fetching novel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch novel'
      });
    }
  };

  /**
   * List user's novels
   */
  listNovels = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, status, genre } = req.query;

      // This would fetch from database with pagination - placeholder for now
      res.json({
        success: true,
        data: {
          novels: [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 0,
            pages: 0
          }
        }
      });

    } catch (error) {
      logger.error('Error listing novels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list novels'
      });
    }
  };

  /**
   * Helper method to format genre names for display
   */
  private formatGenreName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

export default NovelController;
