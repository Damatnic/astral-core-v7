/**
 * Stripe Service Unit Tests
 * Tests HIPAA-compliant payment processing functionality
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { StripeService } from '../stripe-service';
import { setupTestEnvironment, createMockStripe } from '../../../../tests/utils/test-helpers';
import { mockCustomer, mockSubscription, mockPayment } from '../../../../tests/utils/test-fixtures';

// Mock dependencies
jest.mock('stripe');
jest.mock('@/lib/db');
jest.mock('@/lib/security/encryption');
jest.mock('@/lib/security/audit');

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  subscription: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  paymentMethod: {
    create: jest.fn()
  },
  refund: {
    create: jest.fn()
  }
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

const mockAuditLog = jest.fn();

// Mock modules
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: mockEncryption
}));

jest.mock('@/lib/security/audit', () => ({
  auditLog: mockAuditLog
}));

// Mock Stripe instance
const mockStripe = createMockStripe();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('StripeService', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCustomer', () => {
    test('should create Stripe customer and store in database', async () => {
      // Arrange
      const customerData = {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'John Doe'
      };

      const stripeCustomer = {
        id: 'cus_test123',
        email: customerData.email,
        name: customerData.name
      };

      mockStripe.customers.create.mockResolvedValue(stripeCustomer);
      mockEncryption.encrypt.mockReturnValue('encrypted_email');
      mockPrisma.customer.create.mockResolvedValue({
        ...mockCustomer,
        userId: customerData.userId
      });

      // Act
      const result = await StripeService.createCustomer(customerData);

      // Assert
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: customerData.email,
        name: customerData.name,
        metadata: {
          userId: customerData.userId
        }
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(customerData.email);
      
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: {
          userId: customerData.userId,
          stripeCustomerId: stripeCustomer.id,
          email: 'encrypted_email',
          name: customerData.name,
          address: null
        }
      });

      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: customerData.userId,
        action: 'CUSTOMER_CREATED',
        entity: 'Customer',
        entityId: mockCustomer.id,
        details: { stripeCustomerId: stripeCustomer.id },
        outcome: 'SUCCESS'
      });

      expect(result.customer).toBeDefined();
      expect(result.stripeCustomer).toEqual(stripeCustomer);
    });

    test('should handle customer creation error', async () => {
      // Arrange
      const customerData = {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'John Doe'
      };

      const error = new Error('Stripe API error');
      mockStripe.customers.create.mockRejectedValue(error);

      // Act & Assert
      await expect(StripeService.createCustomer(customerData)).rejects.toThrow('Stripe API error');

      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: customerData.userId,
        action: 'CUSTOMER_CREATE_FAILED',
        entity: 'Customer',
        details: { error: 'Stripe API error' },
        outcome: 'FAILURE'
      });
    });
  });

  describe('getOrCreateCustomer', () => {
    test('should return existing customer', async () => {
      // Arrange
      const existingCustomer = mockCustomer;
      mockPrisma.customer.findUnique.mockResolvedValue(existingCustomer);

      // Act
      const result = await StripeService.getOrCreateCustomer(
        'user_123',
        'test@example.com',
        'John Doe'
      );

      // Assert
      expect(result).toEqual(existingCustomer);
      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' }
      });
    });

    test('should create new customer if not exists', async () => {
      // Arrange
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      
      const stripeCustomer = { id: 'cus_test123' };
      mockStripe.customers.create.mockResolvedValue(stripeCustomer);
      mockEncryption.encrypt.mockReturnValue('encrypted_email');
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);

      // Act
      const result = await StripeService.getOrCreateCustomer(
        'user_123',
        'test@example.com',
        'John Doe'
      );

      // Assert
      expect(mockStripe.customers.create).toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('createSubscription', () => {
    test('should create subscription successfully', async () => {
      // Arrange
      const subscriptionData = {
        customerId: 'customer_123',
        priceId: 'price_test123',
        trialPeriodDays: 7
      };

      const customer = mockCustomer;
      const stripeSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        trial_start: null,
        trial_end: null
      };

      const stripePrice = {
        id: 'price_test123',
        unit_amount: 2999,
        currency: 'usd',
        recurring: { interval: 'month', interval_count: 1 },
        product: {
          id: 'prod_test123',
          name: 'Basic Plan'
        }
      };

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.subscriptions.create.mockResolvedValue(stripeSubscription);
      mockStripe.prices.retrieve.mockResolvedValue(stripePrice);
      mockPrisma.subscription.create.mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.createSubscription(subscriptionData);

      // Assert
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: customer.stripeCustomerId,
        items: [{ price: subscriptionData.priceId }],
        metadata: {},
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: 7
      });

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: subscriptionData.customerId,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: subscriptionData.priceId,
          status: 'ACTIVE',
          amount: 29.99
        })
      });

      expect(result.subscription).toBeDefined();
      expect(result.stripeSubscription).toEqual(stripeSubscription);
    });

    test('should throw error if customer not found', async () => {
      // Arrange
      const subscriptionData = {
        customerId: 'invalid_customer',
        priceId: 'price_test123'
      };

      mockPrisma.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(StripeService.createSubscription(subscriptionData)).rejects.toThrow('Customer not found');
    });
  });

  describe('createPaymentIntent', () => {
    test('should create payment intent successfully', async () => {
      // Arrange
      const paymentData = {
        customerId: 'customer_123',
        amount: 150.00,
        description: 'Therapy session',
        appointmentId: 'appointment_123'
      };

      const customer = mockCustomer;
      const paymentIntent = {
        id: 'pi_test123',
        status: 'requires_payment_method',
        amount: 15000
      };

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.paymentIntents.create.mockResolvedValue(paymentIntent);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      // Act
      const result = await StripeService.createPaymentIntent(paymentData);

      // Assert
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 15000, // Amount in cents
        currency: 'usd',
        customer: customer.stripeCustomerId,
        metadata: {
          userId: customer.userId,
          appointmentId: paymentData.appointmentId
        },
        confirm: false,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment-complete`,
        description: paymentData.description
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: paymentData.customerId,
          appointmentId: paymentData.appointmentId,
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentData.amount,
          status: 'REQUIRES_PAYMENT_METHOD',
          type: 'SESSION_PAYMENT'
        })
      });

      expect(result.payment).toBeDefined();
      expect(result.paymentIntent).toEqual(paymentIntent);
    });

    test('should handle payment intent creation error', async () => {
      // Arrange
      const paymentData = {
        customerId: 'customer_123',
        amount: 150.00
      };

      const customer = mockCustomer;
      const error = new Error('Payment failed');

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.paymentIntents.create.mockRejectedValue(error);

      // Act & Assert
      await expect(StripeService.createPaymentIntent(paymentData)).rejects.toThrow('Payment failed');

      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: customer.userId,
        action: 'PAYMENT_INTENT_CREATE_FAILED',
        entity: 'Payment',
        details: expect.objectContaining({
          customerId: paymentData.customerId,
          error: 'Payment failed'
        }),
        outcome: 'FAILURE'
      });
    });
  });

  describe('updateSubscription', () => {
    test('should update subscription successfully', async () => {
      // Arrange
      const updateData = {
        subscriptionId: 'sub_test123',
        priceId: 'price_new123'
      };

      const subscription = {
        ...mockSubscription,
        customer: mockCustomer
      };

      const currentStripeSubscription = {
        id: 'sub_test123',
        items: {
          data: [{ id: 'si_test123' }]
        }
      };

      const updatedStripeSubscription = {
        ...currentStripeSubscription,
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription);
      mockStripe.subscriptions.retrieve.mockResolvedValue(currentStripeSubscription);
      mockStripe.subscriptions.update.mockResolvedValue(updatedStripeSubscription);
      mockPrisma.subscription.update.mockResolvedValue(subscription);

      // Act
      const result = await StripeService.updateSubscription(updateData);

      // Assert
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        updateData.subscriptionId,
        {
          proration_behavior: 'create_prorations',
          items: [{
            id: 'si_test123',
            price: updateData.priceId,
            quantity: 1
          }]
        }
      );

      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_UPDATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: expect.objectContaining({
          stripeSubscriptionId: updateData.subscriptionId,
          newPriceId: updateData.priceId
        }),
        outcome: 'SUCCESS'
      });

      expect(result.subscription).toBeDefined();
    });
  });

  describe('cancelSubscription', () => {
    test('should cancel subscription at period end', async () => {
      // Arrange
      const subscriptionId = 'sub_test123';
      const subscription = {
        ...mockSubscription,
        customer: mockCustomer
      };

      const canceledSubscription = {
        id: subscriptionId,
        status: 'active',
        cancel_at: 1643673600
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(subscription);
      mockStripe.subscriptions.update.mockResolvedValue(canceledSubscription);
      mockPrisma.subscription.update.mockResolvedValue(subscription);

      // Act
      const result = await StripeService.cancelSubscription(subscriptionId, true);

      // Assert
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        { cancel_at_period_end: true }
      );

      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_CANCELED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          stripeSubscriptionId: subscriptionId,
          cancelAtPeriodEnd: true
        },
        outcome: 'SUCCESS'
      });
    });
  });

  describe('createSetupIntent', () => {
    test('should create setup intent successfully', async () => {
      // Arrange
      const customerId = 'customer_123';
      const customer = mockCustomer;
      const setupIntent = {
        id: 'seti_test123',
        client_secret: 'seti_test123_secret'
      };

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.setupIntents.create.mockResolvedValue(setupIntent);

      // Act
      const result = await StripeService.createSetupIntent(customerId);

      // Assert
      expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
        customer: customer.stripeCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      expect(result).toEqual(setupIntent);
    });
  });

  describe('createRefund', () => {
    test('should create refund successfully', async () => {
      // Arrange
      const paymentIntentId = 'pi_test123';
      const amount = 50.00;
      const reason = 'requested_by_customer';

      const payment = {
        ...mockPayment,
        customer: mockCustomer
      };

      const stripeRefund = {
        id: 'ref_test123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        receipt_number: 'ref_123'
      };

      const refund = {
        id: 'refund_123',
        paymentId: payment.id,
        amount: 50.00
      };

      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockStripe.refunds.create.mockResolvedValue(stripeRefund);
      mockPrisma.refund.create.mockResolvedValue(refund);
      mockPrisma.payment.update.mockResolvedValue(payment);

      // Act
      const result = await StripeService.createRefund(paymentIntentId, amount, reason);

      // Assert
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        amount: 5000,
        reason
      });

      expect(mockPrisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentId: payment.id,
          stripeRefundId: stripeRefund.id,
          amount: 50.00,
          currency: 'usd',
          reason: 'REQUESTED_BY_CUSTOMER',
          status: 'SUCCEEDED'
        })
      });

      expect(result.refund).toBeDefined();
      expect(result.stripeRefund).toEqual(stripeRefund);
    });
  });

  describe('constructWebhookEvent', () => {
    test('should construct webhook event successfully', () => {
      // Arrange
      const body = 'webhook_body';
      const signature = 'webhook_signature';
      const event = { type: 'payment_intent.succeeded' };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      const result = StripeService.constructWebhookEvent(body, signature);

      // Assert
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      expect(result).toEqual(event);
    });

    test('should throw error for missing webhook secret', () => {
      // Arrange
      delete process.env.STRIPE_WEBHOOK_SECRET;

      // Act & Assert
      expect(() => StripeService.constructWebhookEvent('body', 'signature'))
        .toThrow('STRIPE_WEBHOOK_SECRET environment variable not configured');
    });

    test('should throw error for invalid webhook secret format', () => {
      // Arrange
      process.env.STRIPE_WEBHOOK_SECRET = 'invalid_secret';

      // Act & Assert
      expect(() => StripeService.constructWebhookEvent('body', 'signature'))
        .toThrow('Invalid STRIPE_WEBHOOK_SECRET format - must start with whsec_');
    });
  });

  describe('getPaymentMethods', () => {
    test('should retrieve payment methods successfully', async () => {
      // Arrange
      const customerId = 'customer_123';
      const customer = mockCustomer;
      const paymentMethods = [
        {
          id: 'pm_test123',
          type: 'card',
          card: { brand: 'visa', last4: '4242' }
        }
      ];

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.paymentMethods.list.mockResolvedValue({ data: paymentMethods });

      // Act
      const result = await StripeService.getPaymentMethods(customerId);

      // Assert
      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: customer.stripeCustomerId,
        type: 'card'
      });
      expect(result).toEqual(paymentMethods);
    });
  });

  describe('getInvoices', () => {
    test('should retrieve invoices successfully', async () => {
      // Arrange
      const customerId = 'customer_123';
      const customer = mockCustomer;
      const invoices = [
        {
          id: 'in_test123',
          number: 'INV-001',
          amount_paid: 2999
        }
      ];

      mockPrisma.customer.findUnique.mockResolvedValue(customer);
      mockStripe.invoices.list.mockResolvedValue({ data: invoices });

      // Act
      const result = await StripeService.getInvoices(customerId, 5);

      // Assert
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: customer.stripeCustomerId,
        limit: 5,
        expand: ['data.subscription']
      });
      expect(result).toEqual(invoices);
    });
  });
});