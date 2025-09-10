-- CreateEnum
CREATE TYPE "public"."ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ErrorType" AS ENUM ('JAVASCRIPT', 'UNHANDLED_REJECTION', 'RESOURCE', 'NETWORK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."QueryOperation" AS ENUM ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'CREATE', 'DROP');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'THERAPIST', 'CLIENT', 'CRISIS_RESPONDER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."MfaMethod" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCHARGED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."CrisisSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."InterventionType" AS ENUM ('CALL', 'CHAT', 'VIDEO', 'IN_PERSON', 'REFERRAL', 'EMERGENCY_DISPATCH');

-- CreateEnum
CREATE TYPE "public"."InterventionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ESCALATED', 'REFERRED', 'FOLLOWUP_NEEDED');

-- CreateEnum
CREATE TYPE "public"."AppointmentType" AS ENUM ('INITIAL_CONSULTATION', 'THERAPY_SESSION', 'FOLLOW_UP', 'CRISIS_SESSION', 'GROUP_SESSION', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('DIRECT', 'GROUP', 'THERAPY', 'CRISIS', 'SUPPORT_GROUP');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('DIRECT', 'BROADCAST', 'SYSTEM', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "public"."MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('APPOINTMENT', 'MESSAGE', 'CRISIS', 'SYSTEM', 'WELLNESS', 'MEDICATION', 'SESSION', 'ACHIEVEMENT', 'GROUP', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('CONSENT_FORM', 'INSURANCE', 'MEDICAL_RECORD', 'SESSION_NOTE', 'ASSESSMENT', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'ACH', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlanType" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'FAMILY', 'GROUP', 'ENTERPRISE', 'THERAPY_PACKAGE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'UNCOLLECTIBLE', 'VOID');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'REQUIRES_CAPTURE', 'CANCELED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME', 'SESSION_PAYMENT', 'SETUP_FEE', 'LATE_FEE', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."RefundReason" AS ENUM ('DUPLICATE', 'FRAUDULENT', 'REQUESTED_BY_CUSTOMER', 'EXPIRED_UNCAPTURED_CHARGE');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT[],
    "mfaMethod" "public"."MfaMethod",
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaPhone" TEXT,
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "emergencyContact" JSONB,
    "medicalHistory" JSONB,
    "medications" JSONB,
    "allergies" JSONB,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TherapistProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "specializations" TEXT[],
    "education" JSONB[],
    "certifications" JSONB[],
    "yearsOfExperience" INTEGER NOT NULL,
    "bio" TEXT,
    "acceptingClients" BOOLEAN NOT NULL DEFAULT true,
    "maxClients" INTEGER NOT NULL DEFAULT 50,
    "currentClients" INTEGER NOT NULL DEFAULT 0,
    "availableHours" JSONB,
    "hourlyRate" DOUBLE PRECISION,
    "insuranceAccepted" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "therapistId" TEXT,
    "intakeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryConcerns" TEXT[],
    "goals" TEXT[],
    "riskLevel" "public"."RiskLevel" NOT NULL DEFAULT 'LOW',
    "consentForms" JSONB,
    "insuranceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrisisIntervention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "severity" "public"."CrisisSeverity" NOT NULL,
    "triggerEvent" TEXT,
    "symptoms" TEXT[],
    "interventionType" "public"."InterventionType" NOT NULL,
    "status" "public"."InterventionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "outcome" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT true,
    "followUpDate" TIMESTAMP(3),
    "responderNotes" TEXT,
    "resourcesProvided" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrisisIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WellnessData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moodScore" INTEGER NOT NULL,
    "anxietyLevel" INTEGER NOT NULL,
    "stressLevel" INTEGER NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "exercise" BOOLEAN NOT NULL DEFAULT false,
    "exerciseMinutes" INTEGER,
    "meditation" BOOLEAN NOT NULL DEFAULT false,
    "meditationMinutes" INTEGER,
    "socialContact" BOOLEAN NOT NULL DEFAULT false,
    "medications" TEXT[],
    "symptoms" TEXT[],
    "triggers" TEXT[],
    "copingStrategies" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "tags" TEXT[],
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "type" "public"."AppointmentType" NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "meetingUrl" TEXT,
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "rescheduledFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SessionNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT NOT NULL,
    "presentingIssues" TEXT[],
    "interventions" TEXT[],
    "clientResponse" TEXT,
    "homework" TEXT,
    "riskAssessment" JSONB,
    "planForNext" TEXT,
    "additionalNotes" TEXT,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TreatmentPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "diagnosis" TEXT[],
    "goals" JSONB[],
    "objectives" JSONB[],
    "interventions" JSONB[],
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "reportPeriod" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "goalsProgress" JSONB[],
    "challenges" TEXT[],
    "achievements" TEXT[],
    "recommendations" TEXT[],
    "nextSteps" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "type" "public"."ConversationType" NOT NULL DEFAULT 'DIRECT',
    "title" TEXT,
    "lastMessage" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRead" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "attachments" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "appointments" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "wellness" BOOLEAN NOT NULL DEFAULT true,
    "crisis" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'support',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "maxMembers" INTEGER NOT NULL DEFAULT 20,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "category" "public"."FileCategory" NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "address" JSONB,
    "taxId" TEXT,
    "defaultPaymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" "public"."PaymentMethodType" NOT NULL,
    "card" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "planType" "public"."SubscriptionPlanType" NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionItem" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "stripeItemId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "stripeInvoiceId" TEXT NOT NULL,
    "number" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "description" TEXT,
    "pdfUrl" TEXT,
    "hostedInvoiceUrl" TEXT,
    "paymentIntentId" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmount" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "proration" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "appointmentId" TEXT,
    "stripePaymentIntentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."PaymentStatus" NOT NULL,
    "type" "public"."PaymentType" NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "reason" "public"."RefundReason" NOT NULL DEFAULT 'REQUESTED_BY_CUSTOMER',
    "status" "public"."RefundStatus" NOT NULL,
    "receiptNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TherapyPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "sessionsIncluded" INTEGER NOT NULL DEFAULT 4,
    "duration" TEXT NOT NULL,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialPeriodDays" INTEGER,
    "setupFee" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerformanceMetric" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT NOT NULL,
    "clientIP" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "vitals" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ErrorMetric" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "filename" TEXT,
    "lineno" INTEGER,
    "colno" INTEGER,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "severity" "public"."ErrorSeverity" NOT NULL,
    "type" "public"."ErrorType" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QueryMetric" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "operation" "public"."QueryOperation" NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rows" INTEGER NOT NULL DEFAULT 0,
    "table" TEXT,
    "userId" TEXT,
    "endpoint" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "cached" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "public"."User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TherapistProfile_userId_key" ON "public"."TherapistProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TherapistProfile_licenseNumber_key" ON "public"."TherapistProfile"("licenseNumber");

-- CreateIndex
CREATE INDEX "TherapistProfile_userId_idx" ON "public"."TherapistProfile"("userId");

-- CreateIndex
CREATE INDEX "TherapistProfile_acceptingClients_idx" ON "public"."TherapistProfile"("acceptingClients");

-- CreateIndex
CREATE INDEX "ClientProfile_userId_idx" ON "public"."ClientProfile"("userId");

-- CreateIndex
CREATE INDEX "ClientProfile_therapistId_idx" ON "public"."ClientProfile"("therapistId");

-- CreateIndex
CREATE INDEX "ClientProfile_status_idx" ON "public"."ClientProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_therapistId_key" ON "public"."ClientProfile"("userId", "therapistId");

-- CreateIndex
CREATE INDEX "CrisisIntervention_userId_idx" ON "public"."CrisisIntervention"("userId");

-- CreateIndex
CREATE INDEX "CrisisIntervention_severity_idx" ON "public"."CrisisIntervention"("severity");

-- CreateIndex
CREATE INDEX "CrisisIntervention_status_idx" ON "public"."CrisisIntervention"("status");

-- CreateIndex
CREATE INDEX "CrisisIntervention_startTime_idx" ON "public"."CrisisIntervention"("startTime");

-- CreateIndex
CREATE INDEX "WellnessData_userId_idx" ON "public"."WellnessData"("userId");

-- CreateIndex
CREATE INDEX "WellnessData_date_idx" ON "public"."WellnessData"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WellnessData_userId_date_key" ON "public"."WellnessData"("userId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "public"."JournalEntry"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_createdAt_idx" ON "public"."JournalEntry"("createdAt");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "public"."Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_therapistId_idx" ON "public"."Appointment"("therapistId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "public"."Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionNote_appointmentId_key" ON "public"."SessionNote"("appointmentId");

-- CreateIndex
CREATE INDEX "SessionNote_clientId_idx" ON "public"."SessionNote"("clientId");

-- CreateIndex
CREATE INDEX "SessionNote_therapistId_idx" ON "public"."SessionNote"("therapistId");

-- CreateIndex
CREATE INDEX "SessionNote_sessionDate_idx" ON "public"."SessionNote"("sessionDate");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clientId_idx" ON "public"."TreatmentPlan"("clientId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_therapistId_idx" ON "public"."TreatmentPlan"("therapistId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_status_idx" ON "public"."TreatmentPlan"("status");

-- CreateIndex
CREATE INDEX "ProgressReport_clientId_idx" ON "public"."ProgressReport"("clientId");

-- CreateIndex
CREATE INDEX "ProgressReport_reportDate_idx" ON "public"."ProgressReport"("reportDate");

-- CreateIndex
CREATE INDEX "Conversation_lastActivity_idx" ON "public"."Conversation"("lastActivity");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "public"."ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "public"."ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "public"."Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt");

-- CreateIndex
CREATE INDEX "MessageReadReceipt_userId_idx" ON "public"."MessageReadReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReadReceipt_messageId_userId_key" ON "public"."MessageReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "public"."Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "public"."NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Group_type_idx" ON "public"."Group"("type");

-- CreateIndex
CREATE INDEX "Group_createdBy_idx" ON "public"."Group"("createdBy");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "public"."GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "public"."GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "public"."AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "public"."File"("userId");

-- CreateIndex
CREATE INDEX "File_category_idx" ON "public"."File"("category");

-- CreateIndex
CREATE INDEX "File_uploadedAt_idx" ON "public"."File"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "public"."Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeCustomerId_key" ON "public"."Customer"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Customer_userId_idx" ON "public"."Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_stripeCustomerId_idx" ON "public"."Customer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "public"."PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_customerId_idx" ON "public"."PaymentMethod"("customerId");

-- CreateIndex
CREATE INDEX "PaymentMethod_stripePaymentMethodId_idx" ON "public"."PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "public"."Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_planType_idx" ON "public"."Subscription"("planType");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionItem_stripeItemId_key" ON "public"."SubscriptionItem"("stripeItemId");

-- CreateIndex
CREATE INDEX "SubscriptionItem_subscriptionId_idx" ON "public"."SubscriptionItem"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "public"."Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "public"."Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "public"."Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "Invoice_stripeInvoiceId_idx" ON "public"."Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "public"."Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "public"."Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_idx" ON "public"."Payment"("appointmentId");

-- CreateIndex
CREATE INDEX "Payment_stripePaymentIntentId_idx" ON "public"."Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "public"."Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_processedAt_idx" ON "public"."Payment"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "public"."Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "public"."Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_stripeRefundId_idx" ON "public"."Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "public"."Refund"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TherapyPlan_stripePriceId_key" ON "public"."TherapyPlan"("stripePriceId");

-- CreateIndex
CREATE INDEX "TherapyPlan_stripePriceId_idx" ON "public"."TherapyPlan"("stripePriceId");

-- CreateIndex
CREATE INDEX "TherapyPlan_isActive_idx" ON "public"."TherapyPlan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAddress_customerId_key" ON "public"."BillingAddress"("customerId");

-- CreateIndex
CREATE INDEX "BillingAddress_customerId_idx" ON "public"."BillingAddress"("customerId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_url_idx" ON "public"."PerformanceMetric"("url");

-- CreateIndex
CREATE INDEX "PerformanceMetric_timestamp_idx" ON "public"."PerformanceMetric"("timestamp");

-- CreateIndex
CREATE INDEX "PerformanceMetric_userId_idx" ON "public"."PerformanceMetric"("userId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_sessionId_idx" ON "public"."PerformanceMetric"("sessionId");

-- CreateIndex
CREATE INDEX "ErrorMetric_severity_idx" ON "public"."ErrorMetric"("severity");

-- CreateIndex
CREATE INDEX "ErrorMetric_type_idx" ON "public"."ErrorMetric"("type");

-- CreateIndex
CREATE INDEX "ErrorMetric_timestamp_idx" ON "public"."ErrorMetric"("timestamp");

-- CreateIndex
CREATE INDEX "ErrorMetric_userId_idx" ON "public"."ErrorMetric"("userId");

-- CreateIndex
CREATE INDEX "ErrorMetric_resolved_idx" ON "public"."ErrorMetric"("resolved");

-- CreateIndex
CREATE INDEX "QueryMetric_operation_idx" ON "public"."QueryMetric"("operation");

-- CreateIndex
CREATE INDEX "QueryMetric_duration_idx" ON "public"."QueryMetric"("duration");

-- CreateIndex
CREATE INDEX "QueryMetric_timestamp_idx" ON "public"."QueryMetric"("timestamp");

-- CreateIndex
CREATE INDEX "QueryMetric_table_idx" ON "public"."QueryMetric"("table");

-- CreateIndex
CREATE INDEX "QueryMetric_userId_idx" ON "public"."QueryMetric"("userId");

-- CreateIndex
CREATE INDEX "QueryMetric_success_idx" ON "public"."QueryMetric"("success");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TherapistProfile" ADD CONSTRAINT "TherapistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientProfile" ADD CONSTRAINT "ClientProfile_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "public"."TherapistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CrisisIntervention" ADD CONSTRAINT "CrisisIntervention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WellnessData" ADD CONSTRAINT "WellnessData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionNote" ADD CONSTRAINT "SessionNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionNote" ADD CONSTRAINT "SessionNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionNote" ADD CONSTRAINT "SessionNote_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "public"."TherapistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "public"."TherapistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressReport" ADD CONSTRAINT "ProgressReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingAddress" ADD CONSTRAINT "BillingAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
