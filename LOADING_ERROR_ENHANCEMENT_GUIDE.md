# Loading States & Error Boundaries Enhancement Guide

This document outlines the comprehensive loading states and error boundaries added to Astral Core v7.

## 🚀 What's New

### Enhanced Loading Components

1. **SkeletonLoader.tsx** - Smart skeleton loading states
2. **LoadingStates.tsx** - Comprehensive loading indicators
3. **Enhanced ErrorBoundary.tsx** - Retry mechanisms and better UX
4. **ErrorDisplay.tsx** - Consistent error messaging
5. **useErrorHandling.ts** - Error handling hook

### Key Improvements

- ✅ Skeleton loaders for data-heavy components
- ✅ Progress bars for payment processing
- ✅ Retry mechanisms for failed operations
- ✅ User-friendly error messages
- ✅ Form submission loading states
- ✅ Dashboard-specific loading enhancements
- ✅ Network error recovery
- ✅ Validation error displays

## 📦 Component Usage

### Skeleton Loaders

```tsx
import { DashboardCardSkeleton, PaymentFormSkeleton, AppointmentListSkeleton } from '@/components/ui';

// Dashboard loading
<DashboardCardSkeleton />

// Payment form loading
<PaymentFormSkeleton />

// Appointment list loading
<AppointmentListSkeleton count={5} />
```

### Loading States

```tsx
import { LoadingSpinner, ProgressBar, LoadingOverlay } from '@/components/ui';

// Basic spinner
<LoadingSpinner size="lg" color="primary" />

// Progress bar for processes
<ProgressBar progress={progress} message="Processing payment..." />

// Overlay loading
<LoadingOverlay isLoading={loading} message="Saving...">
  <YourContent />
</LoadingOverlay>
```

### Enhanced Error Boundaries

```tsx
import { EnhancedErrorBoundary, withErrorBoundary } from '@/components/ui';

// Wrap components with error boundary
<EnhancedErrorBoundary
  enableRetry={true}
  maxRetries={3}
  context='PaymentForm'
  showErrorDetails={process.env.NODE_ENV === 'development'}
>
  <PaymentForm />
</EnhancedErrorBoundary>;

// Or use HOC
const SafePaymentForm = withErrorBoundary(PaymentForm, {
  enableRetry: true,
  context: 'PaymentForm'
});
```

### Error Display Components

```tsx
import { ErrorDisplay, NetworkError, ValidationError } from '@/components/ui';

// Custom error display
<ErrorDisplay
  error="Failed to load data"
  title="Loading Error"
  onRetry={handleRetry}
  isRetrying={isRetrying}
/>

// Network error
<NetworkError onRetry={handleRetry} isRetrying={isRetrying} />

// Validation errors
<ValidationError errors={{ email: 'Invalid email format' }} />
```

## 🪝 Hooks Usage

### useErrorHandling

```tsx
import { useErrorHandling } from '@/components/ui';

const MyComponent = () => {
  const { error, isRetrying, canRetry, handleError, retry, clearError } = useErrorHandling({
    maxRetries: 3,
    context: 'MyComponent'
  });

  const fetchData = async () => {
    try {
      const data = await api.getData();
      return data;
    } catch (error) {
      handleError(error);
    }
  };

  const handleRetry = () => retry(fetchData);

  return (
    <div>
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={canRetry ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      )}
    </div>
  );
};
```

### useAsyncOperation

```tsx
import { useAsyncOperation } from '@/components/ui';

const DataComponent = () => {
  const { data, isLoading, error, execute, retry } = useAsyncOperation({
    context: 'DataComponent',
    onSuccess: data => console.log('Data loaded:', data)
  });

  useEffect(() => {
    execute(() => api.fetchData());
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;

  return <DataDisplay data={data} />;
};
```

### useFormSubmission

```tsx
import { useFormSubmission } from '@/components/ui';

const FormComponent = () => {
  const { isSubmitting, isSuccess, error, submit } = useFormSubmission({
    context: 'ContactForm',
    onSuccess: () => router.push('/success')
  });

  const handleSubmit = formData => {
    submit(() => api.submitForm(formData));
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorDisplay error={error} />}
      {isSuccess && <SuccessDisplay message='Form submitted successfully!' />}

      <Button isLoading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};
```

## 🎯 Enhanced Components

### ClientDashboard

- ✅ Separate loading states for wellness and appointments data
- ✅ Individual error handling and retry mechanisms
- ✅ Skeleton loaders during initial load
- ✅ Error states with retry buttons

### PaymentForm

- ✅ Progress bar showing payment steps
- ✅ Form validation with inline error messages
- ✅ Stripe loading skeleton
- ✅ Payment processing states
- ✅ Success/failure handling with user feedback

### WellnessPage

- ✅ Full-page loading for initial data fetch
- ✅ Form submission loading overlay
- ✅ Unsaved changes warning
- ✅ Enhanced error boundaries
- ✅ Retry mechanisms for failed operations

### BillingDashboard

- ✅ Skeleton loading for billing summary
- ✅ Individual component error handling
- ✅ Retry functionality for failed data loads

## 🔄 Migration Guide

### Existing Components

Replace basic loading states:

```tsx
// Before
{
  loading && <div>Loading...</div>;
}

// After
{
  loading && <LoadingCard title='Loading Data' />;
}
```

Add error boundaries:

```tsx
// Before
<MyComponent />

// After
<EnhancedErrorBoundary context="MyComponent">
  <MyComponent />
</EnhancedErrorBoundary>
```

Enhance error handling:

```tsx
// Before
try {
  await operation();
} catch (error) {
  console.error(error);
}

// After
const { handleError, retry } = useErrorHandling();

try {
  await operation();
} catch (error) {
  handleError(error);
}
```

## 🎨 Theming Support

All components support dark mode and include proper color schemes:

- Light/dark mode compatibility
- Consistent color palette
- Accessible contrast ratios
- Responsive design

## 🧪 Testing Considerations

When testing components with enhanced loading/error states:

1. Test loading states by mocking delayed API responses
2. Test error states by mocking failed API calls
3. Test retry mechanisms by simulating network failures
4. Verify accessibility with screen readers
5. Test form validation and submission flows

## 🔧 Configuration

Global configuration can be set through environment variables:

- `NEXT_PUBLIC_MAX_RETRIES` - Default retry count
- `NEXT_PUBLIC_RETRY_DELAY` - Retry delay in milliseconds
- `NODE_ENV` - Controls error detail display

## 📋 Best Practices

1. **Always wrap async operations** with error boundaries
2. **Use specific loading states** instead of generic "Loading..."
3. **Provide retry mechanisms** for network-dependent operations
4. **Show progress** for long-running operations
5. **Validate forms** before submission
6. **Give user feedback** for all actions
7. **Handle offline states** gracefully
8. **Test error scenarios** thoroughly

## 🚨 Common Patterns

### API Call with Loading & Error Handling

```tsx
const { data, isLoading, error, execute, retry } = useAsyncOperation({
  context: 'APICall'
});

useEffect(() => {
  execute(() => fetch('/api/data').then(res => res.json()));
}, []);

return (
  <EnhancedErrorBoundary context='APICall'>
    {isLoading && <SkeletonLoader />}
    {error && <ErrorDisplay error={error} onRetry={retry} />}
    {data && <DataDisplay data={data} />}
  </EnhancedErrorBoundary>
);
```

### Form with Validation & Submission

```tsx
const { isSubmitting, error, submit } = useFormSubmission({
  validateBeforeSubmit: () => validateForm(formData)
});

return (
  <form
    onSubmit={e => {
      e.preventDefault();
      submit(() => api.submitForm(formData));
    }}
  >
    {error && <ErrorDisplay error={error} />}

    <LoadingOverlay isLoading={isSubmitting}>
      <Button isLoading={isSubmitting}>Submit</Button>
    </LoadingOverlay>
  </form>
);
```

This enhancement significantly improves the user experience by providing clear feedback during loading states and graceful error recovery throughout the application.
