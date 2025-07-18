# Railway Deployment Guide - MongoDB Setup

## Current Issue
Railway health checks are failing because the MongoDB connection is not properly configured.

## Required Environment Variables

You need to set these environment variables in your Railway project:

### 1. Database Configuration
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### 2. API Keys
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Server Configuration
```bash
NODE_ENV=production
PORT=3000
```

### 4. Security (Optional but recommended)
```bash
JWT_SECRET=your_jwt_secret_here_make_it_long_and_random
CORS_ORIGIN=https://your-frontend-domain.netlify.app
```

## MongoDB Setup Options

### Option 1: MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/atlas
   - Create a free account
   - Create a new cluster (free tier is fine)

2. **Create Database User**
   - Go to Database Access
   - Add New Database User
   - Choose password authentication
   - Save username and password

3. **Configure Network Access**
   - Go to Network Access
   - Add IP Address
   - **IMPORTANT**: Add `0.0.0.0/0` to allow Railway access
   - Or find Railway's IP ranges and add them specifically

4. **Get Connection String**
   - Go to Clusters
   - Click Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<database>` with your database name (e.g., `somers-novel-generator`)

### Option 2: Railway MongoDB Plugin (If Available)

1. Go to your Railway project
2. Click "Add Service"
3. Look for MongoDB in the plugins
4. Install and configure

## How to Set Environment Variables in Railway

1. **Via Railway Dashboard**
   - Go to your Railway project
   - Click on your service
   - Go to "Variables" tab
   - Add each variable name and value

2. **Via Railway CLI**
   ```bash
   railway login
   railway link
   railway variables set MONGODB_URI="your_connection_string_here"
   railway variables set OPENAI_API_KEY="your_openai_key_here"
   railway variables set NODE_ENV="production"
   railway variables set PORT="3000"
   ```

## Testing the Configuration

Run the diagnostic script locally first:
```bash
cd backend
npm run diagnose
```

This will test your MongoDB connection and show any issues.

## Common MongoDB Connection Issues

### 1. Authentication Failed
- Check username/password in connection string
- Ensure special characters are URL-encoded

### 2. Network Timeout
- Add `0.0.0.0/0` to MongoDB Atlas IP whitelist
- Check connection string format

### 3. Database Not Found
- Ensure database name is correct in connection string
- MongoDB will create the database automatically when first used

### 4. SSL/TLS Issues
- Use `mongodb+srv://` for Atlas (includes SSL)
- For self-hosted: add `?ssl=true` to connection string

## Example Working Connection String

```bash
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/somers-novel-generator?retryWrites=true&w=majority
```

## Troubleshooting Railway Health Checks

If health checks still fail after setting up MongoDB:

1. **Check Railway Logs**
   - Look for MongoDB connection errors
   - Check if server starts successfully

2. **Test Health Endpoint**
   - Once deployed, test: `https://your-app.railway.app/health`
   - Should return JSON with server and database status

3. **Monitor Server Startup**
   - Server should log "Connected to MongoDB successfully"
   - If not, check environment variables and connection string

## Next Steps

1. Set up MongoDB Atlas account and cluster
2. Configure network access for Railway
3. Add MONGODB_URI to Railway environment variables
4. Redeploy your Railway service
5. Monitor logs for successful MongoDB connection
