import { jest } from '@jest/globals';

// Mock Prisma Client
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  appointment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  journalEntry: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  wellnessData: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  treatmentPlan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  therapistProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  subscription: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  sessionNote: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  auditLog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  customer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  payment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn()
};

// Helper to reset all mocks
export const resetPrismaMocks = () => {
  Object.values(mockPrisma).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    } else if (jest.isMockFunction(model)) {
      model.mockReset();
    }
  });
};

// Commonly used mock implementations
export const mockPrismaImplementations = {
  user: {
    findUniqueSuccess: (userData: unknown) => mockPrisma.user.findUnique.mockResolvedValue(userData as never),
    findUniqueNotFound: () => mockPrisma.user.findUnique.mockResolvedValue(null as never),
    createSuccess: (userData: unknown) => mockPrisma.user.create.mockResolvedValue(userData as never),
    updateSuccess: (userData: unknown) => mockPrisma.user.update.mockResolvedValue(userData as never),
    deleteSuccess: (userData: unknown) => mockPrisma.user.delete.mockResolvedValue(userData as never)
  },
  appointment: {
    findManySuccess: (appointments: unknown[]) =>
      mockPrisma.appointment.findMany.mockResolvedValue(appointments as never),
    createSuccess: (appointmentData: unknown) =>
      mockPrisma.appointment.create.mockResolvedValue(appointmentData as never),
    updateSuccess: (appointmentData: unknown) =>
      mockPrisma.appointment.update.mockResolvedValue(appointmentData as never)
  },
  wellnessData: {
    createSuccess: (wellnessData: unknown) =>
      mockPrisma.wellnessData.create.mockResolvedValue(wellnessData as never),
    findManySuccess: (wellnessData: unknown[]) =>
      mockPrisma.wellnessData.findMany.mockResolvedValue(wellnessData as never)
  },
  treatmentPlan: {
    findUniqueSuccess: (treatmentPlan: unknown) =>
      mockPrisma.treatmentPlan.findUnique.mockResolvedValue(treatmentPlan as never),
    createSuccess: (treatmentPlan: unknown) =>
      mockPrisma.treatmentPlan.create.mockResolvedValue(treatmentPlan as never),
    updateSuccess: (treatmentPlan: unknown) =>
      mockPrisma.treatmentPlan.update.mockResolvedValue(treatmentPlan as never)
  }
};
