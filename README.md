# Novel Generator

An AI-powered full-stack web application that generates complete novels using GPT-4. Built with Next.js, MongoDB, and TypeScript for seamless deployment to Vercel.

## Features

- **Genre & Subgenre Selection**: Choose from 20+ genres and 200+ subgenres with Christian fiction featured first
- **Customizable Parameters**: Set word count (20K-200K), chapters (1-100), and premise (up to 10K words)
- **AI-Powered Generation**: Uses GPT-4 Turbo for high-quality outline and chapter generation
- **Linear Workflow**: Simple step-by-step process: Setup → Outline → Draft Chapters → Export
- **Progress Tracking**: Real-time progress indicators with detailed logging
- **Quality Control**: Automatic chapter length validation with regeneration for out-of-range word counts
- **Export to DOCX**: Professional document formatting with table of contents and statistics
- **Iterative AI Improvement**: Built-in system for refining AI prompts based on feedback
- **Full Debug Logging**: Comprehensive error handling and debugging with F12 developer tools support

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4 Turbo
- **Document Generation**: docx library
- **Logging**: Winston
- **Deployment**: Vercel (one-click deployment)

## Quick Start

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration  
MONGODB_URI=your_mongodb_connection_string_here

# App Configuration
NODE_ENV=development

# Debug Configuration
DEBUG_LOGS=true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment to Vercel

### One-Click Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Set Environment Variables**: In Vercel dashboard, add:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `MONGODB_URI`: Your MongoDB connection string
   - `DEBUG_LOGS`: Set to `true` for detailed logging
3. **Deploy**: Click deploy - the app will build and deploy automatically

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Usage Guide

### 1. Project Setup
- Select genre (Christian featured first) and subgenre
- Set total word count (20,000 - 200,000 words)
- Choose number of chapters (1-100)
- Enter detailed premise/synopsis (up to 10,000 characters)
- Click "Save Premise"

### 2. Generate Outline
- Click "Generate Outline" to create chapter-by-chapter summaries
- Review the generated outline in the expandable section
- Outline is editable if needed

### 3. Draft Chapters
- Click "Draft Chapters" to begin AI chapter generation
- Monitor real-time progress with chapter counter and progress bar
- Each chapter is automatically validated for word count (±300 words)
- Out-of-range chapters are automatically regenerated (up to 3 attempts)

### 4. Export Novel
- Once all chapters are complete, click "Download as DOCX"
- Receive professionally formatted document with:
  - Title page with genre/subgenre
  - Table of contents
  - All chapters with proper formatting
  - Statistics and original premise

## AI Prompt Refinement System

The app includes a sophisticated system for iterating on AI prompts to improve novel quality:

### Current Configuration Location
- **Base Prompt**: Core instructions for the AI novelist
- **Vibe Prompt**: Style and tone guidance to reduce AI patterns
- **Style Instructions**: Specific writing technique requirements

### Updating AI Prompts
Send PUT requests to `/api/project` with updated prompt configurations:

```javascript
fetch('/api/project', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vibePrompt: "Your updated style instructions...",
    notes: "Iteration 3: Reduced repetitive phrasing"
  })
})
```

### Version Control
- Each prompt update creates a new version
- Previous versions are preserved
- Notes field tracks reasoning for changes

## Debug & Troubleshooting

### Debug Console
- Built-in debug console shows real-time logs
- Toggle visibility with "Show/Hide Logs" button
- Logs include timestamps and detailed operation info

### F12 Developer Tools
- Full browser developer tools support
- Network requests visible and debuggable
- Console errors and warnings displayed

### Log Files
- Server logs saved to `/logs/` directory
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Structured JSON format for easy parsing

### Common Issues

**"Failed to generate outline"**
- Check OpenAI API key and credits
- Verify premise is not empty
- Check network connectivity

**"Chapter generation failed"**
- Monitor debug logs for specific errors
- Check MongoDB connection
- Verify sufficient OpenAI rate limits

**"Export failed"**
- Ensure all chapters are completed
- Check project status is 'completed'
- Verify docx library installation

## Rate Limiting & Performance

### OpenAI Configuration
- Model: GPT-4 Turbo (latest available)
- Temperature: 0.8 for creative writing
- Max tokens: Dynamic based on chapter length
- Automatic retry logic with exponential backoff

### MongoDB Optimization
- Indexed on project ID for fast lookups
- Atomic updates for chapter progress
- Bulk operations for debug logs

### Vercel Deployment
- Serverless functions with 60-second timeout
- Background processing for long-running chapter generation
- Automatic scaling based on demand

## Architecture

### Frontend (`app/page.tsx`)
- Single-page application with step-by-step workflow
- Real-time progress updates via polling
- Responsive design with Tailwind CSS

### API Routes (`app/api/`)
- `/api/project` - Project CRUD and prompt management
- `/api/project/[id]` - Individual project retrieval
- `/api/project/[id]/outline` - Outline generation
- `/api/project/[id]/chapters` - Chapter generation with progress tracking
- `/api/project/[id]/progress` - Real-time progress polling
- `/api/project/[id]/export` - DOCX document generation

### Services (`lib/`)
- `openai-service.ts` - AI integration with context management
- `database.ts` - MongoDB operations and schema
- `document-exporter.ts` - DOCX generation and formatting
- `logger.ts` - Comprehensive logging system
- `genres.ts` - Genre and subgenre definitions

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
1. Check the debug console for detailed error information
2. Review logs in the `/logs` directory
3. Open an issue on GitHub with:
   - Error messages from debug console
   - Steps to reproduce
   - Environment details (Node version, browser, etc.)

---

**Built with ❤️ for creative writers and AI enthusiasts**
