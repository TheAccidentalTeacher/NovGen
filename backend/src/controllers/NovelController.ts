import { Request, Response } from 'express';
import { NovelGenerationService } from '../services/NovelGenerationService';
import { Novel, Chapter, GenerationJob, User } from '../models/index';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export class NovelController {
  private generationService: NovelGenerationService;

  constructor() {
    this.generationService = new NovelGenerationService();
  }

  /**
   * Get available genres and subgenres
   */
  async getGenres(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const genres = this.generationService.getAvailableGenres();
      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      console.error('Error getting genres:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get genres'
      });
    }
  }

  /**
   * Estimate generation time and cost
   */
  async estimateGeneration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { wordCount } = req.body;
      
      if (!wordCount || wordCount < 10000 || wordCount > 200000) {
        res.status(400).json({
          success: false,
          error: 'Word count must be between 10,000 and 200,000'
        });
        return;
      }

      const estimation = this.generationService.estimateGeneration(wordCount);
      res.json({
        success: true,
        data: estimation
      });
    } catch (error) {
      console.error('Error estimating generation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to estimate generation'
      });
    }
  }

  /**
   * Start novel generation
   */
  async generateNovel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check user's generation limits
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      if (user.generationsUsed >= user.generationsLimit) {
        res.status(403).json({
          success: false,
          error: 'Generation limit exceeded. Please upgrade your subscription.'
        });
        return;
      }

      const {
        title,
        genre,
        subgenre,
        summary,
        wordCount,
        characterDescriptions,
        plotOutline,
        tone,
        style
      } = req.body;

      const generationRequest = {
        title,
        genre,
        subgenre,
        summary,
        wordCount,
        characterDescriptions,
        plotOutline,
        tone,
        style
      };

      const jobId = await this.generationService.startNovelGeneration(userId, generationRequest);

      // Update user's generation count
      user.generationsUsed += 1;
      await user.save();

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Novel generation started successfully'
        }
      });
    } catch (error) {
      console.error('Error starting novel generation:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start novel generation'
      });
    }
  }

  /**
   * Get generation progress
   */
  async getGenerationProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify the job belongs to the user
      const job = await GenerationJob.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Generation job not found'
        });
        return;
      }

      if (job.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const progress = await this.generationService.getGenerationProgress(jobId);
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error getting generation progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get generation progress'
      });
    }
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify the job belongs to the user
      const job = await GenerationJob.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Generation job not found'
        });
        return;
      }

      if (job.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      await this.generationService.cancelGeneration(jobId);
      res.json({
        success: true,
        message: 'Generation cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling generation:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel generation'
      });
    }
  }

  /**
   * Get user's novels
   */
  async getUserNovels(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const novels = await Novel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-chapterOutlines'); // Exclude large fields for list view

      const totalNovels = await Novel.countDocuments({ userId });
      const totalPages = Math.ceil(totalNovels / limit);

      res.json({
        success: true,
        data: {
          novels,
          pagination: {
            currentPage: page,
            totalPages,
            totalNovels,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error getting user novels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get novels'
      });
    }
  }

  /**
   * Get specific novel
   */
  async getNovel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { novelId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const novel = await Novel.findById(novelId);
      if (!novel) {
        res.status(404).json({
          success: false,
          error: 'Novel not found'
        });
        return;
      }

      if (novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: novel
      });
    } catch (error) {
      console.error('Error getting novel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get novel'
      });
    }
  }

  /**
   * Get novel chapters
   */
  async getNovelChapters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { novelId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Verify novel belongs to user
      const novel = await Novel.findById(novelId);
      if (!novel) {
        res.status(404).json({
          success: false,
          error: 'Novel not found'
        });
        return;
      }

      if (novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const chapters = await Chapter.find({ novelId })
        .sort({ chapterNumber: 1 });

      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error getting novel chapters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chapters'
      });
    }
  }

  /**
   * Get specific chapter
   */
  async getChapter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        res.status(404).json({
          success: false,
          error: 'Chapter not found'
        });
        return;
      }

      // Verify chapter belongs to user's novel
      const novel = await Novel.findById(chapter.novelId);
      if (!novel || novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: chapter
      });
    } catch (error) {
      console.error('Error getting chapter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chapter'
      });
    }
  }

  /**
   * Enhance chapter
   */
  async enhanceChapter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const { enhancementType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const validEnhancements = ['dialogue', 'description', 'pacing', 'character_development', 'overall'];
      if (!enhancementType || !validEnhancements.includes(enhancementType)) {
        res.status(400).json({
          success: false,
          error: 'Valid enhancement type required'
        });
        return;
      }

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        res.status(404).json({
          success: false,
          error: 'Chapter not found'
        });
        return;
      }

      // Verify chapter belongs to user's novel
      const novel = await Novel.findById(chapter.novelId);
      if (!novel || novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const enhancedContent = await this.generationService.enhanceChapter(
        chapterId,
        enhancementType
      );

      res.json({
        success: true,
        data: {
          enhancedContent,
          message: 'Chapter enhanced successfully'
        }
      });
    } catch (error) {
      console.error('Error enhancing chapter:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance chapter'
      });
    }
  }

  /**
   * Generate additional chapters
   */
  async generateAdditionalChapters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { novelId } = req.params;
      const { startChapter, endChapter } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!startChapter || !endChapter || startChapter > endChapter) {
        res.status(400).json({
          success: false,
          error: 'Valid start and end chapter numbers required'
        });
        return;
      }

      // Verify novel belongs to user
      const novel = await Novel.findById(novelId);
      if (!novel) {
        res.status(404).json({
          success: false,
          error: 'Novel not found'
        });
        return;
      }

      if (novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const jobId = await this.generationService.generateAdditionalChapters(
        novelId,
        startChapter,
        endChapter
      );

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Additional chapter generation started'
        }
      });
    } catch (error) {
      console.error('Error generating additional chapters:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate additional chapters'
      });
    }
  }

  /**
   * Delete novel
   */
  async deleteNovel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { novelId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const novel = await Novel.findById(novelId);
      if (!novel) {
        res.status(404).json({
          success: false,
          error: 'Novel not found'
        });
        return;
      }

      if (novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Delete novel and all its chapters
      await Chapter.deleteMany({ novelId });
      await GenerationJob.deleteMany({ novelId });
      await Novel.findByIdAndDelete(novelId);

      res.json({
        success: true,
        message: 'Novel deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting novel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete novel'
      });
    }
  }

  /**
   * Export novel (as text or JSON)
   */
  async exportNovel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { novelId } = req.params;
      const { format } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const novel = await Novel.findById(novelId);
      if (!novel) {
        res.status(404).json({
          success: false,
          error: 'Novel not found'
        });
        return;
      }

      if (novel.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const chapters = await Chapter.find({ novelId })
        .sort({ chapterNumber: 1 });

      if (format === 'json') {
        res.json({
          success: true,
          data: {
            novel,
            chapters
          }
        });
      } else {
        // Export as text
        let content = `${novel.title}\n\n`;
        content += `${novel.description || novel.summary}\n\n`;
        content += '='.repeat(50) + '\n\n';
        
        for (const chapter of chapters) {
          content += `Chapter ${chapter.chapterNumber}: ${chapter.title}\n\n`;
          content += chapter.content + '\n\n';
          content += '-'.repeat(30) + '\n\n';
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${novel.title}.txt"`);
        res.send(content);
      }
    } catch (error) {
      console.error('Error exporting novel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export novel'
      });
    }
  }

  /**
   * User registration
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        email,
        passwordHash,
        name
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
            generationsUsed: user.generationsUsed,
            generationsLimit: user.generationsLimit
          }
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
            generationsUsed: user.generationsUsed,
            generationsLimit: user.generationsLimit
          }
        }
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log in'
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await User.findById(userId).select('-passwordHash');
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  }
}
