# 📊 PRODUCTION MONITORING SETUP

## **Monitoring Endpoints**

### 1. **Health Check** `/api/health`
- **Purpose**: Basic health status
- **Frequency**: Every 30 seconds
- **Expected Response**: `{ status: "healthy" }`

### 2. **Detailed Status** `/api/status`
- **Purpose**: Component health verification
- **Frequency**: Every 60 seconds
- **Monitors**: Database, Auth0, cache, PHI service

### 3. **System Metrics** `/api/monitoring/metrics`
- **Purpose**: Performance and resource monitoring
- **Frequency**: Every 5 minutes
- **Auth Required**: `x-monitoring-key` header
- **Metrics**: Memory, CPU, uptime, load average

### 4. **Error Tracking** `/api/monitoring/errors`
- **Purpose**: Application error monitoring
- **Frequency**: Real-time
- **Alerts**: Critical errors trigger immediate alerts

## **Recommended Monitoring Services**

### **Option 1: Vercel Analytics (Built-in)**
```bash
# Already enabled in vercel.json
# View at: https://vercel.com/dashboard/analytics
```

### **Option 2: Datadog Integration**
```javascript
// Add to environment variables:
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key

// Install Datadog APM:
npm install --save dd-trace
```

### **Option 3: New Relic**
```javascript
// Add to environment variables:
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME=astral-core-v7

// Install New Relic:
npm install newrelic
```

### **Option 4: Sentry Error Tracking**
```javascript
// Add to environment variables:
SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token

// Install Sentry:
npm install @sentry/nextjs
```

## **Alert Configuration**

### **Critical Alerts** (Immediate)
- ❌ Database connection failure
- ❌ Auth0 authentication errors
- ❌ Memory usage > 90%
- ❌ Response time > 3 seconds
- ❌ 5xx error rate > 1%

### **Warning Alerts** (15 min delay)
- ⚠️ Memory usage > 70%
- ⚠️ CPU usage > 80%
- ⚠️ 4xx error rate > 5%
- ⚠️ Response time > 1 second

### **Info Alerts** (Daily digest)
- ℹ️ Daily active users
- ℹ️ API usage statistics
- ℹ️ Performance trends
- ℹ️ Error patterns

## **Dashboard Setup**

### **Key Metrics to Track**
1. **Performance**
   - Response time (p50, p95, p99)
   - Throughput (requests/second)
   - Error rate (4xx, 5xx)
   - Apdex score

2. **Infrastructure**
   - Memory usage
   - CPU utilization
   - Database connections
   - Cache hit rate

3. **Business Metrics**
   - Active users
   - Crisis interventions triggered
   - Therapy sessions scheduled
   - Journal entries created

4. **Security**
   - Failed login attempts
   - Rate limit violations
   - Unauthorized access attempts
   - PHI access logs

## **Monitoring Scripts**

### **Health Check Script**
```bash
#!/bin/bash
# health-check.sh
URL="https://astral-core-v7.vercel.app/api/health"
EXPECTED='{"status":"healthy"}'

response=$(curl -s $URL)
if [ "$response" != "$EXPECTED" ]; then
  echo "Health check failed: $response"
  # Send alert
fi
```

### **Metrics Collection Script**
```bash
#!/bin/bash
# collect-metrics.sh
URL="https://astral-core-v7.vercel.app/api/monitoring/metrics"
API_KEY="your-monitoring-key"

curl -H "x-monitoring-key: $API_KEY" $URL | jq '.'
```

## **Uptime Monitoring Services**

### **Recommended Services**
1. **UptimeRobot** (Free tier available)
   - URL: https://uptimerobot.com
   - Monitor: `/api/health`
   - Frequency: 5 minutes

2. **Pingdom** (Premium)
   - URL: https://www.pingdom.com
   - Multi-location monitoring
   - Advanced analytics

3. **StatusPage.io**
   - URL: https://www.atlassian.com/software/statuspage
   - Public status page
   - Incident management

## **Log Aggregation**

### **Vercel Logs**
```bash
# View real-time logs
vercel logs --follow

# Filter by function
vercel logs --filter function=api/crisis/assess

# Export logs
vercel logs --output logs.txt
```

### **Custom Logging**
All critical events are logged with:
- Timestamp
- User ID (hashed)
- Action type
- IP address (hashed)
- Success/failure status

## **Implementation Status**

✅ **Implemented**:
- Health check endpoint
- Status monitoring endpoint
- Metrics collection endpoint
- Error tracking endpoint
- Alerting service integration
- Security headers
- Rate limiting
- Audit logging

⏳ **Recommended Next Steps**:
1. Set up UptimeRobot for basic monitoring (free)
2. Configure Vercel Analytics dashboard
3. Add Sentry for error tracking
4. Set up alert notifications (email/Slack)
5. Create custom dashboard for business metrics

## **Contact for Issues**

**Monitoring Alerts Should Go To**:
- Primary: DevOps team email
- Secondary: On-call engineer phone
- Escalation: CTO/Technical lead

**Response Time SLA**:
- Critical: < 15 minutes
- High: < 1 hour
- Medium: < 4 hours
- Low: < 24 hours