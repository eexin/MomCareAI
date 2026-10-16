# 🌸 MumCare AI - Quick Start Guide

## ✨ What's New - Streamlined UX

The app is now **super easy to use** with minimal clicks:

### Quick Wellness Check (3 clicks!)
1. **Tap a preset**: 😊 Feeling Good | 😴 Tired but OK | 😫 Struggling
2. **Select mood emoji**: Visual mood selection
3. **Get report**: Comprehensive 6-section care report

### Smart Features
- ✅ **Auto-save** - Never lose your data
- ✅ **Smart defaults** - Remembers your last entry
- ✅ **Collapsible details** - Optional fields hidden until needed
- ✅ **Inline inputs** - Quick number entry for sleep/pain/stress
- ✅ **Mood pills** - Visual emoji selection instead of dropdown

---

## 🚀 Getting Started

### 1. Make sure your `.env` file has your Bedrock API key

Open `.env` and verify it looks like:
```
AWS_BEDROCK_API_KEY=your-actual-key-value-here
AWS_REGION=ap-southeast-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### 2. Start the app

Run this command:
```bash
npm run dev
```

This will start:
- **Backend** on http://localhost:3001
- **Frontend** on http://localhost:5175

### 3. Open the app

Open your browser to: **http://localhost:5175**

---

## 🎯 Main Features

### 🚨 Emergency Resources
- Smart triage flow with one-tap calling
- Warning signs requiring immediate attention
- 24/7 hotlines and hospital contacts

### 💜 Daily Wellness Check
- Quick presets for fast entry
- Generates 6-section comprehensive report:
  - Recovery Summary with status badge
  - Breastfeeding Advisor
  - Nutrition Guide (halal-aware for Bahasa Malaysia)
  - Weekly Recovery Planner
  - Exercise Guide
  - Emergency Support Check

### 🤱 Breastfeeding Support
- Interactive chat advisor
- Helps with latching, engorgement, milk supply

### 🍽️ Meal Analyzer
- Upload meal photos for instant analysis
- Halal status check
- Recovery nutrients identified

### 📅 Weekly Recovery Plan
- Personalized based on delivery method
- Safe exercises for your recovery stage

### 📊 Progress Tracker
- Journal your experiences
- AI analyzes patterns over time
- Flags postpartum depression indicators

### 👥 Community Space
- Facilitated discussions
- Multi-perspective insights

---

## 🌍 Language Support
- **English** - Full support
- **中文 (Chinese)** - Including TCM practices
- **Bahasa Malaysia** - Halal-aware nutrition guidance

---

## 🔧 Troubleshooting

**If the backend fails to start:**
- Check that your AWS_BEDROCK_API_KEY in `.env` is correct
- Make sure port 3001 is not in use

**If the frontend fails to start:**
- Run `cd client && npm install` first
- Make sure port 5175 is not in use

**If AI features don't work:**
- Verify your Bedrock API key is valid
- Check the backend console for error messages
- Make sure your AWS region is correct

**If you see "vite is not recognized":**
```bash
cd client
npm install
cd ..
npm run dev
```

---

## 📚 More Documentation
- **STREAMLINED-UX.md** - Detailed UX improvements
- **DEPLOYMENT.md** - Deployment guide for sharing/hosting
- **README.md** - Full project overview

## 🎉 Ready to Use!
The app is optimized for new mothers with minimal clicks and maximum ease of use. Enjoy! 🌸
