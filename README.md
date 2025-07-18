# Somers Novel Generator

A sophisticated AI-powered novel generation platform that creates genre-aware fiction with up to 10,000-word synopsis support, streaming generation, and resumable workflows.

## Features

- **15+ Genres** with 10+ subgenres each, all with explicit AI instructions
- **AI-Powered Generation** using GPT-4.1 with sophisticated prompting
- **Streaming Progress** with real-time updates and resumable generation
- **MongoDB Storage** with job recovery and persistence
- **Modern Frontend** built with React/Vite
- **Production Backend** using Express.js with comprehensive error handling
- **Upload Support** for up to 10,000-word synopsis files
- **Quality Control** with word count validation and retry logic

## Architecture

- **Frontend**: React/Vite (deployed on Netlify)
- **Backend**: Express.js (deployed on Railway)
- **Database**: MongoDB with transactional storage
- **AI**: OpenAI GPT-4.1 with genre-specific prompting
- **Streaming**: Real-time progress updates via WebSocket/SSE

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   - Copy `.env.example` files in both frontend and backend
   - Add your OpenAI API key and MongoDB connection string

3. **Start development servers**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Project Structure

```
├── frontend/           # React/Vite frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   └── utils/      # Utilities
├── backend/            # Express.js backend
│   ├── src/
│   │   ├── controllers/# Route controllers
│   │   ├── services/   # Business logic
│   │   ├── models/     # MongoDB models
│   │   ├── middleware/ # Express middleware
│   │   └── utils/      # Utilities
│   └── shared/         # Shared configurations
└── docs/               # Documentation
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Somers Novel Generator
```

## Development

- **Backend**: Express.js with TypeScript, MongoDB, OpenAI integration
- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Testing**: Jest for backend, Vitest for frontend
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier

## Deployment

- **Frontend**: Netlify with automatic builds from main branch
- **Backend**: Railway with MongoDB Atlas
- **Environment**: Production configurations included

## API Documentation

The backend provides comprehensive REST endpoints:

- `POST /api/novels/generate` - Start novel generation
- `GET /api/novels/:id/status` - Check generation status
- `GET /api/novels/:id/stream` - Stream generation progress
- `GET /api/genres` - Get available genres and subgenres

## License

Private - All rights reserved
