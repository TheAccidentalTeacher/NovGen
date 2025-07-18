# Deployment Guide for Somers Novel Generator

## 🚀 Railway Deployment (Backend)

### 1. Prerequisites
- Railway account (https://railway.app)
- MongoDB Atlas account (or Railway MongoDB addon)
- OpenAI API key

### 2. Deploy to Railway

**Option A: One-Click Deploy**
1. Go to [Railway](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account and select `TheAccidentalTeacher/NovGen`
4. Railway will automatically detect the `railway.json` configuration

**Option B: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 3. Environment Variables (Railway)
Set these in your Railway dashboard:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/somers-novel-generator
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-super-long-random-jwt-secret-here
CORS_ORIGIN=https://your-netlify-domain.netlify.app
```

### 4. Database Setup
**Option A: MongoDB Atlas**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create cluster and get connection string
3. Add connection string to Railway environment variables

**Option B: Railway MongoDB**
```bash
railway add mongodb
```

---

## 🌐 Netlify Deployment (Frontend)

### 1. Deploy to Netlify

**Option A: Git Integration**
1. Go to [Netlify](https://netlify.app)
2. Click "New site from Git"
3. Connect GitHub and select `TheAccidentalTeacher/NovGen`
4. Netlify will automatically use the `netlify.toml` configuration

**Option B: Netlify CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### 2. Environment Variables (Netlify)
Set these in your Netlify dashboard:

```env
VITE_API_URL=https://your-railway-app.railway.app
VITE_APP_NAME=Somers Novel Generator
VITE_APP_VERSION=1.0.0
```

### 3. Build Settings
Netlify will automatically detect:
- **Base directory**: `frontend`
- **Build command**: `npm ci && npm run build`
- **Publish directory**: `frontend/dist`

---

## 🔧 Step-by-Step Deployment

### Step 1: Deploy Backend to Railway
1. **Create Railway Project**
   - Visit https://railway.app
   - Click "Deploy from GitHub repo"
   - Select your `NovGen` repository

2. **Configure Environment Variables**
   ```env
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=generate_a_long_random_string
   CORS_ORIGIN=https://your-app-name.netlify.app
   ```

3. **Get Railway URL**
   - After deployment, Railway will provide a URL like:
   - `https://your-app-name.railway.app`

### Step 2: Deploy Frontend to Netlify
1. **Create Netlify Site**
   - Visit https://netlify.app
   - Click "New site from Git"
   - Select your `NovGen` repository

2. **Configure Environment Variables**
   ```env
   VITE_API_URL=https://your-railway-app.railway.app
   VITE_APP_NAME=Somers Novel Generator
   ```

3. **Update CORS Origin**
   - Go back to Railway
   - Update `CORS_ORIGIN` to your Netlify URL
   - Redeploy the backend

### Step 3: Test Deployment
1. **Backend Health Check**
   - Visit: `https://your-railway-app.railway.app/health`
   - Should return: `{"success": true, "message": "Server is healthy"}`

2. **Frontend Access**
   - Visit your Netlify URL
   - Should load the novel generator interface

3. **API Integration**
   - Test genre loading
   - Test file upload
   - Test generation (with OpenAI key configured)

---

## 🔐 Security Checklist

### Railway (Backend)
- ✅ Environment variables set securely
- ✅ CORS configured with specific frontend domain
- ✅ Rate limiting enabled
- ✅ Input validation and sanitization
- ✅ Helmet security headers
- ✅ MongoDB connection secured

### Netlify (Frontend)
- ✅ Security headers configured in netlify.toml
- ✅ Environment variables for API URL
- ✅ Client-side routing configured
- ✅ Build optimization enabled

---

## 🚨 Common Issues & Solutions

**Backend Issues:**
- **Build fails**: Check Node.js version (requires 18+)
- **Database connection**: Verify MongoDB URI and network access
- **OpenAI errors**: Validate API key and check quotas
- **CORS errors**: Ensure CORS_ORIGIN matches frontend domain

**Frontend Issues:**
- **Build fails**: Check package.json dependencies
- **API calls fail**: Verify VITE_API_URL points to Railway backend
- **Routing issues**: netlify.toml handles client-side routing

**Environment Variables:**
- **Railway**: Set in project dashboard under "Variables"
- **Netlify**: Set in site dashboard under "Environment variables"

---

## 📊 Monitoring & Logs

**Railway Monitoring:**
- View logs in Railway dashboard
- Monitor resource usage
- Set up health checks

**Netlify Monitoring:**
- Deploy logs in Netlify dashboard
- Function logs (if using serverless functions)
- Analytics and performance metrics

---

## 🔄 Continuous Deployment

Both platforms support automatic deployment from GitHub:

1. **Push to main branch** → Automatic deployment
2. **Pull request previews** (Netlify feature)
3. **Rollback capabilities** on both platforms

Your Somers Novel Generator is now ready for production deployment! 🎉
