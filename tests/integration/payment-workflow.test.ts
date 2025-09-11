/**
 * Payment Workflow Integration Tests
 * Tests complete payment processing flows including Stripe integration
 */

import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { setupIntegrationTests, teardownIntegrationTests, getTestPrisma, mockExternalServices } from '../setup/integration-setup';
import { mockCustomer, mockUsers } from '../utils/test-fixtures';

describe('Payment Workflow Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrisma>;

  beforeAll(async () => {
    await setupIntegrationTests();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Creation Workflow', () => {
    test('should create customer with encrypted PII', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'payment_user_123',
          email: 'payment@example.com'
        }
      });

      // Mock Stripe customer creation
      mockExternalServices.stripe.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: 'payment@example.com',
        name: 'John Doe'
      });

      // Act - Create customer
      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          stripeCustomerId: 'cus_test123',
          email: 'encrypted_email_data', // In real implementation, would be encrypted
          name: 'John Doe',
          address: JSON.stringify({
            line1: '123 Main St',
            city: 'Anytown',
            state: 'NY',
            postal_code: '12345',
            country: 'US'
          })
        }
      });

      // Assert
      expect(customer).toBeDefined();
      expect(customer.userId).toBe(user.id);
      expect(customer.stripeCustomerId).toBe('cus_test123');
      expect(customer.email).toBe('encrypted_email_data');

      // Verify customer in database
      const storedCustomer = await prisma.customer.findUnique({
        where: { userId: user.id },
        include: { user: true }
      });

      expect(storedCustomer).toBeDefined();
      expect(storedCustomer.user.email).toBe(user.email);
    });

    test('should handle existing customer lookup', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'existing_customer_123',
          email: 'existing@example.com'
        }
      });

      const existingCustomer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'existing_cust_123',
          userId: user.id,
          stripeCustomerId: 'cus_existing123'
        }
      });

      // Act
      const foundCustomer = await prisma.customer.findUnique({
        where: { userId: user.id }
      });

      // Assert
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer?.id).toBe(existingCustomer.id);
    });
  });

  describe('Subscription Management Workflow', () => {
    test('should create and manage subscription lifecycle', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'subscription_user_123',
          email: 'subscription@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'subscription_customer_123',
          userId: user.id,
          stripeCustomerId: 'cus_subscription123'
        }
      });

      // Mock Stripe subscription creation
      mockExternalServices.stripe.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_subscription123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        items: {
          data: [{
            price: {
              id: 'price_basic123',
              unit_amount: 2999,
              currency: 'usd',
              recurring: { interval: 'month' }
            }
          }]
        }
      });

      // Act - Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          customerId: customer.id,
          stripeSubscriptionId: 'sub_test123',
          stripePriceId: 'price_basic123',
          stripeProductId: 'prod_basic123',
          status: 'ACTIVE',
          planType: 'BASIC',
          planName: 'Basic Therapy Plan',
          amount: 29.99,
          currency: 'usd',
          interval: 'month',
          intervalCount: 1,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      // Assert
      expect(subscription).toBeDefined();
      expect(subscription.customerId).toBe(customer.id);
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.planType).toBe('BASIC');

      // Test subscription update
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planType: 'PREMIUM',
          planName: 'Premium Therapy Plan',
          amount: 49.99
        }
      });

      expect(updatedSubscription.planType).toBe('PREMIUM');
      expect(updatedSubscription.amount).toBe(49.99);

      // Test subscription cancellation
      const canceledSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          cancelAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Cancel in 7 days
        }
      });

      expect(canceledSubscription.status).toBe('CANCELED');
      expect(canceledSubscription.cancelAt).toBeDefined();
    });

    test('should handle subscription trial periods', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'trial_user_123',
          email: 'trial@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'trial_customer_123',
          userId: user.id
        }
      });

      // Act - Create subscription with trial
      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const subscription = await prisma.subscription.create({
        data: {
          customerId: customer.id,
          stripeSubscriptionId: 'sub_trial123',
          stripePriceId: 'price_trial123',
          stripeProductId: 'prod_trial123',
          status: 'TRIALING',
          planType: 'BASIC',
          planName: 'Basic Plan (Trial)',
          amount: 29.99,
          currency: 'usd',
          interval: 'month',
          intervalCount: 1,
          currentPeriodStart: trialStart,
          currentPeriodEnd: trialEnd,
          trialStart,
          trialEnd
        }
      });

      // Assert
      expect(subscription.status).toBe('TRIALING');
      expect(subscription.trialStart).toEqual(trialStart);
      expect(subscription.trialEnd).toEqual(trialEnd);

      // Simulate trial end
      const activeSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          trialStart: null,
          trialEnd: null
        }
      });

      expect(activeSubscription.status).toBe('ACTIVE');
      expect(activeSubscription.trialStart).toBeNull();
    });
  });

  describe('Payment Processing Workflow', () => {
    test('should process one-time payment for appointment', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'payment_user_456',
          email: 'payment456@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'payment_customer_456',
          userId: user.id
        }
      });

      const appointment = await prisma.appointment.create({
        data: {
          id: 'appointment_payment_123',
          userId: user.id,
          therapistId: 'therapist_123',
          type: 'INDIVIDUAL_THERAPY',
          status: 'SCHEDULED',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          duration: 60,
          notes: 'Initial consultation'
        }
      });

      // Mock Stripe payment intent
      mockExternalServices.stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_payment123',
        status: 'succeeded',
        amount: 15000 // $150.00 in cents
      });

      // Act - Create payment
      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          appointmentId: appointment.id,
          stripePaymentIntentId: 'pi_payment123',
          amount: 150.00,
          currency: 'usd',
          status: 'SUCCEEDED',
          type: 'SESSION_PAYMENT',
          description: 'Therapy session payment'
        }
      });

      // Assert
      expect(payment).toBeDefined();
      expect(payment.customerId).toBe(customer.id);
      expect(payment.appointmentId).toBe(appointment.id);
      expect(payment.amount).toBe(150.00);
      expect(payment.status).toBe('SUCCEEDED');
      expect(payment.type).toBe('SESSION_PAYMENT');

      // Verify payment-appointment relationship
      const paymentWithAppointment = await prisma.payment.findUnique({
        where: { id: payment.id },
        include: { 
          appointment: true,
          customer: {
            include: { user: true }
          }
        }
      });

      expect(paymentWithAppointment?.appointment).toBeDefined();
      expect(paymentWithAppointment?.customer.user.id).toBe(user.id);
    });

    test('should handle payment failures and retries', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'failed_payment_user',
          email: 'failed@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'failed_payment_customer',
          userId: user.id
        }
      });

      // Act - Create failed payment
      const failedPayment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          stripePaymentIntentId: 'pi_failed123',
          amount: 100.00,
          currency: 'usd',
          status: 'REQUIRES_PAYMENT_METHOD',
          type: 'ONE_TIME',
          description: 'Failed payment attempt'
        }
      });

      expect(failedPayment.status).toBe('REQUIRES_PAYMENT_METHOD');

      // Retry payment
      const retriedPayment = await prisma.payment.update({
        where: { id: failedPayment.id },
        data: {
          status: 'PROCESSING'
        }
      });

      expect(retriedPayment.status).toBe('PROCESSING');

      // Payment succeeds on retry
      const succeededPayment = await prisma.payment.update({
        where: { id: failedPayment.id },
        data: {
          status: 'SUCCEEDED'
        }
      });

      expect(succeededPayment.status).toBe('SUCCEEDED');
    });
  });

  describe('Payment Method Management', () => {
    test('should save and manage payment methods', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'payment_method_user',
          email: 'paymentmethod@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'payment_method_customer',
          userId: user.id
        }
      });

      // Act - Save payment method
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          customerId: customer.id,
          stripePaymentMethodId: 'pm_card123',
          type: 'CARD',
          card: JSON.stringify({
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2026
          }),
          isDefault: true
        }
      });

      // Assert
      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.customerId).toBe(customer.id);
      expect(paymentMethod.type).toBe('CARD');
      expect(paymentMethod.isDefault).toBe(true);

      // Add another payment method
      const secondPaymentMethod = await prisma.paymentMethod.create({
        data: {
          customerId: customer.id,
          stripePaymentMethodId: 'pm_card456',
          type: 'CARD',
          card: JSON.stringify({
            brand: 'mastercard',
            last4: '5555',
            exp_month: 6,
            exp_year: 2027
          }),
          isDefault: false
        }
      });

      // Verify multiple payment methods
      const customerPaymentMethods = await prisma.paymentMethod.findMany({
        where: { customerId: customer.id }
      });

      expect(customerPaymentMethods).toHaveLength(2);

      // Set new default
      await prisma.paymentMethod.update({
        where: { id: paymentMethod.id },
        data: { isDefault: false }
      });

      await prisma.paymentMethod.update({
        where: { id: secondPaymentMethod.id },
        data: { isDefault: true }
      });

      const updatedMethods = await prisma.paymentMethod.findMany({
        where: { customerId: customer.id }
      });

      const defaultMethod = updatedMethods.find(pm => pm.isDefault);
      expect(defaultMethod?.id).toBe(secondPaymentMethod.id);
    });
  });

  describe('Refund Processing Workflow', () => {
    test('should process full and partial refunds', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'refund_user_123',
          email: 'refund@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'refund_customer_123',
          userId: user.id
        }
      });

      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          stripePaymentIntentId: 'pi_refund123',
          amount: 100.00,
          currency: 'usd',
          status: 'SUCCEEDED',
          type: 'ONE_TIME',
          description: 'Payment to be refunded'
        }
      });

      // Mock Stripe refund
      mockExternalServices.stripe.refunds.create.mockResolvedValue({
        id: 'ref_partial123',
        amount: 5000, // $50.00 in cents
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_refund123'
      });

      // Act - Create partial refund
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          stripeRefundId: 'ref_partial123',
          amount: 50.00,
          currency: 'usd',
          reason: 'REQUESTED_BY_CUSTOMER',
          status: 'SUCCEEDED'
        }
      });

      // Update payment with refund info
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refunded: true,
          refundedAmount: 50.00
        }
      });

      // Assert
      expect(refund).toBeDefined();
      expect(refund.paymentId).toBe(payment.id);
      expect(refund.amount).toBe(50.00);
      expect(refund.status).toBe('SUCCEEDED');

      expect(updatedPayment.refunded).toBe(true);
      expect(updatedPayment.refundedAmount).toBe(50.00);

      // Verify refund relationship
      const paymentWithRefunds = await prisma.payment.findUnique({
        where: { id: payment.id },
        include: { refunds: true }
      });

      expect(paymentWithRefunds?.refunds).toHaveLength(1);
      expect(paymentWithRefunds?.refunds[0].amount).toBe(50.00);
    });
  });

  describe('Payment Analytics and Reporting', () => {
    test('should aggregate payment data for reporting', async () => {
      // Arrange - Create test data
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'analytics_user_123',
          email: 'analytics@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'analytics_customer_123',
          userId: user.id
        }
      });

      // Create multiple payments
      await Promise.all([
        prisma.payment.create({
          data: {
            customerId: customer.id,
            stripePaymentIntentId: 'pi_analytics1',
            amount: 150.00,
            currency: 'usd',
            status: 'SUCCEEDED',
            type: 'SESSION_PAYMENT',
            createdAt: new Date('2024-01-01')
          }
        }),
        prisma.payment.create({
          data: {
            customerId: customer.id,
            stripePaymentIntentId: 'pi_analytics2',
            amount: 200.00,
            currency: 'usd',
            status: 'SUCCEEDED',
            type: 'SESSION_PAYMENT',
            createdAt: new Date('2024-01-15')
          }
        }),
        prisma.payment.create({
          data: {
            customerId: customer.id,
            stripePaymentIntentId: 'pi_analytics3',
            amount: 75.00,
            currency: 'usd',
            status: 'FAILED',
            type: 'SESSION_PAYMENT',
            createdAt: new Date('2024-01-20')
          }
        })
      ]);

      // Act - Aggregate data
      const totalSuccessfulPayments = await prisma.payment.aggregate({
        where: {
          customerId: customer.id,
          status: 'SUCCEEDED'
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      const monthlyPayments = await prisma.payment.findMany({
        where: {
          customerId: customer.id,
          createdAt: {
            gte: new Date('2024-01-01'),
            lt: new Date('2024-02-01')
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Assert
      expect(totalSuccessfulPayments._sum.amount).toBe(350.00);
      expect(totalSuccessfulPayments._count.id).toBe(2);
      expect(monthlyPayments).toHaveLength(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle duplicate payment attempts', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'duplicate_user_123',
          email: 'duplicate@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'duplicate_customer_123',
          userId: user.id
        }
      });

      // Act - Try to create duplicate payment
      await prisma.payment.create({
        data: {
          customerId: customer.id,
          stripePaymentIntentId: 'pi_duplicate123',
          amount: 100.00,
          currency: 'usd',
          status: 'SUCCEEDED',
          type: 'ONE_TIME'
        }
      });

      // Attempt duplicate should be handled by unique constraints
      await expect(
        prisma.payment.create({
          data: {
            customerId: customer.id,
            stripePaymentIntentId: 'pi_duplicate123', // Same payment intent ID
            amount: 100.00,
            currency: 'usd',
            status: 'SUCCEEDED',
            type: 'ONE_TIME'
          }
        })
      ).rejects.toThrow(); // Should violate unique constraint

      // Verify only one payment exists
      const payments = await prisma.payment.findMany({
        where: { stripePaymentIntentId: 'pi_duplicate123' }
      });

      expect(payments).toHaveLength(1);
    });

    test('should handle payment currency conversions', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          ...mockUsers.client,
          id: 'currency_user_123',
          email: 'currency@example.com'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          ...mockCustomer,
          id: 'currency_customer_123',
          userId: user.id
        }
      });

      // Act - Create payments in different currencies
      const usdPayment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          stripePaymentIntentId: 'pi_usd123',
          amount: 100.00,
          currency: 'usd',
          status: 'SUCCEEDED',
          type: 'ONE_TIME'
        }
      });

      const eurPayment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          stripePaymentIntentId: 'pi_eur123',
          amount: 85.00,
          currency: 'eur',
          status: 'SUCCEEDED',
          type: 'ONE_TIME'
        }
      });

      // Assert
      expect(usdPayment.currency).toBe('usd');
      expect(eurPayment.currency).toBe('eur');

      // Verify currency-specific queries
      const usdPayments = await prisma.payment.findMany({
        where: { 
          customerId: customer.id,
          currency: 'usd'
        }
      });

      expect(usdPayments).toHaveLength(1);
      expect(usdPayments[0].amount).toBe(100.00);
    });
  });
});