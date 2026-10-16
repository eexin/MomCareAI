# MumCare 💗

A postpartum care companion app for new mothers, powered by AI. MumCare provides personalised recovery guidance, breastfeeding support, meal analysis, and wellness tracking — with full support for English, 中文, and Bahasa Melayu.

🏆 **Top 20 Finalist, AWS CendekiAwan 2.0 (Digital Health track)**

---

## Features

- **Daily Wellness Check** — track sleep, pain, mood, bleeding, and energy levels each day
- **AI Recovery Plan** — personalised 7-day recovery plans based on delivery method and current health data
- **Breastfeeding Chat** — real-time AI lactation consultant with urgent symptom detection
- **Meal Analyzer** — photograph a meal and get postpartum nutrition analysis via AI vision
- **Progress Tracker** — visualise vitals history over time
- **Community Space** — explore postpartum topics from Western, TCM, and Malay traditional perspectives
- **Emergency Resources** — quick access to emergency contacts and local health services
- **Notifications** — scheduled wellness reminders and medication alerts via email
- **Multilingual** — full UI and AI responses in English, Chinese (中文), and Bahasa Melayu
- **Privacy-first** — all personal data stored locally on device (localStorage), no user accounts required

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Material Symbols | Icons |

### Backend
| Technology | Purpose |
|---|---|
| AWS Lambda (Node.js 20) | Serverless API |
| Amazon Bedrock | AI model inference (Claude Sonnet) |
| Amazon SES / SESv2 | Transactional email & verification |
| Amazon API Gateway (HTTP API) | API routing |

### Infrastructure
| Technology | Purpose |
|---|---|
| Amazon S3 | Static site hosting |
| Amazon CloudFront | CDN / HTTPS delivery |
| Amazon DynamoDB | Notification logs & user profiles |
| Amazon EventBridge | Scheduled notification triggers |
| AWS CloudFormation | Infrastructure as code |

---

## Project Structure

```
bedrock-app/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # All UI components
│   │   ├── translations.ts  # i18n strings (EN / ZH / MS)
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── App.tsx          # Root component
│   ├── .env                 # Local env (gitignored)
│   └── .env.example         # Env template
│
├── lambda/                  # AWS Lambda functions
│   ├── index.js             # Main API handler (all endpoints)
│   ├── notification-handler.js
│   ├── scheduled-notifications.js
│   ├── cloudformation-template.yaml
│   └── deploy.ps1           # Deployment scripts
│
└── docs/                    # Documentation
```

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/complete-care-report` | Daily wellness report with recovery status |
| `POST /api/recovery-plan` | Personalised 7-day recovery plan |
| `POST /api/breastfeeding-chat` | AI lactation consultant chat |
| `POST /api/meal-analysis` | Nutrition analysis from meal photo |
| `POST /api/community-discussion` | Multi-cultural topic discussion |
| `POST /api/day-summary` | End-of-day summary and reflection |
| `POST /api/verify-email` | Trigger SES email verification |
| `POST /api/check-email-verified` | Check SES verification status |

---

## Getting Started

### Prerequisites

- Node.js 20+
- AWS account with Bedrock access enabled
- AWS CLI configured

### 1. Clone the repo

```bash
git clone https://github.com/your-username/mumcare.git
cd mumcare
```

### 2. Set up the frontend

```bash
cd client
cp .env.example .env
# Set VITE_API_URL to your Lambda API Gateway endpoint
npm install
npm run dev
```

### 3. Set up the Lambda backend

```bash
cd lambda
cp .env.example .env
npm install
```

Deploy to AWS:

```powershell
# Windows
.\deploy.ps1
```

### 4. Environment Variables

**`client/.env`**
```env
VITE_API_URL=http://localhost:3001   # or your API Gateway URL
```

**Root `.env`**
```env
AWS_BEDROCK_API_KEY=your-key-here
AWS_REGION=ap-southeast-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6
```

---

## Deployment

The frontend deploys to S3 + CloudFront:

```powershell
# Build and deploy to S3
.\deploy-s3.ps1
```

The backend infrastructure is managed via CloudFormation:

```bash
aws cloudformation deploy \
  --template-file lambda/cloudformation-template.yaml \
  --stack-name mumcare-stack \
  --capabilities CAPABILITY_NAMED_IAM
```

See [`docs/DEPLOY-QUICK-START.md`](docs/DEPLOY-QUICK-START.md) for the full deployment guide.

---

## Security

- `.env` files are gitignored — never commit real credentials
- All AI responses are sanitised before being returned to the client
- Urgent medical symptoms are flagged and escalated to emergency resources
- Email addresses are verified via SES before notifications are sent
- No sensitive user health data is stored server-side

See [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) for more detail.

---

## Supported Languages

| Language | Code |
|---|---|
| English | `en` |
| Chinese (中文) | `zh` |
| Bahasa Melayu | `ms` |

Language is auto-detected from the browser on first launch and can be changed in Settings.

---

## Team

- Tan Ee Xin
- Benn Chen
- Teoh Ming Xun
- Tay Boon Tao
- Wong Zhi Yoong

Original repository: [BennChen23/bedrock-app-momcare](https://github.com/BennChen23/bedrock-app-momcare)

---

## License

See [`docs/LICENSE.md`](docs/LICENSE.md).
