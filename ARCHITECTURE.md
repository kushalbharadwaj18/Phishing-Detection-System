# Architecture & Design Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                               │
│                  (React Frontend - Port 3000)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                   API Gateway / Load Balancer                    │
│                     (Nginx / HAProxy)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────┴────────────────────────────────────┐
│              Express.js Backend Servers (Port 5000)              │
│                    (Scalable Instances)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Auth APIs   │  │ Detection    │  │  Analytics   │          │
│  │  - Register  │  │  APIs        │  │  APIs        │          │
│  │  - Login     │  │  - Analyze   │  │  - Stats     │          │
│  │  - Verify    │  │  - History   │  │  - Reports   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Service Layer                                   │  │
│  │  ┌────────────────────────────────────────────────┐    │  │
│  │  │ Phishing Detection Service                     │    │  │
│  │  │  - URL Feature Extraction                      │    │  │
│  │  │  - Heuristic Analysis                          │    │  │
│  │  │  - LLM Analysis (OpenAI/Hugging Face)          │    │  │
│  │  │  - Risk Scoring                                │    │  │
│  │  └────────────────────────────────────────────────┘    │  │
│  │  ┌────────────────────────────────────────────────┐    │  │
│  │  │ Cache Service                                  │    │  │
│  │  │  - In-Memory Cache (24h TTL)                   │    │  │
│  │  │  - Cache Invalidation                          │    │  │
│  │  └────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │     MongoDB      │           │  LLM Services    │
    │   (Database)     │           │  (OpenAI API)    │
    │  - Users         │           │  (Fallback:      │
    │  - Analysis      │           │   Heuristics)    │
    │  - History       │           └──────────────────┘
    │  - Cache         │
    └──────────────────┘
```

## Data Flow

### URL Analysis Request Flow

```
1. Frontend
   ├─ User pastes URL
   ├─ Validates format
   ├─ Sends to backend with auth token
   └─ Displays loading state

2. Backend Authentication
   ├─ Verifies JWT token
   ├─ Extracts user ID
   └─ Validates request

3. Cache Check
   ├─ Checks if URL analyzed in last 24h
   ├─ If found: Returns cached result (< 100ms)
   └─ If not found: Proceeds to analysis

4. Feature Extraction
   ├─ Parses URL structure
   ├─ Extracts domain info
   ├─ Analyzes path and protocol
   └─ Calculates heuristic indicators

5. LLM Analysis
   ├─ Sends to OpenAI API (if configured)
   ├─ Gets AI-powered risk assessment
   ├─ Returns detailed analysis
   └─ Falls back to heuristics if unavailable

6. Risk Calculation
   ├─ Combines heuristic + LLM scores
   ├─ Generates explanation
   ├─ Creates detailed report
   └─ Determines safety status

7. Database Storage
   ├─ Saves analysis to MongoDB
   ├─ Associates with user
   ├─ Records timestamp
   └─ Stores for history

8. Response
   ├─ Returns to frontend with results
   ├─ Updates cache
   └─ Frontend displays results to user
```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### LinkAnalysis Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  url: String,
  isSafe: Boolean,
  riskScore: Number (0-100),
  explanation: String,
  detailedAnalysis: {
    suspiciousDomainPatterns: [String],
    urlStructure: String,
    domainAge: String,
    sslCertificateStatus: String,
    commonPhishingIndicators: [String],
    trustScore: Number
  },
  analysisTimestamp: Date,
  processingTime: Number (ms),
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- userId, analysisTimestamp (for efficient history queries)
- url (for cache lookups)
```

## Security Architecture

### Authentication & Authorization
```
1. Registration
   ├─ Validate email format
   ├─ Check if user exists
   ├─ Hash password (bcrypt 10 rounds)
   ├─ Create user record
   └─ Generate JWT token

2. Login
   ├─ Find user by email
   ├─ Compare password hash
   ├─ Generate JWT token (7-day expiry)
   ├─ Return token to frontend
   └─ Frontend stores in localStorage

3. Protected Routes
   ├─ Extract token from header
   ├─ Verify JWT signature
   ├─ Decode user ID
   ├─ Allow request to proceed
   └─ Handle expired/invalid tokens
```

### Rate Limiting
```
Auth Endpoints (register, login):
  - 5 requests per 15 minutes per IP
  
Analysis Endpoints:
  - 20 requests per 60 seconds per IP

Strategy:
  - Express-rate-limit middleware
  - IP-based tracking
  - Sliding window
  - Automatic cleanup
```

### Data Protection
- Passwords: Bcrypt hashing (10 salt rounds)
- Tokens: JWT with HMAC-SHA256
- Transit: HTTPS/TLS 1.3
- Storage: MongoDB with optional encryption
- API: CORS configured for trusted origins

## Performance Optimization

### Caching Strategy
```
Cache Layer 1: In-Memory (Application)
  - 24-hour TTL
  - Same URL = instant response
  - Reduces LLM API calls

Cache Layer 2: Database
  - Stores all analyses
  - Quick lookup for recent results
  - Historical data retention

Cache Invalidation:
  - Time-based (24 hours)
  - Manual cleanup on schedule
```

### Query Optimization
```
Index Strategy:
  - userId + analysisTimestamp: History queries
  - url: Cache lookups
  - analysisTimestamp: Cleanup queries

Query Patterns:
  - Lean queries (exclude unnecessary fields)
  - Pagination (limit, skip)
  - Sorting on indexed fields
```

### Response Optimization
```
Techniques:
  - Gzip compression
  - JSON minification
  - Response pagination
  - Partial data on list endpoints
  - Full data only on detail endpoints
```

## Scalability Considerations

### Horizontal Scaling
```
Backend Scaling:
  - Run multiple instances (2-4 for high load)
  - Load balancer (Nginx/HAProxy)
  - Stateless design (no session affinity needed)
  - Shared database connection pool

Frontend Scaling:
  - Static asset CDN (Cloudflare/CloudFront)
  - Multiple backend endpoints (DNS round-robin)
  - Client-side caching
  - Service workers for offline capability
```

### Database Scaling
```
MongoDB Scaling:
  - Replica set for redundancy
  - Sharding for data distribution
  - Read replicas for query distribution
  - Backup and recovery procedures
```

### LLM API Integration
```
Scaling Strategy:
  - Batch requests when possible
  - Cache LLM responses
  - Implement fallback to heuristics
  - Rate limiting on LLM API
  - Cost monitoring
```

## Error Handling Flow

```
Error Handling:
  1. Try-catch blocks in async functions
  2. Validation layer (express-validator)
  3. Custom error middleware
  4. Structured error responses
  5. Error logging (winston/morgan)
  6. User-friendly messages

Error Response Format:
{
  "status": 400,
  "message": "User-friendly error message",
  "errors": [
    {
      "field": "email",
      "message": "Must be valid email"
    }
  ]
}
```

## Monitoring & Analytics

### Metrics to Track
- Request response times (avg, p95, p99)
- Error rates by endpoint
- Database query performance
- LLM API response times
- Cache hit rate
- Concurrent user count
- Analysis accuracy
- False positive/negative rates

### Logging Strategy
```
Log Levels:
  - INFO: Requests, user actions
  - WARN: Validation errors, rate limits
  - ERROR: Server errors, exceptions
  - DEBUG: Detailed function traces

Log Storage:
  - Application logs: File-based rotation
  - Cloud logging: CloudWatch/Stackdriver
  - Aggregation: ELK Stack/Splunk
```

## Deployment Topology

### Development
```
Single server:
- Backend (Express + Node)
- MongoDB (local)
- Frontend (React dev server)
```

### Staging
```
Multiple servers:
- 2x Backend instances
- MongoDB replica set
- Nginx load balancer
- React build served via Nginx
```

### Production
```
Distributed setup:
- 4-8x Backend instances (auto-scaling)
- MongoDB cluster (3+ nodes)
- CDN for static assets
- Load balancer with SSL/TLS
- Monitoring and alerting
- Backup and disaster recovery
```

## Technology Rationale

| Component | Choice | Reason |
|-----------|--------|--------|
| Backend | Express.js | Lightweight, scalable, excellent middleware ecosystem |
| Database | MongoDB | Flexible schema, good for unstructured data, easy scaling |
| Frontend | React | Component-based, large community, excellent DevTools |
| Auth | JWT | Stateless, scalable, no session storage needed |
| Password Hash | Bcrypt | Industry standard, adaptive cost factor |
| Rate Limit | express-rate-limit | Simple, effective, low overhead |
| LLM | OpenAI | Most reliable, best detection capabilities |
| Fallback | Heuristics | Fast, reliable, no external dependencies |
| Deployment | Docker | Reproducible, scalable, cloud-ready |

## Future Architecture Enhancements

1. **Message Queue**: Redis for async analysis
2. **ML Model**: Custom-trained phishing detection model
3. **Browser Extension**: Real-time detection on user navigation
4. **Mobile App**: Native mobile application
5. **API**: Public API for third-party integration
6. **Threat Intelligence**: Integration with threat databases
7. **Webhooks**: Real-time notifications for critical threats
8. **Machine Learning**: Continuous model improvement
