# Testing Guide

## Unit Tests

### Backend Tests

Create `backend/__tests__/phishingDetection.test.js`:

```javascript
const phishingDetectionService = require('../services/phishingDetection');

describe('Phishing Detection Service', () => {
  test('should identify legitimate URL', async () => {
    const result = await phishingDetectionService.detectPhishing('https://www.google.com');
    expect(result.isSafe).toBe(true);
    expect(result.riskScore).toBeLessThan(50);
  });

  test('should identify IP address as suspicious', async () => {
    const result = await phishingDetectionService.detectPhishing('http://192.168.1.1:8080');
    expect(result.isSafe).toBe(false);
    expect(result.riskScore).toBeGreaterThan(50);
  });

  test('should identify missing HTTPS', async () => {
    const result = await phishingDetectionService.detectPhishing('http://example.com');
    expect(result.detailedAnalysis.sslCertificateStatus).toContain('HTTP');
  });

  test('should extract URL features correctly', () => {
    const features = phishingDetectionService.extractURLFeatures('https://www.example.com/path');
    expect(features.domain).toBe('www.example.com');
    expect(features.hasHttps).toBe(true);
    expect(features.protocol).toBe('https:');
  });
});
```

### Frontend Tests

Create `frontend/src/__tests__/AnalysisResult.test.js`:

```javascript
import { render, screen } from '@testing-library/react';
import AnalysisResult from '../components/AnalysisResult';

describe('AnalysisResult Component', () => {
  const mockSafeResult = {
    isSafe: true,
    riskScore: 20,
    explanation: 'This link appears safe',
    detailedAnalysis: {
      urlStructure: 'https://example.com',
      sslCertificateStatus: 'HTTPS Enabled',
      suspiciousDomainPatterns: [],
    },
    processingTime: 150,
  };

  test('renders safe result correctly', () => {
    render(<AnalysisResult result={mockSafeResult} />);
    expect(screen.getByText('✓ Safe to Visit')).toBeInTheDocument();
  });

  test('displays correct risk score', () => {
    render(<AnalysisResult result={mockSafeResult} />);
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
```

## Integration Tests

### API Tests

Create `backend/__tests__/api.integration.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('API Integration Tests', () => {
  let token;
  let userId;

  test('POST /api/auth/register - should register user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    token = response.body.token;
    userId = response.body.user.id;
  });

  test('POST /api/auth/login - should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('POST /api/detection/analyze - should analyze URL', async () => {
    const response = await request(app)
      .post('/api/detection/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://www.example.com',
      });

    expect(response.status).toBe(200);
    expect(response.body.isSafe).toBeDefined();
    expect(response.body.riskScore).toBeDefined();
  });

  test('GET /api/detection/history - should get analysis history', async () => {
    const response = await request(app)
      .get('/api/detection/history')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.analyses)).toBe(true);
  });
});
```

## Performance Tests

### Load Testing

Install Artillery:
```bash
npm install -g artillery
```

Create `load-test.yml`:

```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Ramp up load'
    - duration: 60
      arrivalRate: 100
      name: 'Sustained load'

scenarios:
  - name: 'Phishing Detection Load Test'
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'password123'
          capture:
            json: '$.token'
            as: 'token'
      - post:
          url: '/api/detection/analyze'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            url: 'https://example.com'
```

Run test:
```bash
artillery run load-test.yml
```

### Stress Testing

```javascript
// stress-test.js
const axios = require('axios');

async function stressTest() {
  const baseURL = 'http://localhost:5000/api';
  const testURLs = [
    'https://www.google.com',
    'https://www.amazon.com',
    'https://suspicious-site.com',
  ];

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < 1000; i++) {
    const url = testURLs[Math.floor(Math.random() * testURLs.length)];
    promises.push(
      axios.post(`${baseURL}/detection/analyze`, { url })
        .then(() => successCount++)
        .catch(() => errorCount++)
    );
  }

  await Promise.all(promises);
  const endTime = Date.now();

  console.log(`
    Stress Test Results:
    Total requests: 1000
    Successful: ${successCount}
    Failed: ${errorCount}
    Success rate: ${((successCount / 1000) * 100).toFixed(2)}%
    Time taken: ${(endTime - startTime) / 1000}s
    Avg response time: ${((endTime - startTime) / 1000).toFixed(2)}ms
  `);
}

stressTest();
```

## Security Testing

### SQL Injection Tests

```javascript
const maliciousInputs = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
];

maliciousInputs.forEach(input => {
  test(`should handle: ${input}`, async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: input,
        password: input,
      });

    expect(response.status).not.toBe(500);
  });
});
```

### XSS Tests

```javascript
const xssPayloads = [
  '<script>alert("xss")</script>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  'javascript:alert("xss")',
];

xssPayloads.forEach(payload => {
  test(`should sanitize: ${payload}`, () => {
    // Test that frontend properly escapes input
    expect(sanitizeInput(payload)).not.toContain('script');
  });
});
```

## Running Tests

### Setup

```bash
# Install testing dependencies
npm install --save-dev jest supertest @testing-library/react

# Create test configuration in package.json
"jest": {
  "testEnvironment": "node",
  "coverage": {
    "threshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test phishingDetection.test.js

# Watch mode
npm test -- --watch
```

## Test Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install backend dependencies
        run: cd backend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      
      - name: Run frontend tests
        run: cd frontend && npm test
```

## Manual Testing Checklist

### Authentication
- [ ] Register with valid data
- [ ] Register with invalid email
- [ ] Register with weak password
- [ ] Login with correct credentials
- [ ] Login with wrong credentials
- [ ] Logout functionality

### URL Analysis
- [ ] Analyze legitimate URL
- [ ] Analyze suspicious URL
- [ ] Analyze IP address
- [ ] Analyze URL shortener
- [ ] Analyze with special characters
- [ ] Analyze very long URL

### UI/UX
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] All buttons functional
- [ ] Forms validate correctly
- [ ] Error messages display

### Performance
- [ ] Analysis completes < 2 seconds
- [ ] Dashboard loads quickly
- [ ] No console errors
- [ ] Smooth animations

## Reporting Bugs

Include:
- Browser/device info
- Exact steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Error logs
