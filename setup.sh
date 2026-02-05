#!/bin/bash

echo "Setting up Insurance Plan Interpreter..."

# Create necessary directories
mkdir -p data uploads

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# OpenAI API Key (required)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Database path (default: ./data/insurance.db)
# DATABASE_PATH=./data/insurance.db

# Optional: Upload directory (default: ./uploads)
# UPLOAD_DIR=./uploads

# Optional: Max file size in bytes (default: 10485760 = 10MB)
# MAX_FILE_SIZE=10485760
EOF
    echo "✓ Created .env file - Please add your OPENAI_API_KEY"
else
    echo "✓ .env file already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete! Next steps:"
echo "1. Edit .env and add your OPENAI_API_KEY"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
