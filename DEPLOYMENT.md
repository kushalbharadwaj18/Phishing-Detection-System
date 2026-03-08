# Setup & Deployment Guide

## Quick Start

### Option 1: Docker (Recommended for Production)

Create `docker-compose.yml` in root directory:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: phishing-db
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: phishing-backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/phishing-detection
      JWT_SECRET: your_jwt_secret
      NODE_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: phishing-frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mongodb_data:
```

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Run with Docker:
```bash
docker-compose up -d
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend (in new terminal):**
```bash
cd frontend
npm install
npm start
```

## Environment Setup

### Backend .env
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/phishing-detection
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
OPENAI_API_KEY=sk-your-api-key-here
HUGGINGFACE_API_KEY=hf-your-api-key-here
```

### Frontend .env
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database Setup

### MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update MONGODB_URI in .env

### Local MongoDB
```bash
# Windows
mongod --dbpath "C:\data\db"

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

## LLM Integration

### Using OpenAI
1. Get API key from https://platform.openai.com
2. Add to .env: `OPENAI_API_KEY=sk-...`
3. System will use GPT-3.5-turbo for analysis

### Fallback (No LLM)
If no API key provided, system uses heuristic analysis automatically

## Deployment

### Heroku

1. Install Heroku CLI
2. `heroku login`
3. Create backend Procfile:
```
web: node server.js
```

4. Deploy backend:
```bash
cd backend
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
git push heroku main
```

5. Deploy frontend to Vercel:
```bash
cd frontend
npm install -g vercel
vercel
```

### AWS/GCP/Azure
Follow standard Node.js and React deployment guides

## Performance Tuning

### Database
- Enable MongoDB indexes (already configured in schema)
- Use connection pooling
- Archive old data regularly

### Caching
- Implement Redis for analysis caching
- Cache results for 24 hours

### Load Balancing
- Use Nginx for reverse proxy
- Configure load balancing for horizontal scaling

### CDN
- Use Cloudflare or AWS CloudFront
- Cache static frontend assets

## Monitoring

### Application Monitoring
```bash
# Add to package.json
"dependencies": {
  "winston": "^3.11.0",
  "morgan": "^1.10.0"
}
```

### Error Tracking
- Integrate Sentry for error monitoring
- Set up log aggregation

## Scaling

### Horizontal Scaling
- Run multiple backend instances
- Use load balancer
- Database sharding for large datasets

### Vertical Scaling
- Increase server resources
- Optimize database indexes
- Implement caching layers

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable database authentication
- [ ] Rotate API keys regularly
- [ ] Implement rate limiting
- [ ] Set up DDoS protection
- [ ] Enable audit logging
- [ ] Regular security audits

## Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongod --version
# Check connection string in .env
```

### CORS Errors
```javascript
// Ensure backend has correct CORS config
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### LLM API Errors
- Check API key is correct
- Verify API quota hasn't been exceeded
- System will fall back to heuristics automatically

### Port Already in Use
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9

# On Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Performance Metrics

Target metrics:
- Response time: < 2 seconds
- Throughput: 1000 requests/minute
- Database queries: < 100ms
- Cache hit rate: > 70%

## Maintenance

### Regular Tasks
- Database cleanup (monthly)
- Log rotation (weekly)
- Security patches (as needed)
- Performance monitoring (daily)
- Backup verification (weekly)

## Support & Documentation

For issues:
1. Check error logs
2. Review documentation
3. Check GitHub issues
4. Submit bug report with logs
