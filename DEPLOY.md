# Deployment Guide

This guide will help you deploy the Insurance Interpreter app to **satoesakuma.com/insurance-interpreter**.

## Custom Domain Setup

The app is configured to run at `/insurance-interpreter` base path. This means:
- Production URL: `https://satoesakuma.com/insurance-interpreter`
- All routes will work under this prefix automatically

## Option 1: Railway (Recommended - Easiest)

Railway is perfect for this app because it supports:
- SQLite databases (persistent storage)
- File uploads (persistent file system)
- Next.js apps
- Easy environment variable management

### Steps:

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub (free tier available)

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `insurance-interpreter` repository
   - Select the `main` branch (or `feature/hybrid-search` if you want to test that)

3. **Set Environment Variables**
   - In your Railway project, go to "Variables" tab
   - Add: `OPENAI_API_KEY` = `your_openai_api_key_here`
   - Add: `NEXT_PUBLIC_BASE_PATH` = `/insurance-interpreter` (for custom domain)
   - Optional: `DATABASE_PATH` = `/app/data/insurance.db`
   - Optional: `UPLOAD_DIR` = `/app/uploads`

4. **Configure Custom Domain (satoesakuma.com)**
   - In Railway, go to "Settings" → "Networking"
   - Add custom domain: `satoesakuma.com`
   - Configure your DNS:
     - Add CNAME record: `@` → `your-railway-app.railway.app`
     - Or A record pointing to Railway's IP (check Railway dashboard)
   - Railway will handle SSL certificates automatically

4. **Deploy**
   - Railway will automatically detect it's a Next.js app
   - It will build and deploy automatically
   - Wait for deployment to complete (usually 2-3 minutes)

5. **Get Public URL**
   - Once deployed, Railway will give you a public URL
   - Click "Generate Domain" to get a custom domain like `your-app.railway.app`
   - Share this URL with your friend!

### Railway Free Tier:
- $5 free credit per month
- Enough for testing and light usage
- Auto-sleeps after inactivity (wakes up on first request)

---

## Option 2: Render (Alternative)

Render also supports persistent storage and is good for Next.js apps.

### Steps:

1. **Sign up for Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create a Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository and branch

3. **Configure Build Settings**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Set Environment Variables**
   - Add `OPENAI_API_KEY`
   - Add `DATABASE_PATH` = `/opt/render/project/src/data/insurance.db`
   - Add `UPLOAD_DIR` = `/opt/render/project/src/uploads`

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy
   - Get your public URL from the dashboard

---

## Option 3: Vercel (Quick but Limited)

⚠️ **Note**: Vercel is serverless and doesn't support persistent file storage well. Your SQLite database and uploads will be lost on each deployment. Only use for quick demos.

### Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Add `OPENAI_API_KEY` when asked

3. **For Production**
   ```bash
   vercel --prod
   ```

---

## Environment Variables Needed

Make sure to set these in your deployment platform:

- **Required:**
  - `OPENAI_API_KEY` - Your OpenAI API key

- **Optional:**
  - `DATABASE_PATH` - Path to SQLite database (default: `./data/insurance.db`)
  - `UPLOAD_DIR` - Directory for uploads (default: `./uploads`)
  - `MAX_FILE_SIZE` - Max file size in bytes (default: 10485760 = 10MB)

---

## Testing After Deployment

1. Visit your public URL
2. Upload a test PDF
3. Try asking questions
4. Share the URL with your friend!

---

## Troubleshooting

### Database errors
- Make sure the data directory path is writable
- Check that `DATABASE_PATH` environment variable is set correctly

### File upload errors
- Ensure `UPLOAD_DIR` is set and writable
- Check file size limits

### Build errors
- Make sure all dependencies are in `package.json`
- Check that Node.js version is 18+
