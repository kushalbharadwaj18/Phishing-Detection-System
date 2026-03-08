# AI Phishing Website Detection System

A full-stack web application that uses AI/LLM to detect phishing websites and malicious URLs.

## Features

✨ **AI-Powered Detection**
- Real-time phishing detection using Large Language Models (LLMs)
- Pattern recognition for suspicious URLs
- SSL/TLS certificate verification
- Domain reputation analysis

🔐 **User Authentication**
- Secure user registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting on auth endpoints

📊 **Dashboard**
- Beautiful, responsive UI
- URL analysis history
- Risk scoring and explanations
- Detailed analysis reports
- Statistics overview

⚡ **Performance**
- Low latency analysis (< 2 seconds typically)
- High throughput with caching
- Rate limiting for API protection
- Optimized database queries

🛡️ **Security**
- HTTPS support
- CORS protection
- Input validation
- Error handling
- Secure token management

## Technology Stack

### Backend
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcryptjs
- **LLM Integration**: OpenAI API (with fallback heuristics)
- **Performance**: Rate limiting, caching, indexing

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: CSS3 with animations
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Project Structure

```
phishing-detection-system/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── LinkAnalysis.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── detection.js
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   │   └── phishingDetection.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisResult.js
│   │   │   └── AnalysisResult.css
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Auth.css
│   │   │   └── Dashboard.css
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- OpenAI API key (optional - works with fallback)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/phishing-detection
JWT_SECRET=your_secure_secret_key_here
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
```

5. Start MongoDB:
```bash
# If using local MongoDB
mongod
```

6. Start the backend server:
```bash
npm start
# Or for development with hot reload:
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

Frontend will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Detection
- `POST /api/detection/analyze` - Analyze URL (requires auth)
- `GET /api/detection/history` - Get analysis history (requires auth)
- `GET /api/detection/:id` - Get analysis details (requires auth)
- `GET /api/detection/stats/overview` - Get user statistics (requires auth)

## How the Detection Works

### 1. URL Feature Extraction
- Protocol analysis (HTTP vs HTTPS)
- Domain structure analysis
- URL length evaluation
- Special character detection
- Subdomain checking

### 2. Heuristic Analysis
The system checks for:
- Missing HTTPS encryption
- Unusually long domain names
- Suspicious character patterns
- Multiple subdomains
- IP address usage
- Common phishing keywords (paypal, amazon, verify, etc.)

### 3. LLM Analysis (Optional)
- Uses OpenAI's GPT-3.5-turbo for enhanced detection
- Analyzes URL legitimacy
- Identifies phishing tactics
- Provides detailed risk assessment
- Falls back to heuristics if LLM unavailable

### 4. Risk Scoring
- 0-30: LOW risk (safe to visit)
- 30-60: MEDIUM risk (caution advised)
- 60-80: HIGH risk (suspicious)
- 80-100: CRITICAL risk (likely phishing)

## Performance Optimizations

### Low Latency
- Caching of recent analyses (24-hour cache)
- Parallel processing with async/await
- Database indexing on frequently queried fields
- Fast heuristic analysis as fallback

### High Throughput
- Connection pooling with MongoDB
- Rate limiting (20 requests/minute per IP)
- Efficient database queries with lean()
- Gzip compression support

## Usage Example

1. **Register/Login**
   - Go to http://localhost:3000
   - Create new account or login

2. **Analyze a URL**
   - Paste a URL in the dashboard input
   - Click "Analyze"
   - View instant results with risk score and explanation

3. **View History**
   - Access analysis history from dashboard
   - See all previous analyses with timestamps
   - Review detailed explanations for each

4. **Understand Results**
   - ✓ Safe: Low-risk, legitimate URL
   - ⚠️ Suspicious: Medium-high risk, verify before clicking
   - ✗ Dangerous: High/critical risk, likely phishing

## Security Considerations

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (10 salt rounds)
- Rate limiting prevents brute force attacks
- Input validation on all endpoints
- CORS configured for your domain
- Environment variables for sensitive data
- SQL injection prevention with MongoDB
- XSS protection with helmet.js

## Future Enhancements

- [ ] Browser extension for real-time phishing detection
- [ ] Machine learning model training on labeled datasets
- [ ] Integration with threat intelligence databases
- [ ] Email attachment analysis
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications for critical threats
- [ ] Team/organization management

## Contributing

Feel free to fork, submit issues, and create pull requests.

## License

MIT License - feel free to use this project for educational and commercial purposes.

## Support

For issues and questions, please refer to the documentation or create an issue in the repository.

---

**Built with ❤️ for cybersecurity**
