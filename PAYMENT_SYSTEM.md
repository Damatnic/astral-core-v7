# Astral Core v7 - Payment System Implementation

## Overview

The Astral Core v7 payment system provides comprehensive billing and payment processing capabilities for the mental health platform, built with enterprise-grade security, HIPAA compliance, and seamless user experience in mind.

## Features

### 🔄 Subscription Management
- **Therapy Plan Subscriptions**: Multiple subscription tiers with customizable features
- **Trial Periods**: Free trial support for new subscribers
- **Plan Changes**: Seamless upgrades/downgrades with proration
- **Cancellation Management**: Flexible cancellation with end-of-period options

### 💳 Payment Processing
- **One-time Payments**: Session-based payment processing
- **Recurring Billing**: Automated subscription renewals
- **Multiple Payment Methods**: Cards, ACH, digital wallets
- **Refund Management**: Partial and full refund capabilities

### 🔐 Security & Compliance
- **HIPAA Compliant**: All payment data encrypted and secure
- **PCI DSS**: Stripe handles all sensitive card data
- **PHI Protection**: Payment metadata encrypted at rest
- **Audit Logging**: Comprehensive payment activity tracking

### 📊 Billing Management
- **Invoice Generation**: Automatic invoice creation and delivery
- **Payment History**: Complete transaction history
- **Receipt Management**: Downloadable receipts and invoices
- **Billing Analytics**: Comprehensive reporting for administrators

## Architecture

### Backend Services

#### Stripe Integration (`/src/lib/services/stripe-service.ts`)
- Complete Stripe API integration
- Customer management
- Payment intent creation
- Subscription lifecycle management
- Webhook handling for real-time updates

#### Subscription Service (`/src/lib/services/subscription-service.ts`)
- High-level subscription management
- Therapy plan creation and management
- Analytics and reporting
- Plan change handling

### API Routes

#### Webhook Handler (`/src/app/api/payments/webhook/route.ts`)
- Processes Stripe webhook events
- Handles subscription updates
- Payment status synchronization
- Invoice status updates

#### Subscription Management (`/src/app/api/payments/subscriptions/route.ts`)
- Create, update, and cancel subscriptions
- Plan changes and modifications
- Subscription status retrieval

#### Payment Processing (`/src/app/api/payments/sessions/route.ts`)
- One-time payment creation
- Session-based payments for therapy appointments
- Payment history retrieval
- Refund processing

#### Payment Methods (`/src/app/api/payments/payment-methods/route.ts`)
- Save and manage payment methods
- Setup intents for secure card collection
- Default payment method management

#### Therapy Plans (`/src/app/api/payments/therapy-plans/route.ts`)
- Plan creation and management (admin)
- Plan retrieval for subscribers
- Plan analytics and reporting

### Database Schema

#### Payment Tables
- `Customer`: Stripe customer records with encrypted data
- `PaymentMethod`: Saved payment methods
- `Subscription`: Active and historical subscriptions
- `Payment`: One-time payments and transactions
- `Invoice`: Generated invoices and billing records
- `Refund`: Refund transactions and records
- `TherapyPlan`: Available subscription plans

#### Security Features
- All sensitive data encrypted using AES-256-GCM
- Customer email addresses encrypted at rest
- Payment metadata secured with PHI protection
- Comprehensive audit logging for all transactions

### Frontend Components

#### BillingDashboard (`/src/components/billing/BillingDashboard.tsx`)
- Comprehensive billing overview
- Tab-based navigation between billing features
- Summary cards with key metrics
- Quick actions for common tasks

#### SubscriptionManager (`/src/components/billing/SubscriptionManager.tsx`)
- Plan selection and subscription creation
- Current subscription management
- Plan changes and cancellations
- Trial period handling

#### PaymentMethods (`/src/components/billing/PaymentMethods.tsx`)
- Add new payment methods securely
- Manage existing payment methods
- Set default payment options
- Remove outdated methods

#### PaymentHistory (`/src/components/billing/PaymentHistory.tsx`)
- Complete transaction history
- Invoice viewing and downloading
- Payment status tracking
- Search and filtering capabilities

#### PaymentForm (`/src/components/billing/PaymentForm.tsx`)
- Secure payment collection using Stripe Elements
- HIPAA-compliant payment processing
- Support for billing details collection
- Error handling and validation

#### AppointmentPayment (`/src/components/billing/AppointmentPayment.tsx`)
- Session-specific payment processing
- Integration with appointment system
- Flexible pricing options
- Payment confirmation handling

## Environment Configuration

Required environment variables:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Security
ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
```

## Database Migration

The payment system requires database migration to add payment-related tables:

```bash
# Generate Prisma client
npx prisma generate

# Run migration (when database is available)
npx prisma migrate dev --name "add_payment_system"

# Or apply the generated SQL manually
# See the migration SQL generated during implementation
```

## Setup Instructions

### 1. Stripe Configuration
1. Create a Stripe account at https://stripe.com
2. Obtain your API keys from the Stripe dashboard
3. Set up webhook endpoints pointing to your application
4. Configure your webhook secret in environment variables

### 2. Database Setup
1. Ensure PostgreSQL database is running
2. Run the Prisma migration to create payment tables
3. Seed initial therapy plans if needed

### 3. Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your Stripe credentials
3. Configure encryption keys for HIPAA compliance

### 4. Webhook Configuration
Set up the following webhook events in your Stripe dashboard:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_method.attached`
- `setup_intent.succeeded`

## Usage Examples

### Creating a Therapy Plan (Admin)
```typescript
import { SubscriptionService } from '@/lib/services/subscription-service';

const therapyPlan = await SubscriptionService.createTherapyPlan({
  name: 'Premium Therapy Plan',
  description: 'Comprehensive mental health support',
  amount: 199.99,
  interval: 'month',
  sessionsIncluded: 8,
  duration: '1 month',
  features: [
    'Weekly therapy sessions',
    'Crisis support',
    'Progress tracking',
    'Wellness resources'
  ],
  trialPeriodDays: 7
});
```

### Processing Session Payment
```typescript
import { StripeService } from '@/lib/services/stripe-service';

const payment = await StripeService.createPaymentIntent({
  customerId: 'customer-id',
  amount: 150.00,
  appointmentId: 'appointment-id',
  description: 'Therapy session payment'
});
```

### Subscribing to Therapy Plan
```typescript
import { SubscriptionService } from '@/lib/services/subscription-service';

const subscription = await SubscriptionService.subscribeToTherapyPlan(
  userId,
  therapyPlanId,
  paymentMethodId
);
```

## Integration Points

### Appointment System
- Payment processing integrated with appointment scheduling
- Automatic payment creation for scheduled sessions
- Payment status affects appointment confirmations

### User Management
- Customer records automatically created for users
- Payment permissions based on user roles
- Therapist-specific payment processing for their sessions

### Notifications
- Payment confirmations and receipts
- Failed payment notifications
- Subscription renewal reminders

## Security Considerations

### Data Encryption
- All customer emails encrypted using AES-256-GCM
- Payment metadata encrypted before database storage
- Encryption keys managed through environment variables

### PCI Compliance
- No sensitive card data stored on servers
- All payment processing handled by Stripe
- Tokenized payment methods for recurring charges

### HIPAA Compliance
- Payment information treated as PHI where applicable
- Comprehensive audit logging for all payment activities
- Secure data transmission and storage

### Access Control
- Role-based access to payment management features
- Admin-only access to therapy plan creation
- User-specific payment data isolation

## Monitoring & Analytics

### Payment Metrics
- Revenue tracking and reporting
- Subscription churn analysis
- Payment failure rates
- Customer lifetime value

### Audit Logging
- All payment activities logged
- User actions tracked for compliance
- Error monitoring and alerting

### Performance Monitoring
- API response times
- Payment success rates
- Webhook processing reliability

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Verify webhook URL accessibility
   - Check webhook secret configuration
   - Review Stripe dashboard for failed events

2. **Payment Processing Errors**
   - Validate Stripe API keys
   - Check customer payment method status
   - Review payment intent error messages

3. **Subscription Issues**
   - Verify price and product IDs in Stripe
   - Check subscription status synchronization
   - Review webhook event processing

### Support Resources
- Stripe documentation: https://stripe.com/docs
- Prisma documentation: https://prisma.io/docs
- Internal logging and audit trails

## Future Enhancements

### Planned Features
- Multi-currency support
- Advanced discount and coupon system
- Group subscription management
- Automatic payment retry logic
- Enhanced analytics dashboard

### Scalability Considerations
- Webhook queue processing for high volume
- Payment method verification workflows
- Advanced fraud detection integration
- Multi-tenant payment isolation

## Compliance Certifications

- **HIPAA**: All payment data handling compliant with healthcare privacy requirements
- **PCI DSS**: Stripe provides PCI compliance for card data processing
- **SOC 2**: Enterprise-grade security and availability standards
- **GDPR**: Data protection and privacy compliance for international users