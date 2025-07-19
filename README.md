# NovGen

An AI-powered novel generation platform that creates complete novels with multiple chapters using OpenAI's GPT models.

## Features

- **AI Novel Generation**: Generate complete novels with multiple chapters using advanced AI
- **Multiple Genres**: Support for 15+ genres including fantasy, sci-fi, mystery, romance, and more
- **Customizable Parameters**: Control tone, setting, character count, and chapter count
- **Real-time Progress**: Track novel generation progress with live updates
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Full-Stack Architecture**: Express.js backend with React frontend

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **OpenAI API** for AI-powered generation
- **WebSocket** for real-time progress updates
- **JWT** authentication
- **Winston** logging

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Hot Toast** for notifications

## Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- MongoDB (local or cloud)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheAccidentalTeacher/NovGen.git
   cd NovGen
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend environment (optional)
   cd ../frontend
   echo "VITE_API_URL=http://localhost:3001" > .env
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend
   
   # Terminal 2 - Frontend  
   npm run dev:frontend
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/novgen
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_super_secure_jwt_secret_here
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

## Project Structure

```
NovGen/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/         # MongoDB models
│   │   ├── services/       # Business logic
│   │   └── server.ts       # Server entry point
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── main.tsx       # App entry point
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

### Novels
- `GET /api/novels` - Get all novels
- `GET /api/novels/:id` - Get novel by ID
- `POST /api/novels/generate` - Generate new novel
- `DELETE /api/novels/:id` - Delete novel
- `GET /api/novels/:id/progress` - Get generation progress

### Chapters
- `GET /api/novels/:novelId/chapters` - Get chapters for novel
- `GET /api/novels/:novelId/chapters/:chapterId` - Get specific chapter

### Health
- `GET /api/health` - Health check endpoint

## Deployment

### Railway (Backend)
The backend is configured for deployment on Railway with automatic deployments from the main branch.

### Netlify (Frontend) 
The frontend is configured for deployment on Netlify with automatic builds from the main branch.

## Development

### Available Scripts

#### Root Level
- `npm run install:all` - Install all dependencies
- `npm run dev:backend` - Start backend in development
- `npm run dev:frontend` - Start frontend in development
- `npm run build:backend` - Build backend for production
- `npm run build:frontend` - Build frontend for production

#### Backend
- `npm run dev` - Start with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Lint code

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

---

**NovGen** - Bringing AI-powered creativity to novel writing.
