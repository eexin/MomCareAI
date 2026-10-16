# 🌸 MumCare AI - Deployment Guide

## For Sharing This Project

### What's Included in the Folder
✅ All source code (frontend + backend)
✅ Configuration files
✅ Documentation

### What's NOT Included (Recipients Need to Add)
❌ `node_modules/` folders (dependencies)
❌ `.env` file with AWS Bedrock API key
❌ Build artifacts

---

## Setup Instructions for Recipients

### Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- AWS Bedrock API key ([Get one here](https://console.aws.amazon.com/bedrock))

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 2: Configure AWS Bedrock API Key

Create a `.env` file in the root folder:

```env
AWS_BEDROCK_API_KEY=your-bedrock-api-key-here
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

Replace `your-bedrock-api-key-here` with your actual Bedrock long-term API key.

### Step 3: Run the Application

```bash
# Start both backend and frontend
npm run dev
```

The app will open at: **http://localhost:5175**

---

## Alternative: Deploy to Production

### Option 1: Deploy to Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Push code to GitHub
2. Import to Vercel
3. Set build command: `cd client && npm run build`
4. Set output directory: `client/dist`

**Backend (Railway):**
1. Create new project on Railway
2. Add environment variables from `.env`
3. Deploy from GitHub
4. Update frontend API URL to Railway URL

### Option 2: Deploy to AWS (Full Stack)

**Using AWS Amplify + Lambda:**
1. Frontend: Deploy to Amplify
2. Backend: Convert to Lambda functions
3. API Gateway for routing
4. Store API key in AWS Secrets Manager

### Option 3: Docker Deployment

```bash
# Build and run with Docker
docker-compose up
```

---

## File Structure

```
bedrock-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── types.ts       # TypeScript types
│   │   ├── App.tsx        # Main app
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── server/
│   └── index.js           # Express backend
├── .env                   # API keys (NOT in git)
├── .env.example           # Template for .env
├── package.json           # Backend dependencies
└── README.md              # Project documentation
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

### "Port already in use"
```bash
# Kill processes on ports 3001 and 5173
# Windows:
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Mac/Linux:
lsof -ti:3001 | xargs kill -9
```

### AWS Bedrock API errors
- Verify your API key is correct in `.env`
- Check your AWS region matches where you created the key
- Ensure the model ID is correct for your region

---

## Security Notes

⚠️ **NEVER commit `.env` file to git**
⚠️ **NEVER share your AWS Bedrock API key publicly**
⚠️ **Add `.env` to `.gitignore`**

---

## Cost Considerations

- AWS Bedrock charges per API call
- Claude 3.5 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Estimated cost: $0.01-0.05 per care report generated
- Monitor usage in AWS Console

---

## Support

For issues:
1. Check the troubleshooting section above
2. Verify all dependencies are installed
3. Ensure `.env` is configured correctly
4. Check browser console for errors (F12)
