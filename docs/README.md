# Astral Core v7 API Documentation

Welcome to the comprehensive API documentation for Astral Core v7, a secure mental health platform providing therapeutic services, crisis intervention, wellness tracking, and payment management.

## 🚀 Getting Started

### Quick Links
- **[Interactive API Documentation](./index.html)** - Swagger UI with live testing
- **[OpenAPI Specification](./api/openapi.yaml)** - Complete API specification
- **[Authentication Examples](./examples/authentication-flow.md)** - User auth and MFA implementation
- **[Crisis Management Examples](./examples/crisis-management.md)** - Crisis assessment and intervention
- **[Payment Integration Examples](./examples/payment-integration.md)** - Subscription and billing management

### API Base URL
```
Production: https://astral-core.app/api
Staging: https://staging.astral-core.app/api
Development: http://localhost:3000/api
```

### Authentication
All protected endpoints require authentication via:
- **Bearer Token**: `Authorization: Bearer <jwt_token>`
- **Session Cookie**: `next-auth.session-token` (for web clients)

## 📋 API Overview

### Core Features

| Feature | Description | Endpoints |
|---------|-------------|-----------|
| **🔐 Authentication** | User registration, login, MFA | `/auth/*` |
| **🚨 Crisis Management** | Risk assessment, intervention | `/crisis/*` |
| **💳 Payments** | Subscriptions, billing, webhooks | `/payments/*` |
| **👤 User Profiles** | Profile management, GDPR compliance | `/user/*` |
| **📊 Wellness Tracking** | Daily mood, symptoms, analytics | `/wellness/*` |
| **📅 Appointments** | Session scheduling, management | `/appointments/*` |
| **🔔 Notifications** | User notifications, preferences | `/notifications/*` |
| **📁 Files** | Secure upload, PHI compliance | `/files/*` |

### Security Features
- ✅ **Rate Limiting** - Prevents abuse and ensures service availability
- ✅ **PHI Compliance** - HIPAA-compliant data handling
- ✅ **Audit Logging** - Comprehensive activity tracking
- ✅ **Role-Based Access** - Fine-grained permission control
- ✅ **Data Encryption** - End-to-end encryption for sensitive data
- ✅ **MFA Support** - TOTP, SMS, Email verification

## 🔑 Authentication

### Registration
```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecureP@ssw0rd!"
}
```

### Login with MFA
```javascript
// Step 1: Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!"
}

// Step 2: MFA Verification (if required)
POST /api/auth/mfa/verify
{
  "method": "TOTP",
  "token": "123456"
}
```

### MFA Setup
```javascript
// Initialize TOTP setup
POST /api/auth/mfa/setup
{
  "method": "TOTP"
}
// Returns QR code and backup codes
```

## 🚨 Crisis Assessment

### Perform Assessment
```javascript
POST /api/crisis/assess
{
  "suicidalIdeation": true,
  "hasPlan": false,
  "hasMeans": false,
  "immediateRisk": false,
  "symptoms": ["hopelessness", "isolation"],
  "triggerEvent": "Recent job loss"
}

// Response includes:
// - Risk severity (LOW, MODERATE, HIGH, CRITICAL, EMERGENCY)
// - Intervention type
// - Next steps recommendations
// - 24/7 crisis resources
```

### Emergency Response
For `EMERGENCY` or `CRITICAL` assessments:
- Automatic alerting to crisis response team
- Emergency contact notifications
- Immediate resource provision
- Follow-up scheduling

### Crisis Resources (Always Available)
```javascript
GET /api/crisis/assess
// Returns 24/7 crisis resources even without authentication
{
  "resources": {
    "US": {
      "suicide": "988",
      "crisis": "741741", 
      "emergency": "911"
    }
  }
}
```

## 💳 Payment Integration

### Create Subscription
```javascript
POST /api/payments/subscriptions
{
  "therapyPlanId": "plan_therapy_basic",
  "paymentMethodId": "pm_1234567890", // optional
  "couponCode": "SAVE20" // optional
}
```

### Payment Method Setup
```javascript
// If subscription requires payment setup
{
  "subscription": { "status": "INCOMPLETE" },
  "setupIntent": {
    "id": "seti_1234567890",
    "clientSecret": "seti_1234567890_secret_abc123"
  }
}
// Use Stripe Elements to complete payment setup
```

### Webhook Handling
The system processes various Stripe webhooks:
- `customer.subscription.updated`
- `invoice.payment_succeeded` 
- `invoice.payment_failed`
- `payment_method.attached`
- `charge.dispute.created`

## 👤 User Profile Management

### Create Profile
```javascript
POST /api/user/profile
{
  "firstName": "John",
  "lastName": "Doe", 
  "dateOfBirth": "1990-01-15",
  "phoneNumber": "+1234567890",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+1234567891"
  },
  "medicalHistory": [
    {
      "condition": "Anxiety",
      "diagnosedDate": "2020-03-15"
    }
  ]
}
```

### GDPR Compliance
```javascript
// Delete all user data
DELETE /api/user/profile
// Irreversibly removes all user information
```

## 📊 Wellness Tracking

### Log Daily Data
```javascript
POST /api/wellness/data
{
  "date": "2024-01-15",
  "moodScore": 7, // 1-10 scale
  "anxietyLevel": 3, // 1-10 scale
  "stressLevel": 4, // 1-10 scale
  "sleepHours": 8.0,
  "sleepQuality": 8,
  "exercise": true,
  "exerciseMinutes": 45,
  "meditation": true,
  "meditationMinutes": 15,
  "socialContact": true,
  "symptoms": ["mild_anxiety"],
  "copingStrategies": ["deep_breathing", "exercise"],
  "notes": "Feeling much better today"
}
```

### Retrieve Analytics
```javascript
GET /api/wellness/data?startDate=2024-01-01&endDate=2024-01-31&limit=30
// Returns paginated wellness data with analytics
```

## 📅 Appointments

### Get Appointments
```javascript
GET /api/appointments?status=SCHEDULED&limit=10
{
  "data": {
    "items": [
      {
        "id": "cm3appt123",
        "scheduledAt": "2024-01-20T10:00:00Z",
        "duration": 60,
        "type": "THERAPY_SESSION",
        "status": "SCHEDULED",
        "meetingUrl": "https://meet.astral-core.app/session/abc123",
        "therapist": {
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@astral-core.app"
        }
      }
    ],
    "total": 5,
    "hasMore": false
  }
}
```

## 📁 File Management

### Upload Files
```javascript
POST /api/files/upload
Content-Type: multipart/form-data

// Form data:
file: <binary_data>
category: "CONSENT_FORM"
description: "Initial consent form"

// Response:
{
  "file": {
    "id": "cm3file123",
    "filename": "consent_form_encrypted.pdf",
    "originalName": "consent_form.pdf",
    "isEncrypted": true,
    "category": "CONSENT_FORM"
  }
}
```

## 🔔 Notifications

### Get Notifications
```javascript
GET /api/notifications?isRead=false&type=CRISIS&limit=20
{
  "data": {
    "items": [
      {
        "id": "cm3notif123",
        "title": "Crisis Support Check-In",
        "message": "How are you feeling right now?",
        "type": "CRISIS",
        "priority": "URGENT",
        "isRead": false,
        "actionUrl": "/crisis/checkin",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

## 📊 Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 5 requests | 5 minutes |
| Crisis Assessment | 10 requests | 1 minute |
| Wellness Data | 30 requests | 1 minute |
| Subscription Management | 3 requests | 5 minutes |
| General API | 100 requests | 1 minute |

## ⚡ Real-time Features

### WebSocket Events
```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://astral-core.app/api/socket');

// Listen for real-time updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'crisis_alert':
      handleCrisisAlert(data);
      break;
    case 'appointment_reminder':
      showAppointmentReminder(data);
      break;
    case 'payment_status':
      updatePaymentStatus(data);
      break;
  }
};
```

## 🧪 Testing

### Test Environment
- **Base URL**: `https://staging.astral-core.app/api`
- **Test Stripe Keys**: Use Stripe test mode keys
- **Mock Crisis Resources**: Test crisis flows safely

### Test Users
```javascript
// Test credentials (staging only)
{
  "email": "test.client@astral-core.app",
  "password": "TestPassword123!",
  "mfa_secret": "JBSWY3DPEHPK3PXP" // TOTP test secret
}
```

### Test Payment Methods
```javascript
// Stripe test cards
{
  "success": "4242424242424242",
  "decline": "4000000000000002", 
  "require_auth": "4000002500003155",
  "insufficient_funds": "4000000000009995"
}
```

## 🔧 Error Handling

### Standard Error Response
```javascript
{
  "error": "Error message",
  "details": [
    {
      "code": "validation_error",
      "message": "Email is required",
      "path": ["email"]
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email exists)
- `429` - Rate Limited
- `500` - Internal Server Error

### Crisis-Safe Error Handling
Even on errors, crisis endpoints always provide emergency resources:
```javascript
{
  "error": "Assessment failed",
  "resources": {
    "US": {
      "suicide": "988",
      "emergency": "911"
    }
  }
}
```

## 📚 Additional Resources

### SDKs and Libraries
- **JavaScript SDK**: `@astral-core/sdk-js` (coming soon)
- **React Hooks**: `@astral-core/react-hooks` (coming soon)
- **Stripe Integration**: Built-in webhook handling

### Support
- **Documentation**: [docs.astral-core.app](https://docs.astral-core.app)
- **API Support**: api-support@astral-core.app
- **Crisis Support**: Always available at 988 or 911

### Compliance & Security
- **HIPAA Compliant**: All PHI is encrypted and audited
- **SOC 2 Type II**: Security and availability certification
- **GDPR Compliant**: Right to erasure and data portability
- **Crisis Response**: 24/7 monitoring and intervention capability

---

## 🚨 Emergency Notice

**If you are in crisis or having thoughts of self-harm:**
- **Call 911** for immediate emergency assistance
- **Call 988** for the Suicide & Crisis Lifeline (24/7)
- **Text HOME to 741741** for Crisis Text Line

Help is always available. You matter, and your life has value.

---

*Last updated: January 2024*
*API Version: 7.0.0*