# Payment Integration Examples

This document provides comprehensive examples for implementing payment processing and subscription management using the Astral Core v7 API with Stripe integration.

## Table of Contents

1. [Subscription Management](#subscription-management)
2. [Payment Methods](#payment-methods)
3. [Webhook Handling](#webhook-handling)
4. [Billing Operations](#billing-operations)
5. [Error Handling](#error-handling)
6. [Testing Scenarios](#testing-scenarios)

## Subscription Management

### Creating a Subscription

```javascript
// Create a new subscription for therapy plans
const createSubscription = async (planId, paymentMethodId = null, couponCode = null) => {
  try {
    const response = await fetch('/api/payments/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        therapyPlanId: planId,
        paymentMethodId: paymentMethodId,
        couponCode: couponCode
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        subscription: result.subscription,
        setupIntent: result.setupIntent, // Present if payment setup required
        message: result.message
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Subscription creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Usage examples for different scenarios
const subscriptionExamples = {
  // With existing payment method
  async withPaymentMethod() {
    const result = await createSubscription(
      'plan_therapy_basic',
      'pm_1234567890',
      'SAVE20'
    );

    if (result.success) {
      console.log('Subscription created:', result.subscription);
      // Subscription should be immediately active
      if (result.subscription.status === 'ACTIVE') {
        redirectToDashboard();
      }
    } else {
      handleSubscriptionError(result.error);
    }
  },

  // Without payment method (requires setup)
  async requiresPaymentSetup() {
    const result = await createSubscription('plan_therapy_premium');

    if (result.success && result.setupIntent) {
      // Need to collect payment method
      await handlePaymentMethodSetup(result.setupIntent);
    } else if (result.success) {
      // Subscription created successfully
      redirectToDashboard();
    } else {
      handleSubscriptionError(result.error);
    }
  }
};
```

### Payment Method Setup Flow

```javascript
// Handle payment method setup with Stripe Elements
import { loadStripe } from '@stripe/stripe-js';

const PaymentSetupForm = ({ setupIntent, onComplete }) => {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);

      if (stripeInstance && setupIntent) {
        const elementsInstance = stripeInstance.elements({
          clientSecret: setupIntent.clientSecret
        });
        setElements(elementsInstance);
      }
    };

    initializeStripe();
  }, [setupIntent]);

  const handleSetupSubmit = async (event) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet');
      setIsProcessing(false);
      return;
    }

    const cardElement = elements.getElement('card');

    try {
      // Confirm setup intent
      const { error: confirmError, setupIntent: confirmedSetupIntent } = 
        await stripe.confirmCardSetup(setupIntent.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Customer Name',
              email: 'customer@example.com'
            }
          }
        });

      if (confirmError) {
        setError(confirmError.message);
        setIsProcessing(false);
        return;
      }

      if (confirmedSetupIntent.status === 'succeeded') {
        // Payment method setup successful
        console.log('Payment method setup successful:', confirmedSetupIntent.payment_method);
        
        // The webhook will handle updating the subscription
        onComplete?.({
          success: true,
          paymentMethod: confirmedSetupIntent.payment_method
        });
      }
    } catch (error) {
      console.error('Setup intent confirmation failed:', error);
      setError('Payment setup failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!stripe || !elements) {
    return <div>Loading payment form...</div>;
  }

  return (
    <form onSubmit={handleSetupSubmit}>
      <div className="payment-form">
        <h3>Setup Payment Method</h3>
        <p>Complete your subscription by adding a payment method.</p>
        
        <div className="card-element-container">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isProcessing}
          className="setup-button"
        >
          {isProcessing ? 'Processing...' : 'Complete Setup'}
        </button>
      </div>
    </form>
  );
};
```

### Subscription Management Operations

```javascript
// Comprehensive subscription management
const SubscriptionManager = {
  // Get current subscription
  async getCurrentSubscription() {
    try {
      const response = await fetch('/api/payments/subscriptions', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          subscription: result.subscription
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return {
        success: false,
        error: 'Failed to fetch subscription'
      };
    }
  },

  // Update subscription plan
  async updateSubscription(newPlanId, prorationBehavior = 'create_prorations') {
    try {
      const response = await fetch('/api/payments/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          newTherapyPlanId: newPlanId,
          prorationBehavior: prorationBehavior
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          subscription: result.subscription,
          message: result.message
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Subscription update failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true, reason = null) {
    try {
      const response = await fetch('/api/payments/subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          cancelAtPeriodEnd: cancelAtPeriodEnd,
          cancellationReason: reason
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          subscription: result.subscription,
          message: result.message
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Reactivate subscription
  async reactivateSubscription(subscriptionId) {
    try {
      // Cancel the cancellation by updating the subscription
      const response = await fetch('/api/payments/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          action: 'reactivate',
          subscriptionId: subscriptionId
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          subscription: result.subscription,
          message: 'Subscription reactivated successfully'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Subscription reactivation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

## Payment Methods

### Payment Method Management

```javascript
// Payment method operations
const PaymentMethodManager = {
  // Get user's payment methods
  async getPaymentMethods() {
    try {
      const response = await fetch('/api/payments/payment-methods', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          paymentMethods: result.paymentMethods
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Add new payment method
  async addPaymentMethod(paymentMethodId, setAsDefault = false) {
    try {
      const response = await fetch('/api/payments/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethodId,
          setAsDefault: setAsDefault
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          paymentMethod: result.paymentMethod
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to add payment method:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Remove payment method
  async removePaymentMethod(paymentMethodId) {
    try {
      const response = await fetch(`/api/payments/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'Payment method removed successfully'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Set default payment method
  async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await fetch(`/api/payments/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'Default payment method updated'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// React component for payment method management
const PaymentMethodsList = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    const result = await PaymentMethodManager.getPaymentMethods();
    
    if (result.success) {
      setPaymentMethods(result.paymentMethods);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleRemovePaymentMethod = async (paymentMethodId) => {
    const confirmRemove = window.confirm('Are you sure you want to remove this payment method?');
    
    if (confirmRemove) {
      const result = await PaymentMethodManager.removePaymentMethod(paymentMethodId);
      
      if (result.success) {
        await loadPaymentMethods(); // Reload list
        showSuccessMessage('Payment method removed successfully');
      } else {
        showErrorMessage(result.error);
      }
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    const result = await PaymentMethodManager.setDefaultPaymentMethod(paymentMethodId);
    
    if (result.success) {
      await loadPaymentMethods(); // Reload list
      showSuccessMessage('Default payment method updated');
    } else {
      showErrorMessage(result.error);
    }
  };

  if (loading) {
    return <div>Loading payment methods...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="payment-methods-list">
      <h3>Payment Methods</h3>
      
      {paymentMethods.length === 0 ? (
        <div className="no-payment-methods">
          <p>No payment methods found.</p>
          <button onClick={() => setShowAddForm(true)}>
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="payment-methods">
          {paymentMethods.map((pm) => (
            <div key={pm.id} className={`payment-method ${pm.isDefault ? 'default' : ''}`}>
              <div className="payment-method-info">
                <div className="card-info">
                  <span className="card-brand">{pm.card.brand.toUpperCase()}</span>
                  <span className="card-last4">**** {pm.card.last4}</span>
                  <span className="card-expiry">{pm.card.expMonth}/{pm.card.expYear}</span>
                </div>
                {pm.isDefault && <span className="default-badge">Default</span>}
              </div>
              
              <div className="payment-method-actions">
                {!pm.isDefault && (
                  <button 
                    onClick={() => handleSetDefault(pm.id)}
                    className="set-default-btn"
                  >
                    Set as Default
                  </button>
                )}
                
                <button 
                  onClick={() => handleRemovePaymentMethod(pm.id)}
                  className="remove-btn"
                  disabled={pm.isDefault && paymentMethods.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Webhook Handling

### Processing Stripe Webhooks

```javascript
// Client-side webhook event handling (for real-time updates)
const WebhookEventHandler = {
  // Initialize webhook listener
  initialize() {
    // Listen for server-sent events from our webhook processor
    const eventSource = new EventSource('/api/payments/webhook/events');
    
    eventSource.onmessage = (event) => {
      const webhookEvent = JSON.parse(event.data);
      this.handleWebhookEvent(webhookEvent);
    };

    eventSource.onerror = (error) => {
      console.error('Webhook event stream error:', error);
    };

    return eventSource;
  },

  // Handle different webhook event types
  handleWebhookEvent(event) {
    console.log('Received webhook event:', event.type);

    switch (event.type) {
      case 'customer.subscription.updated':
        this.handleSubscriptionUpdated(event.data);
        break;

      case 'customer.subscription.deleted':
        this.handleSubscriptionCanceled(event.data);
        break;

      case 'invoice.payment_succeeded':
        this.handlePaymentSucceeded(event.data);
        break;

      case 'invoice.payment_failed':
        this.handlePaymentFailed(event.data);
        break;

      case 'payment_method.attached':
        this.handlePaymentMethodAdded(event.data);
        break;

      case 'customer.subscription.trial_will_end':
        this.handleTrialEnding(event.data);
        break;

      default:
        console.log('Unhandled webhook event:', event.type);
    }
  },

  // Handle subscription updates
  handleSubscriptionUpdated(subscription) {
    // Update UI to reflect subscription changes
    const subscriptionStatus = subscription.status;
    
    switch (subscriptionStatus) {
      case 'active':
        showNotification('Your subscription is now active!', 'success');
        updateSubscriptionUI(subscription);
        break;

      case 'past_due':
        showNotification('Your payment is past due. Please update your payment method.', 'warning');
        showPaymentUpdatePrompt();
        break;

      case 'canceled':
        showNotification('Your subscription has been canceled.', 'info');
        updateSubscriptionUI(subscription);
        break;

      case 'incomplete':
        showNotification('Please complete your payment setup.', 'warning');
        showPaymentSetupPrompt();
        break;
    }
  },

  // Handle subscription cancellation
  handleSubscriptionCanceled(subscription) {
    showNotification('Your subscription has been canceled.', 'info');
    
    // Update UI to reflect cancellation
    updateSubscriptionUI({
      ...subscription,
      status: 'canceled',
      canceledAt: new Date().toISOString()
    });

    // Show reactivation option if applicable
    if (subscription.cancelAt) {
      showReactivationOption(subscription);
    }
  },

  // Handle successful payment
  handlePaymentSucceeded(invoice) {
    const amount = (invoice.amount_paid / 100).toFixed(2);
    showNotification(`Payment of $${amount} processed successfully!`, 'success');
    
    // Update billing history
    updateBillingHistory(invoice);
    
    // If this was a past due payment, update subscription status
    if (invoice.subscription) {
      refreshSubscriptionStatus();
    }
  },

  // Handle failed payment
  handlePaymentFailed(invoice) {
    const amount = (invoice.amount_due / 100).toFixed(2);
    showNotification(`Payment of $${amount} failed. Please update your payment method.`, 'error');
    
    // Show payment retry options
    showPaymentRetryOptions({
      invoiceId: invoice.id,
      amount: amount,
      dueDate: invoice.due_date
    });

    // Update subscription status if needed
    if (invoice.subscription) {
      markSubscriptionPastDue(invoice.subscription);
    }
  },

  // Handle payment method added
  handlePaymentMethodAdded(paymentMethod) {
    showNotification('Payment method added successfully!', 'success');
    
    // Refresh payment methods list
    refreshPaymentMethods();
    
    // If this was for a pending subscription, check if we can activate it
    checkPendingSubscriptions();
  },

  // Handle trial ending notification
  handleTrialEnding(subscription) {
    const daysLeft = Math.ceil(
      (new Date(subscription.trial_end * 1000) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    showNotification(
      `Your trial ends in ${daysLeft} days. Add a payment method to continue.`,
      'warning'
    );
    
    // Show payment method setup prompt
    showTrialEndingPrompt(subscription);
  }
};

// Utility functions for UI updates
const UIUpdateHelpers = {
  updateSubscriptionUI(subscription) {
    const subscriptionElement = document.getElementById('subscription-status');
    if (subscriptionElement) {
      subscriptionElement.innerHTML = this.generateSubscriptionHTML(subscription);
    }
  },

  generateSubscriptionHTML(subscription) {
    const statusColor = {
      'active': 'green',
      'trialing': 'blue',
      'past_due': 'orange',
      'canceled': 'red',
      'incomplete': 'yellow'
    };

    return `
      <div class="subscription-status ${subscription.status}">
        <h3>Subscription Status: 
          <span style="color: ${statusColor[subscription.status]}">
            ${subscription.status.toUpperCase()}
          </span>
        </h3>
        <p>Plan: ${subscription.planName}</p>
        <p>Amount: $${subscription.amount.toFixed(2)}/${subscription.interval}</p>
        ${subscription.currentPeriodEnd ? 
          `<p>Next billing: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>` : 
          ''
        }
        ${subscription.cancelAt ? 
          `<p>Cancels on: ${new Date(subscription.cancelAt).toLocaleDateString()}</p>` : 
          ''
        }
      </div>
    `;
  },

  showPaymentRetryOptions(invoice) {
    const retryModal = document.createElement('div');
    retryModal.className = 'payment-retry-modal';
    retryModal.innerHTML = `
      <div class="modal-content">
        <h3>Payment Failed</h3>
        <p>Your payment of $${invoice.amount} was unsuccessful.</p>
        <p>Due date: ${new Date(invoice.dueDate * 1000).toLocaleDateString()}</p>
        
        <div class="retry-options">
          <button onclick="retryPaymentWithSameMethod('${invoice.invoiceId}')">
            Retry with Same Payment Method
          </button>
          <button onclick="updatePaymentMethodAndRetry('${invoice.invoiceId}')">
            Update Payment Method
          </button>
          <button onclick="contactSupport()">
            Contact Support
          </button>
        </div>
        
        <button onclick="closeModal()" class="close-btn">×</button>
      </div>
    `;
    
    document.body.appendChild(retryModal);
  },

  showTrialEndingPrompt(subscription) {
    const prompt = document.createElement('div');
    prompt.className = 'trial-ending-prompt';
    prompt.innerHTML = `
      <div class="prompt-content">
        <h3>Trial Ending Soon</h3>
        <p>Your ${subscription.planName} trial ends on 
           ${new Date(subscription.trial_end * 1000).toLocaleDateString()}
        </p>
        <p>Add a payment method to continue your subscription without interruption.</p>
        
        <div class="prompt-actions">
          <button onclick="setupPaymentMethod()">
            Add Payment Method
          </button>
          <button onclick="viewPlans()">
            View Plans
          </button>
          <button onclick="dismissPrompt()" class="dismiss-btn">
            Dismiss
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(prompt);
  }
};
```

### Webhook Security Validation

```javascript
// Server-side webhook validation (example middleware)
const validateStripeWebhook = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  const payload = req.body;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    // Stripe validates the webhook signature
    const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    req.stripeEvent = event;
    next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    res.status(400).json({ error: 'Invalid webhook signature' });
  }
};

// Webhook processing with idempotency
const processWebhookWithIdempotency = async (event) => {
  const eventId = event.id;
  
  // Check if we've already processed this event
  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    console.log(`Event ${eventId} already processed, skipping`);
    return { success: true, skipped: true };
  }

  try {
    // Process the event
    const result = await processWebhookEvent(event);
    
    // Mark event as processed
    await WebhookEvent.create({
      eventId: eventId,
      eventType: event.type,
      processedAt: new Date(),
      result: result
    });

    return result;
  } catch (error) {
    console.error(`Error processing webhook event ${eventId}:`, error);
    
    // Mark event as failed
    await WebhookEvent.create({
      eventId: eventId,
      eventType: event.type,
      processedAt: new Date(),
      error: error.message,
      failed: true
    });

    throw error;
  }
};
```

## Billing Operations

### Invoice Management

```javascript
// Invoice operations
const InvoiceManager = {
  // Get user invoices
  async getInvoices(limit = 10, offset = 0) {
    try {
      const response = await fetch(`/api/payments/invoices?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          invoices: result.invoices,
          total: result.total,
          hasMore: result.hasMore
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get specific invoice
  async getInvoice(invoiceId) {
    try {
      const response = await fetch(`/api/payments/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          invoice: result.invoice
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Download invoice PDF
  async downloadInvoicePDF(invoiceId) {
    try {
      const result = await this.getInvoice(invoiceId);
      
      if (result.success && result.invoice.pdfUrl) {
        // Open PDF in new tab
        window.open(result.invoice.pdfUrl, '_blank');
        return { success: true };
      } else {
        throw new Error('Invoice PDF not available');
      }
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Pay outstanding invoice
  async payInvoice(invoiceId, paymentMethodId) {
    try {
      const response = await fetch(`/api/payments/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethodId
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          invoice: result.invoice,
          paymentIntent: result.paymentIntent
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to pay invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// React component for invoice list
const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async (resetList = true) => {
    setLoading(true);
    const currentOffset = resetList ? 0 : offset;
    
    const result = await InvoiceManager.getInvoices(10, currentOffset);
    
    if (result.success) {
      if (resetList) {
        setInvoices(result.invoices);
      } else {
        setInvoices(prev => [...prev, ...result.invoices]);
      }
      setHasMore(result.hasMore);
      setOffset(currentOffset + result.invoices.length);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const loadMoreInvoices = () => {
    loadInvoices(false);
  };

  const handlePayInvoice = async (invoiceId) => {
    // Show payment method selection modal
    const paymentMethodId = await selectPaymentMethod();
    
    if (paymentMethodId) {
      const result = await InvoiceManager.payInvoice(invoiceId, paymentMethodId);
      
      if (result.success) {
        showSuccessMessage('Invoice paid successfully!');
        loadInvoices(); // Reload to show updated status
      } else {
        showErrorMessage(result.error);
      }
    }
  };

  const formatInvoiceStatus = (status) => {
    const statusColors = {
      'PAID': 'green',
      'OPEN': 'orange',
      'DRAFT': 'gray',
      'VOID': 'red',
      'UNCOLLECTIBLE': 'red'
    };

    return (
      <span 
        className="invoice-status" 
        style={{ color: statusColors[status] || 'black' }}
      >
        {status}
      </span>
    );
  };

  if (loading && invoices.length === 0) {
    return <div>Loading invoices...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="invoice-list">
      <h3>Billing History</h3>
      
      {invoices.length === 0 ? (
        <div className="no-invoices">
          <p>No invoices found.</p>
        </div>
      ) : (
        <>
          <div className="invoices">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="invoice-item">
                <div className="invoice-header">
                  <span className="invoice-number">#{invoice.number}</span>
                  {formatInvoiceStatus(invoice.status)}
                </div>
                
                <div className="invoice-details">
                  <div className="invoice-amount">
                    <strong>${invoice.total.toFixed(2)}</strong>
                    <small> {invoice.currency.toUpperCase()}</small>
                  </div>
                  
                  <div className="invoice-dates">
                    <div>Created: {new Date(invoice.createdAt).toLocaleDateString()}</div>
                    {invoice.dueDate && (
                      <div>Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                    )}
                    {invoice.paidAt && (
                      <div>Paid: {new Date(invoice.paidAt).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>

                <div className="invoice-actions">
                  {invoice.pdfUrl && (
                    <button onClick={() => InvoiceManager.downloadInvoicePDF(invoice.id)}>
                      Download PDF
                    </button>
                  )}
                  
                  {invoice.status === 'OPEN' && (
                    <button 
                      onClick={() => handlePayInvoice(invoice.id)}
                      className="pay-button"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button 
              onClick={loadMoreInvoices}
              disabled={loading}
              className="load-more-btn"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
};
```

This comprehensive payment integration documentation provides detailed examples for subscription management, payment methods, webhook handling, and billing operations. The examples demonstrate real-world implementation patterns for integrating Stripe payments with the Astral Core v7 mental health platform.