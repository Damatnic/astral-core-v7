// Mock Stripe instance first
const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn()
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn()
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn()
  },
  setupIntents: {
    create: jest.fn(),
    retrieve: jest.fn()
  },
  paymentMethods: {
    attach: jest.fn(),
    detach: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn()
  },
  prices: {
    retrieve: jest.fn(),
    list: jest.fn()
  },
  products: {
    retrieve: jest.fn()
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn()
  },
  invoices: {
    list: jest.fn(),
    retrieve: jest.fn()
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

// Mock encryption service
const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

// Mock audit log
const mockAuditLog = jest.fn();

// Set up all mocks before importing the service
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

jest.mock('@/lib/db/prisma', () => ({
  default: require('../../mocks/prisma').mockPrisma
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: mockEncryption
}));

jest.mock('@/lib/security/audit', () => ({
  auditLog: mockAuditLog
}));

// Import service after mocks are set up
import { StripeService } from '@/lib/services/stripe-service';
import { mockPrisma } from '../../mocks/prisma';

// Make mocks available to tests
const prisma = mockPrisma;
const encryption = mockEncryption;
const auditLog = mockAuditLog;

describe('StripeService - Enhanced Payment Processing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_12345';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.NEXT_PUBLIC_APP_URL = 'https://localhost:3000';
  });

  describe('Customer Management', () => {
    describe('createCustomer', () => {
      it('should create customer successfully with encrypted email', async () => {
        const mockStripeCustomer = {
          id: 'cus_test123',
          email: 'test@example.com',
          name: 'John Doe',
          created: Math.floor(Date.now() / 1000)
        };

        const mockDatabaseCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123',
          email: 'encrypted_test@example.com',
          name: 'John Doe',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockStripe.customers.create.mockResolvedValue(mockStripeCustomer);
        encryption.encrypt.mockReturnValue('encrypted_test@example.com');
        prisma.customer.create.mockResolvedValue(mockDatabaseCustomer);

        const customerData = {
          userId: 'user_123',
          email: 'test@example.com',
          name: 'John Doe',
          phone: '+1234567890',
          metadata: { source: 'web' }
        };

        const result = await StripeService.createCustomer(customerData);

        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'John Doe',
          phone: '+1234567890',
          address: undefined,
          metadata: {
            userId: 'user_123',
            source: 'web'
          }
        });

        expect(encryption.encrypt).toHaveBeenCalledWith('test@example.com');
        expect(prisma.customer.create).toHaveBeenCalledWith({
          data: {
            userId: 'user_123',
            stripeCustomerId: 'cus_test123',
            email: 'encrypted_test@example.com',
            name: 'John Doe',
            address: null
          }
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'CUSTOMER_CREATED',
          entity: 'Customer',
          entityId: 'db_customer_123',
          details: { stripeCustomerId: 'cus_test123' },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual({
          customer: mockDatabaseCustomer,
          stripeCustomer: mockStripeCustomer
        });
      });

      it('should handle Stripe customer creation failure', async () => {
        const error = new Error('Stripe API error');
        mockStripe.customers.create.mockRejectedValue(error);

        const customerData = {
          userId: 'user_123',
          email: 'test@example.com',
          name: 'John Doe'
        };

        await expect(StripeService.createCustomer(customerData)).rejects.toThrow(
          'Stripe API error'
        );

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'CUSTOMER_CREATE_FAILED',
          entity: 'Customer',
          details: { error: 'Stripe API error' },
          outcome: 'FAILURE'
        });
      });

      it('should handle database insertion failure after successful Stripe creation', async () => {
        const mockStripeCustomer = {
          id: 'cus_test123',
          email: 'test@example.com'
        };

        mockStripe.customers.create.mockResolvedValue(mockStripeCustomer);
        encryption.encrypt.mockReturnValue('encrypted_email');
        prisma.customer.create.mockRejectedValue(new Error('Database error'));

        const customerData = {
          userId: 'user_123',
          email: 'test@example.com'
        };

        await expect(StripeService.createCustomer(customerData)).rejects.toThrow('Database error');

        expect(mockStripe.customers.create).toHaveBeenCalled();
        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'CUSTOMER_CREATE_FAILED',
          entity: 'Customer',
          details: { error: 'Database error' },
          outcome: 'FAILURE'
        });
      });
    });

    describe('getOrCreateCustomer', () => {
      it('should return existing customer if found', async () => {
        const existingCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          email: 'encrypted_email'
        };

        prisma.customer.findUnique.mockResolvedValue(existingCustomer);

        const result = await StripeService.getOrCreateCustomer(
          'user_123',
          'test@example.com',
          'John Doe'
        );

        expect(result).toEqual(existingCustomer);
        expect(prisma.customer.findUnique).toHaveBeenCalledWith({
          where: { userId: 'user_123' }
        });
        expect(mockStripe.customers.create).not.toHaveBeenCalled();
      });

      it('should create new customer if not found', async () => {
        const mockStripeCustomer = {
          id: 'cus_test123',
          email: 'test@example.com'
        };

        const mockDatabaseCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        prisma.customer.findUnique.mockResolvedValue(null);
        mockStripe.customers.create.mockResolvedValue(mockStripeCustomer);
        prisma.customer.create.mockResolvedValue(mockDatabaseCustomer);
        encryption.encrypt.mockReturnValue('encrypted_email');

        const result = await StripeService.getOrCreateCustomer(
          'user_123',
          'test@example.com',
          'John Doe'
        );

        expect(result).toEqual(mockDatabaseCustomer);
        expect(mockStripe.customers.create).toHaveBeenCalled();
      });
    });
  });

  describe('Subscription Management', () => {
    describe('createSubscription', () => {
      it('should create subscription successfully', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        const mockPrice = {
          id: 'price_test123',
          unit_amount: 2999,
          currency: 'usd',
          recurring: { interval: 'month', interval_count: 1 },
          product: {
            id: 'prod_test123',
            name: 'Premium Therapy Plan'
          }
        };

        const mockStripeSubscription = {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          trial_start: null,
          trial_end: null
        };

        const mockDatabaseSubscription = {
          id: 'db_sub_123',
          customerId: 'db_customer_123',
          stripeSubscriptionId: 'sub_test123',
          status: 'active'
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.subscriptions.create.mockResolvedValue(mockStripeSubscription);
        mockStripe.prices.retrieve.mockResolvedValue(mockPrice);
        prisma.subscription.create.mockResolvedValue(mockDatabaseSubscription);

        const subscriptionData = {
          customerId: 'db_customer_123',
          priceId: 'price_test123',
          trialPeriodDays: 7,
          paymentMethodId: 'pm_test123',
          metadata: { plan: 'premium' }
        };

        const result = await StripeService.createSubscription(subscriptionData);

        expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
          customer: 'cus_test123',
          items: [{ price: 'price_test123' }],
          metadata: { plan: 'premium' },
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          trial_period_days: 7,
          default_payment_method: 'pm_test123'
        });

        expect(prisma.subscription.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            customerId: 'db_customer_123',
            stripeSubscriptionId: 'sub_test123',
            stripePriceId: 'price_test123',
            stripeProductId: 'prod_test123',
            status: 'active',
            planType: 'PREMIUM',
            planName: 'Premium Therapy Plan',
            amount: 29.99,
            currency: 'usd',
            interval: 'month',
            intervalCount: 1
          })
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'SUBSCRIPTION_CREATED',
          entity: 'Subscription',
          entityId: 'db_sub_123',
          details: {
            stripeSubscriptionId: 'sub_test123',
            priceId: 'price_test123',
            amount: 29.99
          },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual({
          subscription: mockDatabaseSubscription,
          stripeSubscription: mockStripeSubscription
        });
      });

      it('should fail when customer not found', async () => {
        prisma.customer.findUnique.mockResolvedValue(null);

        const subscriptionData = {
          customerId: 'invalid_customer',
          priceId: 'price_test123'
        };

        await expect(StripeService.createSubscription(subscriptionData)).rejects.toThrow(
          'Customer not found'
        );
      });

      it('should handle Stripe subscription creation failure', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.subscriptions.create.mockRejectedValue(new Error('Payment method required'));

        const subscriptionData = {
          customerId: 'db_customer_123',
          priceId: 'price_test123'
        };

        await expect(StripeService.createSubscription(subscriptionData)).rejects.toThrow(
          'Payment method required'
        );

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'SUBSCRIPTION_CREATE_FAILED',
          entity: 'Subscription',
          details: expect.objectContaining({
            error: 'Payment method required'
          }),
          outcome: 'FAILURE'
        });
      });
    });

    describe('updateSubscription', () => {
      it('should update subscription successfully', async () => {
        const mockSubscription = {
          id: 'db_sub_123',
          stripeSubscriptionId: 'sub_test123',
          customer: { userId: 'user_123' }
        };

        const mockStripeSubscription = {
          id: 'sub_test123',
          items: {
            data: [{ id: 'si_test123' }]
          }
        };

        const mockUpdatedStripeSubscription = {
          id: 'sub_test123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000
        };

        const mockUpdatedSubscription = {
          ...mockSubscription,
          status: 'active'
        };

        prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
        mockStripe.subscriptions.retrieve.mockResolvedValue(mockStripeSubscription);
        mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedStripeSubscription);
        prisma.subscription.update.mockResolvedValue(mockUpdatedSubscription);

        const updateData = {
          subscriptionId: 'sub_test123',
          priceId: 'price_new123',
          quantity: 1,
          prorationBehavior: 'create_prorations' as const
        };

        const result = await StripeService.updateSubscription(updateData);

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
          proration_behavior: 'create_prorations',
          items: [
            {
              id: 'si_test123',
              price: 'price_new123',
              quantity: 1
            }
          ]
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'SUBSCRIPTION_UPDATED',
          entity: 'Subscription',
          entityId: 'db_sub_123',
          details: {
            stripeSubscriptionId: 'sub_test123',
            newPriceId: 'price_new123',
            quantity: 1
          },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual({
          subscription: mockUpdatedSubscription,
          stripeSubscription: mockUpdatedStripeSubscription
        });
      });
    });

    describe('cancelSubscription', () => {
      it('should cancel subscription at period end', async () => {
        const mockSubscription = {
          id: 'db_sub_123',
          stripeSubscriptionId: 'sub_test123',
          customer: { userId: 'user_123' }
        };

        const mockUpdatedStripeSubscription = {
          id: 'sub_test123',
          status: 'active',
          cancel_at_period_end: true,
          cancel_at: Math.floor(Date.now() / 1000) + 2592000
        };

        const mockUpdatedSubscription = {
          ...mockSubscription,
          status: 'active'
        };

        prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
        mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedStripeSubscription);
        prisma.subscription.update.mockResolvedValue(mockUpdatedSubscription);

        const result = await StripeService.cancelSubscription('sub_test123', true);

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
          cancel_at_period_end: true
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'SUBSCRIPTION_CANCELED',
          entity: 'Subscription',
          entityId: 'db_sub_123',
          details: {
            stripeSubscriptionId: 'sub_test123',
            cancelAtPeriodEnd: true
          },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual({
          subscription: mockUpdatedSubscription,
          stripeSubscription: mockUpdatedStripeSubscription
        });
      });

      it('should cancel subscription immediately', async () => {
        const mockSubscription = {
          id: 'db_sub_123',
          stripeSubscriptionId: 'sub_test123',
          customer: { userId: 'user_123' }
        };

        prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
        mockStripe.subscriptions.update.mockResolvedValue({ status: 'canceled', cancel_at: null });
        prisma.subscription.update.mockResolvedValue({ ...mockSubscription, status: 'canceled' });

        await StripeService.cancelSubscription('sub_test123', false);

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
          cancel_at_period_end: false
        });
      });
    });
  });

  describe('Payment Processing', () => {
    describe('createPaymentIntent', () => {
      it('should create payment intent for session payment', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        const mockPaymentIntent = {
          id: 'pi_test123',
          amount: 15000,
          currency: 'usd',
          customer: 'cus_test123',
          status: 'requires_payment_method'
        };

        const mockPayment = {
          id: 'db_payment_123',
          customerId: 'db_customer_123',
          stripePaymentIntentId: 'pi_test123',
          amount: 150.0,
          status: 'requires_payment_method'
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
        prisma.payment.create.mockResolvedValue(mockPayment);

        const paymentData = {
          customerId: 'db_customer_123',
          amount: 150.0,
          currency: 'usd',
          description: 'Therapy session fee',
          appointmentId: 'appt_123',
          paymentMethodId: 'pm_test123',
          metadata: { sessionType: 'individual' }
        };

        const result = await StripeService.createPaymentIntent(paymentData);

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 15000,
          currency: 'usd',
          customer: 'cus_test123',
          payment_method: 'pm_test123',
          description: 'Therapy session fee',
          metadata: {
            userId: 'user_123',
            appointmentId: 'appt_123',
            sessionType: 'individual'
          },
          confirm: true,
          return_url: 'https://localhost:3000/billing/payment-complete'
        });

        expect(prisma.payment.create).toHaveBeenCalledWith({
          data: {
            customerId: 'db_customer_123',
            appointmentId: 'appt_123',
            stripePaymentIntentId: 'pi_test123',
            amount: 150.0,
            currency: 'usd',
            status: 'requires_payment_method',
            type: 'SESSION_PAYMENT',
            description: 'Therapy session fee',
            metadata: JSON.stringify({ sessionType: 'individual' })
          }
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'PAYMENT_INTENT_CREATED',
          entity: 'Payment',
          entityId: 'db_payment_123',
          details: {
            stripePaymentIntentId: 'pi_test123',
            amount: 150.0,
            appointmentId: 'appt_123'
          },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual({
          payment: mockPayment,
          paymentIntent: mockPaymentIntent
        });
      });

      it('should create payment intent without payment method', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.paymentIntents.create.mockResolvedValue({
          id: 'pi_test123',
          status: 'requires_payment_method'
        });
        prisma.payment.create.mockResolvedValue({});

        const paymentData = {
          customerId: 'db_customer_123',
          amount: 100.0
        };

        await StripeService.createPaymentIntent(paymentData);

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 10000,
          currency: 'usd',
          customer: 'cus_test123',
          payment_method: undefined,
          description: undefined,
          metadata: {
            userId: 'user_123',
            appointmentId: ''
          },
          confirm: false,
          return_url: 'https://localhost:3000/billing/payment-complete'
        });
      });
    });

    describe('createRefund', () => {
      it('should create full refund successfully', async () => {
        const mockPayment = {
          id: 'db_payment_123',
          stripePaymentIntentId: 'pi_test123',
          amount: 150.0,
          customer: { userId: 'user_123' }
        };

        const mockStripeRefund = {
          id: 're_test123',
          amount: 15000,
          currency: 'usd',
          payment_intent: 'pi_test123',
          status: 'succeeded',
          receipt_number: 'rf_12345'
        };

        const mockRefund = {
          id: 'db_refund_123',
          paymentId: 'db_payment_123',
          stripeRefundId: 're_test123',
          amount: 150.0
        };

        prisma.payment.findUnique.mockResolvedValue(mockPayment);
        mockStripe.refunds.create.mockResolvedValue(mockStripeRefund);
        prisma.refund.create.mockResolvedValue(mockRefund);
        prisma.payment.update.mockResolvedValue({});

        const result = await StripeService.createRefund('pi_test123');

        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_test123'
        });

        expect(prisma.refund.create).toHaveBeenCalledWith({
          data: {
            paymentId: 'db_payment_123',
            stripeRefundId: 're_test123',
            amount: 150.0,
            currency: 'usd',
            reason: 'REQUESTED_BY_CUSTOMER',
            status: 'SUCCEEDED',
            receiptNumber: 'rf_12345'
          }
        });

        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: 'db_payment_123' },
          data: {
            refunded: true,
            refundedAmount: 150.0
          }
        });

        expect(result).toEqual({
          refund: mockRefund,
          stripeRefund: mockStripeRefund
        });
      });

      it('should create partial refund with reason', async () => {
        const mockPayment = {
          id: 'db_payment_123',
          stripePaymentIntentId: 'pi_test123',
          customer: { userId: 'user_123' }
        };

        prisma.payment.findUnique.mockResolvedValue(mockPayment);
        mockStripe.refunds.create.mockResolvedValue({
          id: 're_test123',
          amount: 5000,
          currency: 'usd'
        });
        prisma.refund.create.mockResolvedValue({});
        prisma.payment.update.mockResolvedValue({});

        await StripeService.createRefund('pi_test123', 50.0, 'duplicate');

        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_test123',
          amount: 5000,
          reason: 'duplicate'
        });
      });
    });
  });

  describe('Payment Methods', () => {
    describe('createSetupIntent', () => {
      it('should create setup intent successfully', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123',
          stripeCustomerId: 'cus_test123'
        };

        const mockSetupIntent = {
          id: 'seti_test123',
          customer: 'cus_test123',
          client_secret: 'seti_test123_secret'
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.setupIntents.create.mockResolvedValue(mockSetupIntent);

        const result = await StripeService.createSetupIntent('db_customer_123');

        expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
          customer: 'cus_test123',
          payment_method_types: ['card'],
          usage: 'off_session'
        });

        expect(auditLog).toHaveBeenCalledWith({
          userId: 'user_123',
          action: 'SETUP_INTENT_CREATED',
          entity: 'PaymentMethod',
          details: { setupIntentId: 'seti_test123' },
          outcome: 'SUCCESS'
        });

        expect(result).toEqual(mockSetupIntent);
      });
    });

    describe('storePaymentMethod', () => {
      it('should store payment method successfully', async () => {
        const mockStripePaymentMethod = {
          id: 'pm_test123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        };

        const mockStoredPaymentMethod = {
          id: 'db_pm_123',
          customerId: 'db_customer_123',
          stripePaymentMethodId: 'pm_test123',
          type: 'CARD'
        };

        const mockCustomer = {
          id: 'db_customer_123',
          userId: 'user_123'
        };

        mockStripe.paymentMethods.retrieve.mockResolvedValue(mockStripePaymentMethod);
        prisma.paymentMethod.create.mockResolvedValue(mockStoredPaymentMethod);
        prisma.customer.findUnique.mockResolvedValue(mockCustomer);

        const result = await StripeService.storePaymentMethod('db_customer_123', 'pm_test123');

        expect(prisma.paymentMethod.create).toHaveBeenCalledWith({
          data: {
            customerId: 'db_customer_123',
            stripePaymentMethodId: 'pm_test123',
            type: 'CARD',
            card: JSON.stringify({
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025
            })
          }
        });

        expect(result).toEqual(mockStoredPaymentMethod);
      });
    });

    describe('getPaymentMethods', () => {
      it('should retrieve customer payment methods', async () => {
        const mockCustomer = {
          id: 'db_customer_123',
          stripeCustomerId: 'cus_test123'
        };

        const mockPaymentMethods = {
          data: [
            {
              id: 'pm_test123',
              type: 'card',
              card: { brand: 'visa', last4: '4242' }
            }
          ]
        };

        prisma.customer.findUnique.mockResolvedValue(mockCustomer);
        mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

        const result = await StripeService.getPaymentMethods('db_customer_123');

        expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_test123',
          type: 'card'
        });

        expect(result).toEqual(mockPaymentMethods.data);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('determinePlanType', () => {
      it('should correctly determine plan types', () => {
        // Access the private method via bracket notation for testing
        const determinePlanType = (StripeService as { determinePlanType: (name: string) => string })
          .determinePlanType;

        expect(determinePlanType('Basic Therapy Plan')).toBe('BASIC');
        expect(determinePlanType('Premium Mental Health Package')).toBe('PREMIUM');
        expect(determinePlanType('Family Counseling Plan')).toBe('FAMILY');
        expect(determinePlanType('Group Therapy Sessions')).toBe('GROUP');
        expect(determinePlanType('Enterprise Wellness Program')).toBe('ENTERPRISE');
        expect(determinePlanType('Individual Therapy Package')).toBe('THERAPY_PACKAGE');
        expect(determinePlanType('Unknown Plan Type')).toBe('STANDARD');
      });
    });

    describe('constructWebhookEvent', () => {
      it('should construct webhook event successfully', () => {
        const mockEvent = {
          id: 'evt_test123',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test123' } }
        };

        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

        const result = StripeService.constructWebhookEvent('request_body', 'signature');

        expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
          'request_body',
          'signature',
          'whsec_test123'
        );
        expect(result).toEqual(mockEvent);
      });

      it('should throw error when webhook secret not configured', () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;

        expect(() => {
          StripeService.constructWebhookEvent('body', 'signature');
        }).toThrow('Stripe webhook secret not configured');
      });
    });

    describe('getStripeInstance', () => {
      it('should return Stripe instance', () => {
        const stripe = StripeService.getStripeInstance();
        expect(stripe).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      networkError.name = 'NetworkError';

      mockStripe.customers.create.mockRejectedValue(networkError);

      const customerData = {
        userId: 'user_123',
        email: 'test@example.com'
      };

      await expect(StripeService.createCustomer(customerData)).rejects.toThrow('Network timeout');

      expect(auditLog).toHaveBeenCalledWith({
        userId: 'user_123',
        action: 'CUSTOMER_CREATE_FAILED',
        entity: 'Customer',
        details: { error: 'Network timeout' },
        outcome: 'FAILURE'
      });
    });

    it('should handle validation errors from Stripe', async () => {
      const validationError = new Error('Invalid email format');
      validationError.name = 'StripeInvalidRequestError';

      mockStripe.customers.create.mockRejectedValue(validationError);

      const customerData = {
        userId: 'user_123',
        email: 'invalid-email'
      };

      await expect(StripeService.createCustomer(customerData)).rejects.toThrow(
        'Invalid email format'
      );
    });

    it('should handle missing environment variables', () => {
      delete process.env.STRIPE_SECRET_KEY;

      // Test would require reloading the module to see the effect
      expect(() => {
        StripeService.constructWebhookEvent('body', 'sig');
      }).toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete customer lifecycle', async () => {
      // Create customer
      const mockCustomer = {
        id: 'db_customer_123',
        userId: 'user_123',
        stripeCustomerId: 'cus_test123'
      };

      mockStripe.customers.create.mockResolvedValue({ id: 'cus_test123' });
      prisma.customer.create.mockResolvedValue(mockCustomer);
      encryption.encrypt.mockReturnValue('encrypted_email');

      const customer = await StripeService.createCustomer({
        userId: 'user_123',
        email: 'test@example.com',
        name: 'John Doe'
      });

      // Create subscription
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000
      });

      mockStripe.prices.retrieve.mockResolvedValue({
        id: 'price_test123',
        unit_amount: 2999,
        currency: 'usd',
        recurring: { interval: 'month', interval_count: 1 },
        product: { id: 'prod_test123', name: 'Premium Plan' }
      });

      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.subscription.create.mockResolvedValue({
        id: 'db_sub_123',
        customerId: mockCustomer.id
      });

      const subscription = await StripeService.createSubscription({
        customerId: mockCustomer.id,
        priceId: 'price_test123'
      });

      expect(customer.customer.id).toBe('db_customer_123');
      expect(subscription.subscription.id).toBe('db_sub_123');
    });
  });
});
