import {
  createMockStripeCustomer,
  createMockStripeSubscription,
  createMockUser
} from '../../utils/test-helpers';
import { mockPrisma, resetPrismaMocks } from '../../mocks/prisma';

// Mock Stripe
const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    del: jest.fn()
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
    confirm: jest.fn(),
    cancel: jest.fn()
  },
  paymentMethods: {
    create: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn()
  },
  refunds: {
    create: jest.fn()
  },
  prices: {
    list: jest.fn(),
    retrieve: jest.fn()
  },
  products: {
    list: jest.fn(),
    retrieve: jest.fn()
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

jest.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: {
    encrypt: jest.fn(data => `encrypted_${data}`),
    decrypt: jest.fn(data => data.replace('encrypted_', '')),
    encryptObject: jest.fn(obj => obj),
    decryptObject: jest.fn(obj => obj)
  }
}));

jest.mock('@/lib/security/audit', () => ({
  auditLog: {
    log: jest.fn(),
    logPayment: jest.fn(),
    logSubscription: jest.fn(),
    logError: jest.fn()
  }
}));

// Import the service after mocks are set up
import { StripeService } from '@/lib/services/stripe-service';

describe('StripeService', () => {
  let stripeService: StripeService;

  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
    stripeService = new StripeService();
  });

  describe('createCustomer', () => {
    it('should create a new Stripe customer successfully', async () => {
      const userData = createMockUser();
      const stripeCustomer = createMockStripeCustomer({
        id: 'cus_test123',
        email: userData.email,
        name: userData.name
      });

      mockStripe.customers.create.mockResolvedValue(stripeCustomer);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'customer-123',
        userId: userData.id,
        stripeCustomerId: stripeCustomer.id,
        email: userData.email,
        name: userData.name,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.createCustomer({
        userId: userData.id,
        email: userData.email,
        name: userData.name
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        metadata: {
          userId: userData.id
        }
      });
      expect(mockPrisma.customer.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data?.stripeCustomerId).toBe(stripeCustomer.id);
    });

    it('should handle Stripe customer creation failure', async () => {
      const userData = createMockUser();

      mockStripe.customers.create.mockRejectedValue(new Error('Stripe API error'));

      const result = await stripeService.createCustomer({
        userId: userData.id,
        email: userData.email,
        name: userData.name
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create customer');
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });

    it('should handle database save failure after Stripe creation', async () => {
      const userData = createMockUser();
      const stripeCustomer = createMockStripeCustomer();

      mockStripe.customers.create.mockResolvedValue(stripeCustomer);
      mockPrisma.customer.create.mockRejectedValue(new Error('Database error'));

      const result = await stripeService.createCustomer({
        userId: userData.id,
        email: userData.email,
        name: userData.name
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save customer');
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      const stripeSubscription = createMockStripeSubscription();
      const customerId = 'cus_test123';
      const priceId = 'price_test123';

      mockStripe.subscriptions.create.mockResolvedValue(stripeSubscription);
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'subscription-123',
        stripeSubscriptionId: stripeSubscription.id,
        customerId: 'customer-123',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.createSubscription({
        customerId,
        priceId
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      });
      expect(result.success).toBe(true);
    });

    it('should handle subscription creation with trial period', async () => {
      const stripeSubscription = createMockStripeSubscription();
      const customerId = 'cus_test123';
      const priceId = 'price_test123';
      const trialDays = 7;

      mockStripe.subscriptions.create.mockResolvedValue(stripeSubscription);
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'subscription-123',
        stripeSubscriptionId: stripeSubscription.id,
        customerId: 'customer-123',
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.createSubscription({
        customerId,
        priceId,
        trialPeriodDays: trialDays
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_period_days: trialDays
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle Stripe subscription creation failure', async () => {
      mockStripe.subscriptions.create.mockRejectedValue(new Error('Payment method required'));

      const result = await stripeService.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_test123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create subscription');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub_test123';
      const stripeSubscription = createMockStripeSubscription({
        id: subscriptionId,
        status: 'canceled'
      });

      mockStripe.subscriptions.update.mockResolvedValue(stripeSubscription);
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'subscription-123',
        stripeSubscriptionId: subscriptionId,
        customerId: 'customer-123',
        status: 'CANCELED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.cancelSubscription(subscriptionId);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        cancel_at_period_end: true
      });
      expect(mockPrisma.subscription.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle immediate cancellation', async () => {
      const subscriptionId = 'sub_test123';
      const stripeSubscription = createMockStripeSubscription({
        status: 'canceled'
      });

      mockStripe.subscriptions.cancel.mockResolvedValue(stripeSubscription);
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'subscription-123',
        stripeSubscriptionId: subscriptionId,
        customerId: 'customer-123',
        status: 'CANCELED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.cancelSubscription(subscriptionId, true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
      expect(result.success).toBe(true);
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const paymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 2999,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(paymentIntent);

      const result = await stripeService.createPaymentIntent({
        amount: 2999,
        currency: 'usd',
        customerId: 'cus_test123'
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2999,
        currency: 'usd',
        customer: 'cus_test123',
        automatic_payment_methods: { enabled: true }
      });
      expect(result.success).toBe(true);
      expect(result.data?.clientSecret).toBe(paymentIntent.client_secret);
    });

    it('should handle payment intent creation failure', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Invalid amount'));

      const result = await stripeService.createPaymentIntent({
        amount: -100, // Invalid amount
        currency: 'usd',
        customerId: 'cus_test123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create payment intent');
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method to customer successfully', async () => {
      const paymentMethodId = 'pm_test123';
      const customerId = 'cus_test123';

      const paymentMethod = {
        id: paymentMethodId,
        customer: customerId,
        type: 'card'
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(paymentMethod);

      const result = await stripeService.attachPaymentMethod(paymentMethodId, customerId);

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
        customer: customerId
      });
      expect(result.success).toBe(true);
    });

    it('should handle payment method attachment failure', async () => {
      mockStripe.paymentMethods.attach.mockRejectedValue(new Error('Payment method not found'));

      const result = await stripeService.attachPaymentMethod('pm_invalid', 'cus_test123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to attach payment method');
    });
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const refund = {
        id: 're_test123',
        amount: 2999,
        currency: 'usd',
        status: 'succeeded',
        payment_intent: 'pi_test123'
      };

      mockStripe.refunds.create.mockResolvedValue(refund);
      mockPrisma.refund.create.mockResolvedValue({
        id: 'refund-123',
        stripeRefundId: refund.id,
        amount: 2999,
        reason: 'requested_by_customer',
        status: 'SUCCEEDED',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await stripeService.createRefund({
        paymentIntentId: 'pi_test123',
        amount: 2999,
        reason: 'requested_by_customer'
      });

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 2999,
        reason: 'requested_by_customer'
      });
      expect(result.success).toBe(true);
    });

    it('should handle refund creation failure', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Payment not refundable'));

      const result = await stripeService.createRefund({
        paymentIntentId: 'pi_test123',
        amount: 2999,
        reason: 'requested_by_customer'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create refund');
    });
  });

  describe('webhook handling', () => {
    it('should verify webhook signature', () => {
      const payload = JSON.stringify({ type: 'invoice.payment_succeeded' });
      const signature = 'test_signature';
      const event = { type: 'invoice.payment_succeeded' };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const result = stripeService.verifyWebhook(payload, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      expect(result).toEqual(event);
    });

    it('should handle invalid webhook signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => stripeService.verifyWebhook('payload', 'invalid_sig')).toThrow(
        'Invalid signature'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Network timeout'));

      const result = await stripeService.createCustomer({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create customer');
    });

    it('should handle missing environment variables', () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => new StripeService()).toThrow('Stripe secret key is required');

      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it('should validate input parameters', async () => {
      const result = await stripeService.createCustomer({
        userId: '',
        email: 'invalid-email',
        name: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });
});
