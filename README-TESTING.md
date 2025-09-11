# Astral Core v7 - Comprehensive Testing Guide

This document provides a complete guide to the testing infrastructure for Astral Core v7, including unit tests, integration tests, and end-to-end (E2E) tests.

## Testing Overview

Our testing strategy covers three main areas:
- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test interactions between different parts of the system
- **E2E Tests**: Test complete user journeys through the application

### Test Coverage Goals

- **Minimum Coverage**: 30% across all metrics (lines, functions, branches, statements)
- **Critical Paths**: 80%+ coverage for authentication, payments, crisis management, and data protection
- **New Features**: 100% test coverage required

## Test Structure

```
tests/
├── setup/                     # Test configuration and setup
│   ├── integration-setup.ts   # Integration test setup
│   ├── e2e-setup.ts           # E2E test configuration
│   ├── global-setup.ts        # Global Playwright setup
│   └── global-teardown.ts     # Global Playwright teardown
├── utils/                     # Test utilities and helpers
│   ├── test-fixtures.ts       # Mock data and fixtures
│   └── test-helpers.ts        # Helper functions and utilities
├── integration/               # Integration test suites
│   ├── auth-workflow.test.ts  # Authentication workflows
│   └── payment-workflow.test.ts # Payment processing workflows
├── e2e/                       # End-to-end test suites
│   ├── user-registration.spec.ts # User registration flow
│   └── crisis-management.spec.ts # Crisis management flow
├── auth-states/               # Saved authentication states
├── screenshots/               # Test screenshots
└── fixtures/                  # Test files and data

src/
├── lib/
│   ├── auth/__tests__/        # Authentication unit tests
│   ├── services/__tests__/    # Service layer unit tests
│   └── security/__tests__/    # Security module unit tests
└── store/__tests__/           # State management unit tests
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run unit tests with watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth-config.test.ts

# Debug unit tests
npm run test:debug
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run integration tests with coverage
npm run test:integration -- --coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with browser UI
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests for specific browser
npx playwright test --project=chromium
```

### Run All Tests
```bash
# Run complete test suite
npm run test:all

# Run tests for CI/CD
npm run test:ci
```

## Test Categories

### 1. Unit Tests

#### Authentication Tests
- **Location**: `src/lib/auth/__tests__/`
- **Coverage**: NextAuth configuration, credential validation, session management
- **Key Files**:
  - `auth-config.test.ts`: NextAuth configuration and providers
  - `auth-utils.test.ts`: Authentication utility functions

#### Payment Processing Tests
- **Location**: `src/lib/services/__tests__/`
- **Coverage**: Stripe integration, payment workflows, subscription management
- **Key Files**:
  - `stripe-service.test.ts`: Comprehensive Stripe service testing

#### Crisis Management Tests
- **Location**: `src/store/__tests__/`
- **Coverage**: Crisis assessment state, intervention workflows
- **Key Files**:
  - `useCrisisStore.test.ts`: Crisis state management testing

#### Data Protection Tests
- **Location**: `src/lib/security/__tests__/`
- **Coverage**: PHI encryption, access control, HIPAA compliance
- **Key Files**:
  - `phi-service.test.ts`: Protected Health Information handling

#### MFA Tests
- **Location**: `src/lib/services/__tests__/`
- **Coverage**: Multi-factor authentication setup and verification
- **Key Files**:
  - `mfa-service.test.ts`: MFA service functionality

### 2. Integration Tests

#### Authentication Workflow
- **File**: `tests/integration/auth-workflow.test.ts`
- **Coverage**: Complete authentication flows including registration, login, MFA, password reset
- **Database**: Uses test database with real Prisma operations

#### Payment Workflow  
- **File**: `tests/integration/payment-workflow.test.ts`
- **Coverage**: End-to-end payment processing including customer creation, subscriptions, refunds
- **External Services**: Mocked Stripe API calls

### 3. E2E Tests

#### User Registration
- **File**: `tests/e2e/user-registration.spec.ts`
- **Coverage**: Complete user registration and onboarding flows
- **User Types**: Client and therapist registration paths

#### Crisis Management
- **File**: `tests/e2e/crisis-management.spec.ts`
- **Coverage**: Crisis assessment flows, risk levels, interventions
- **Critical Path**: Ensures crisis features work end-to-end

## Test Utilities and Fixtures

### Test Fixtures (`tests/utils/test-fixtures.ts`)
Provides consistent mock data for all tests:
- User fixtures for different roles
- Profile and client data
- Payment and subscription mocks
- Crisis assessment data
- API response templates

### Test Helpers (`tests/utils/test-helpers.ts`)
Common testing utilities:
- Mock HTTP requests and responses
- Database setup and teardown
- Authentication state management
- Test environment configuration

## Environment Configuration

### Test Environment Variables
```bash
NODE_ENV=test
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_123
STRIPE_WEBHOOK_SECRET=whsec_test_123
ENCRYPTION_KEY=test-encryption-key-32-characters
DATABASE_URL=postgresql://test:test@localhost:5432/testdb
```

### Database Setup
Integration tests use a separate test database:
1. Create test database: `astral_test`
2. Run migrations: `npx prisma migrate dev`
3. Seed test data as needed

## Coverage Reports

Test coverage reports are generated in multiple formats:
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **Text**: Console output during test runs

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 30,
    functions: 30,
    lines: 30,
    statements: 30
  }
}
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:e2e
```

### Pre-commit Hooks
Tests run automatically before commits:
```bash
npx husky add .husky/pre-commit "npm run test:ci"
```

## Best Practices

### Writing Unit Tests
1. **Isolation**: Mock all external dependencies
2. **Descriptive Names**: Use clear test descriptions
3. **AAA Pattern**: Arrange, Act, Assert
4. **Edge Cases**: Test error conditions and boundaries
5. **Coverage**: Aim for high coverage of critical paths

### Writing Integration Tests
1. **Real Database**: Use actual database operations
2. **Transaction Rollback**: Clean up after each test
3. **End-to-End Flows**: Test complete user workflows
4. **External Service Mocks**: Mock third-party APIs

### Writing E2E Tests
1. **User Perspective**: Test from user's point of view
2. **Page Objects**: Use page object model for maintainability
3. **Data Attributes**: Use `data-testid` for selectors
4. **Accessibility**: Include accessibility testing
5. **Mobile Testing**: Test responsive designs

## Debugging Tests

### Unit Test Debugging
```bash
# Run specific test with debugging
npm run test:debug -- --testNamePattern="should authenticate user"

# Run with verbose output
npm test -- --verbose auth-config.test.ts
```

### Integration Test Debugging
```bash
# Run with database logging
DEBUG=prisma* npm run test:integration

# Run specific integration test
npm run test:integration -- auth-workflow.test.ts
```

### E2E Test Debugging
```bash
# Run with browser UI
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific E2E test
npx playwright test user-registration.spec.ts --debug
```

## Test Data Management

### Mock Data Strategy
- **Consistent IDs**: Use predictable IDs for testing
- **Realistic Data**: Use data that resembles production
- **Edge Cases**: Include boundary conditions
- **Privacy**: Never use real user data

### Database State Management
- **Clean Slate**: Each test starts with clean state
- **Isolation**: Tests don't affect each other
- **Transactions**: Use database transactions for rollback
- **Seeding**: Consistent test data setup

## Security Testing

### Authentication Security
- Password validation and hashing
- Session management and expiration
- MFA implementation
- Account lockout mechanisms

### Data Protection Testing
- PHI encryption and decryption
- Access control validation
- Audit logging verification
- GDPR compliance (data export/deletion)

### Payment Security Testing
- Stripe webhook validation
- PCI compliance verification
- Payment data encryption
- Refund process validation

## Performance Testing

### Unit Test Performance
- Tests should complete within 2 seconds
- Mock external dependencies
- Optimize database queries in tests

### Integration Test Performance
- Database operations should be efficient
- Use connection pooling
- Clean up resources properly

### E2E Test Performance
- Page load times under 3 seconds
- Efficient element selection
- Parallel test execution

## Maintenance

### Updating Tests
- Update tests when features change
- Maintain test data consistency
- Review and update mocks regularly
- Clean up unused test files

### Test Infrastructure
- Update testing dependencies regularly
- Monitor test performance
- Review coverage reports
- Maintain CI/CD pipelines

## Troubleshooting

### Common Issues

#### Jest Issues
- **Module resolution**: Check `moduleNameMapper` in jest.config.js
- **Async operations**: Ensure proper async/await usage
- **Memory leaks**: Use `--detectOpenHandles` flag

#### Playwright Issues
- **Element not found**: Use proper waiting strategies
- **Authentication**: Verify auth state files
- **Timeouts**: Increase timeout values for slow operations

#### Database Issues
- **Connection errors**: Verify test database configuration
- **Migration errors**: Ensure test database is up to date
- **Data conflicts**: Check test isolation and cleanup

### Getting Help

1. Check test output and error messages
2. Review this documentation
3. Check existing test examples
4. Consult team members
5. Review testing library documentation

## Conclusion

This comprehensive testing infrastructure ensures the reliability, security, and performance of Astral Core v7. By following these guidelines and maintaining good testing practices, we can deliver a robust mental health platform that users can trust with their sensitive data and critical needs.