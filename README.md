# ReceiptWise - Complete System

A full-stack application for effortlessly splitting expenses among friends by uploading receipt images. The system uses Google's Gemini AI to extract item details and integrates with Splitwise for expense management.

## Project Structure

This project consists of two main components:

```
/
├── backend/                # FastAPI backend application
│   ├── fastapi-env/        # Python virtual environment
│   ├── models/             # Pydantic data models
│   ├── utils/              # Backend utilities
│   ├── img/                # Temporary receipt storage
│   ├── main.py             # FastAPI app entry point
│   └── README.md           # Backend documentation
│
├── frontend/               # Next.js frontend application
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   └── README.md       # Frontend documentation
│
└── README.md               # This file
```

## System Overview

- **Backend**: Processes receipt images with Gemini AI, calculates expense splits, and integrates with Splitwise API
- **Frontend**: Provides a user-friendly interface for uploading images, assigning items to people, and creating expenses

## Prerequisites

- Python 3.10+ for the backend
- Node.js 18+ for the frontend
- Splitwise API credentials
- Google Gemini API key

## Complete Setup Instructions

### 1. Set up the Backend

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv fastapi-env
source fastapi-env/bin/activate  # On Windows: fastapi-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API keys
cp .env.example .env
# Edit .env with your actual API keys
```

### 2. Set up the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Create environment file
cp .env.example .env.local
# Set SPLIT_API_BASE_URL to point to your backend
```

## Running the Application

### Start the Backend

```bash
cd backend
source fastapi-env/bin/activate  # On Windows: fastapi-env\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start the Frontend

```bash
cd frontend
npm run dev
# or
yarn dev
# or
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables Setup

### Backend Environment Variables

The backend requires the following environment variables to be set:

```bash
# In backend/.env file
SPLITWISE_API_KEY=your_splitwise_api_key
GOOGLE_API_KEY=your_google_gemini_api_key
```

**Important**: Make sure there are no extra spaces at the beginning of lines in the `.env` file.

### Starting the Backend with Environment Variables

```bash
cd backend
.\venv\Scripts\activate
$env:SPLITWISE_API_KEY="your_api_key"
$env:GOOGLE_API_KEY="your_gemini_key"
uvicorn main:app --reload
```

Or use the provided scripts:
```bash
# Windows
.\start_server.bat

# PowerShell
.\start_server.ps1
```

## Development Workflow

1. Make changes to backend (FastAPI)
2. Test API endpoints using browser or tools like curl/Postman
3. Make changes to frontend (Next.js)
4. Test the end-to-end flow

## Configuration for Development Environment

For local development, you may want to use proxy settings in the frontend to avoid CORS issues:

In `frontend/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```

## Testing

- Backend tests can be run with `pytest`
- Frontend tests can be run with `npm test` or `jest`

## Deployment Considerations

- Backend can be deployed on any Python-supported server (AWS, GCP, DigitalOcean)
- Frontend can be deployed on Vercel, Netlify, or any Next.js-supported hosting
- Ensure API URLs are correctly configured for production

