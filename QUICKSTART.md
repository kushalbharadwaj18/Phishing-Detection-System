# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js v14+ installed
- MongoDB running locally or Atlas account
- (Optional) OpenAI API key for enhanced detection

### Step 1: Clone & Setup Backend (2 min)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/phishing-detection
JWT_SECRET=your_super_secret_key_12345
NODE_ENV=development
# OPENAI_API_KEY=sk-your-key-here  # Optional
```

Start backend:
```bash
npm run dev
```

✓ Backend running on `http://localhost:5000`

### Step 2: Setup Frontend (2 min)

In a new terminal:
```bash
cd frontend
npm install
npm start
```

✓ Frontend opens at `http://localhost:3000`

### Step 3: Create Account & Test (1 min)

1. Click "Sign Up"
2. Register with test account:
   - Name: John Doe
   - Email: test@example.com
   - Password: password123

3. Login and try analyzing:
   - Safe URL: `https://www.google.com`
   - Suspicious: `http://example.com`
   - Phishing: `https://paypal-verify-account.com`

Done! ✨

---

## 📁 Project Structure

```
phishing-detection-system/
├── backend/                          # Node.js + Express server
│   ├── models/                       # MongoDB schemas
│   ├── routes/                       # API endpoints
│   ├── services/                     # Business logic
│   ├── middleware/                   # Auth & validation
│   ├── server.js                     # Entry point
│   └── package.json
├── frontend/                         # React application
│   ├── public/                       # Static files
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   ├── pages/                    # Page components
│   │   ├── services/                 # API client
│   │   ├── context/                  # State management
│   │   └── App.js                    # Root component
│   └── package.json
├── README.md                         # Main documentation
├── ARCHITECTURE.md                   # System design
├── DEPLOYMENT.md                     # Deployment guide
├── TESTING.md                        # Testing guide
└── .gitignore                        # Git ignore rules
```

---

## 🔑 Key Features Explained

### 1️⃣ User Authentication
- **Register**: Create new account with email/password
- **Login**: Secure access with JWT tokens
- **Protected Routes**: Analysis available only to logged-in users
- **Session Management**: 7-day token expiry

### 2️⃣ URL Analysis
Paste any URL and get instant analysis:

```
Input: https://secure-paypal-login.com

Output:
├─ Safety Status: ⚠️ Potentially Dangerous
├─ Risk Score: 75% (HIGH)
├─ Explanation: URL impersonates PayPal with suspicious domain
├─ SSL Status: HTTPS Enabled ✓
├─ Indicators:
│  ├─ Contains common phishing keyword: "paypal"
│  ├─ Domain contains unusual pattern
│  └─ Exceeds normal URL length
└─ Processing Time: 240ms
```

### 3️⃣ Dashboard Features
- **Instant Analysis**: Test URLs in real-time
- **History**: View all past analyses
- **Statistics**: See your safety summary
- **Detailed Reports**: Understanding why links are safe/unsafe

### 4️⃣ AI Detection

**Two-Layer Analysis:**
1. **Heuristic Analysis** (Fast, always available)
   - Pattern matching
   - URL structure analysis
   - Common phishing keywords
   - Security protocol checks

2. **LLM Analysis** (Intelligent, with API key)
   - OpenAI GPT-3.5-turbo integration
   - Context-aware detection
   - Advanced threat identification
   - Detailed explanations

---

## 🛠️ API Endpoints

### Authentication

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Detection

**Analyze URL**
```bash
POST /api/detection/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Response:
```json
{
  "message": "Analysis completed successfully",
  "isSafe": true,
  "riskScore": 25,
  "explanation": "This URL appears to be legitimate",
  "detailedAnalysis": {
    "urlStructure": "https://example.com",
    "sslCertificateStatus": "HTTPS Enabled",
    "suspiciousDomainPatterns": [],
    "trustScore": 75
  },
  "processingTime": 150,
  "analysisMethod": "llm"
}
```

**Get History**
```bash
GET /api/detection/history?limit=20&page=1
Authorization: Bearer <token>
```

**Get Statistics**
```bash
GET /api/detection/stats/overview
Authorization: Bearer <token>
```

---

## ⚙️ Configuration

### Environment Variables

**Backend (.env)**
| Variable | Purpose | Example |
|----------|---------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | Database connection | mongodb://localhost:27017/phishing-detection |
| JWT_SECRET | Token signing key | your_super_secret_key |
| NODE_ENV | Environment | development |
| OPENAI_API_KEY | LLM integration | sk-... |

**Frontend (.env)**
| Variable | Purpose | Example |
|----------|---------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:5000/api |

---

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ HTTPS ready
- ✅ Secure headers (helmet.js)
- ✅ SQL injection prevention
- ✅ XSS protection

---

## 📊 Risk Scoring Explained

```
Risk Score: 0 ..................... 100
            ├─ Safe ─────────────────┼────────────── Dangerous
            0-30      30-60      60-80      80-100
            GREEN    YELLOW      RED      CRITICAL
```

**Factors Contributing to Risk:**
- Missing HTTPS encryption (+15)
- Long domain name (+10)
- Unusual character patterns (+15)
- Multiple subdomains (+12)
- Long URL (+8)
- IP address instead of domain (+25)
- Common phishing keywords (+5 each)

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process and restart
npm run dev
```

### MongoDB connection error
```bash
# Check MongoDB is running
mongod --version

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/phishing-detection

# Try connecting with mongosh
mongosh mongodb://localhost:27017
```

### CORS errors in frontend
```javascript
// Backend should have:
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### LLM not working
```
- Check OpenAI API key is valid
- Check API quota hasn't been exceeded
- System falls back to heuristics automatically
- No manual action needed
```

---

## 📈 Performance Metrics

Target performance:
- Response time: < 2 seconds
- Throughput: 1000 req/min
- Cache hit rate: > 70%
- Uptime: 99.9%

Monitor in production:
```bash
# Backend logs
tail -f /var/log/phishing-backend.log

# Database performance
mongosh
> db.linkAnalysis.find().explain("executionStats")
```

---

## 🚀 Next Steps

### For Development
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
2. Check [TESTING.md](TESTING.md) for testing guidelines
3. Review code comments for implementation details

### For Deployment
1. Follow [DEPLOYMENT.md](DEPLOYMENT.md)
2. Use Docker for containerization
3. Deploy to Heroku, AWS, or your platform

### For Enhancement
- [ ] Add browser extension
- [ ] Implement Redis caching
- [ ] Build mobile app
- [ ] Create public API
- [ ] Add machine learning model

---

## 📞 Support

- Check README.md for full documentation
- Review inline code comments
- Check GitHub issues
- Contact the development team

---

## 🎉 Congratulations!

You now have a fully functional AI phishing detection system!

**What you can do:**
- ✓ Detect phishing URLs in real-time
- ✓ Understand why links are safe/unsafe
- ✓ Build on top of this system
- ✓ Deploy to production

Happy detecting! 🛡️
