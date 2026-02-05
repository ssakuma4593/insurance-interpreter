# Quick Start Guide

## Setup & Run Locally

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

Then edit `.env` and add your OpenAI API key, then run:
```bash
npm run dev
```

### Option 2: Manual Setup

1. **Create directories:**
   ```bash
   mkdir -p data uploads
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your `OPENAI_API_KEY`

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Testing the Application

### 1. Upload a PDF
- Go to the landing page
- Click "Choose File" and select an insurance plan PDF
- Click "Upload & Analyze"
- Wait for processing (this may take a minute for large PDFs)

### 2. Select Explanation Level
- Choose Beginner, Intermediate, or Advanced
- Each level provides different detail and terminology

### 3. View Plan Summary
- Click the "Plan Summary" tab
- Review the generated summary with key plan details

### 4. Ask Questions
- Click the "Ask Questions" tab
- Try example questions or type your own:
  - "What is my deductible and out-of-pocket max?"
  - "What's my copay for primary care vs specialist?"
  - "Are preventive visits covered? How often?"
  - "Do I need referrals or prior authorization?"
- Check citations and confidence levels

### 5. Test Edge Cases
- Ask about information NOT in the document (should refuse)
- Try different question phrasings
- Test all three explanation levels

## Troubleshooting

### Port Already in Use
If port 3000 is busy:
```bash
PORT=3001 npm run dev
```

### Database Errors
Delete and recreate:
```bash
rm -f data/insurance.db
npm run dev  # Database will be recreated automatically
```

### OpenAI API Errors
- Verify your API key in `.env`
- Check your OpenAI account has credits
- Ensure network connectivity

### PDF Upload Fails
- Check file is under 10MB
- Verify file is a valid PDF
- Check `uploads/` directory exists and is writable

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```
