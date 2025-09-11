import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { audit } from '@/lib/security/audit';
import { areDemoAccountsAllowed, getDemoSecurityHeaders } from '@/lib/utils/demo-accounts';

// Demo account configurations
const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN' as const,
    email: 'admin@demo.astralcore.com',
    password: 'Demo123!Admin',
    name: 'Sarah Administrator',
    profile: {
      firstName: 'Sarah',
      lastName: 'Administrator',
      dateOfBirth: new Date('1985-06-15'),
      phoneNumber: '+1-555-ADMIN-01',
      address: '123 Admin Street, Tech City, TC 12345',
      city: 'Tech City',
      state: 'TC',
      zipCode: '12345',
      country: 'USA'
    }
  },
  {
    role: 'THERAPIST' as const,
    email: 'therapist@demo.astralcore.com',
    password: 'Demo123!Therapist',
    name: 'Dr. Michael Thompson',
    profile: {
      firstName: 'Michael',
      lastName: 'Thompson',
      dateOfBirth: new Date('1980-03-22'),
      phoneNumber: '+1-555-THERAPY-1',
      address: '456 Wellness Avenue, Care City, CC 67890',
      city: 'Care City',
      state: 'CC',
      zipCode: '67890',
      country: 'USA'
    },
    therapistProfile: {
      licenseNumber: 'PSY-12345-CA',
      licenseState: 'CA',
      licenseExpiry: new Date('2025-12-31'),
      specializations: ['Cognitive Behavioral Therapy', 'Trauma-Informed Care', 'Anxiety Disorders'],
      education: [
        {
          degree: 'Ph.D. in Clinical Psychology',
          institution: 'UCLA',
          year: 2016,
          gpa: 3.8
        }
      ],
      certifications: [
        {
          name: 'Licensed Clinical Psychologist',
          issuer: 'California Board of Psychology',
          year: 2017,
          expiry: 2025
        }
      ],
      yearsOfExperience: 8,
      acceptingClients: true,
      hourlyRate: 150.00,
      insuranceAccepted: ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'UnitedHealth'],
      bio: 'Dr. Thompson has 8 years of experience helping individuals overcome anxiety, depression, and trauma. He uses evidence-based approaches including CBT and mindfulness techniques.'
    }
  },
  {
    role: 'CLIENT' as const,
    email: 'client@demo.astralcore.com',
    password: 'Demo123!Client',
    name: 'Emma Johnson',
    profile: {
      firstName: 'Emma',
      lastName: 'Johnson',
      dateOfBirth: new Date('1992-11-08'),
      phoneNumber: '+1-555-CLIENT-1',
      address: '789 Hope Lane, Support City, SC 11111',
      city: 'Support City',
      state: 'SC',
      zipCode: '11111',
      country: 'USA',
      emergencyContact: {
        name: 'Sarah Johnson (Sister)',
        phone: '+1-555-EMRGNCY-1',
        relationship: 'Sister'
      }
    }
  },
  {
    role: 'CRISIS_RESPONDER' as const,
    email: 'crisis@demo.astralcore.com',
    password: 'Demo123!Crisis',
    name: 'Alex Crisis-Response',
    profile: {
      firstName: 'Alex',
      lastName: 'Crisis-Response',
      dateOfBirth: new Date('1988-09-14'),
      phoneNumber: '+1-555-CRISIS-1',
      address: '24/7 Emergency Response Center, Crisis City, CR 99999',
      city: 'Crisis City',
      state: 'CR',
      zipCode: '99999',
      country: 'USA'
    }
  },
  {
    role: 'SUPERVISOR' as const,
    email: 'supervisor@demo.astralcore.com',
    password: 'Demo123!Supervisor',
    name: 'Dr. Rachel Supervisor',
    profile: {
      firstName: 'Rachel',
      lastName: 'Supervisor',
      dateOfBirth: new Date('1975-12-03'),
      phoneNumber: '+1-555-SUPER-01',
      address: '321 Supervision Boulevard, Management City, MC 33333',
      city: 'Management City',
      state: 'MC',
      zipCode: '33333',
      country: 'USA'
    }
  }
];

const DEMO_WELLNESS_DATA = {
  moodScore: 7,
  anxietyLevel: 4,
  stressLevel: 5,
  sleepHours: 7.5,
  sleepQuality: 6,
  exercise: true,
  exerciseMinutes: 30,
  meditation: true,
  meditationMinutes: 15,
  socialContact: true,
  medications: ['Sertraline 50mg'],
  symptoms: ['mild anxiety in mornings'],
  triggers: ['work meetings', 'social events'],
  copingStrategies: ['deep breathing', 'progressive muscle relaxation', 'journaling'],
  notes: 'Feeling generally positive today. Had a good therapy session this week.'
};

const DEMO_JOURNAL_ENTRIES = [
  {
    title: 'Reflection on Today',
    content: 'Today was a good day. I practiced the breathing techniques Dr. Thompson taught me, and it really helped with my morning anxiety. I\'m grateful for the progress I\'m making.',
    mood: 'positive',
    tags: ['gratitude', 'progress', 'anxiety-management'],
    attachments: [],
    isPrivate: false
  },
  {
    title: 'Weekly Check-in',
    content: 'This week has been challenging but I\'m learning to cope better. The mindfulness exercises are becoming more natural.',
    mood: 'neutral',
    tags: ['mindfulness', 'coping-skills', 'weekly-reflection'],
    attachments: [],
    isPrivate: false
  }
];

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

async function createDemoAccount(accountData: typeof DEMO_ACCOUNTS[0]) {
  try {
    // Hash password
    const hashedPassword = await hashPassword(accountData.password);
    
    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: accountData.email,
        password: hashedPassword,
        name: accountData.name,
        role: accountData.role,
        status: 'ACTIVE',
        emailVerified: new Date(),
        profile: {
          create: accountData.profile
        }
      }
    });
    
    // Create therapist profile if needed
    if ('therapistProfile' in accountData && accountData.therapistProfile) {
      await prisma.therapistProfile.create({
        data: {
          userId: user.id,
          ...accountData.therapistProfile
        }
      });
    }
    
    // Add demo data for clients
    if (accountData.role === 'CLIENT') {
      // Create wellness data
      await prisma.wellnessData.create({
        data: {
          userId: user.id,
          ...DEMO_WELLNESS_DATA
        }
      });
      
      // Create journal entries
      for (const entry of DEMO_JOURNAL_ENTRIES) {
        await prisma.journalEntry.create({
          data: {
            userId: user.id,
            ...entry
          }
        });
      }
    }
    
    await audit.logSuccess(
      'DEMO_ACCOUNT_CREATED',
      'User',
      user.id,
      { role: accountData.role },
      user.id
    );
    
    return { success: true, user: { id: user.id, email: user.email, role: user.role } };
    
  } catch (error) {
    console.error(`Error creating demo account ${accountData.email}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(_request: NextRequest) {
  try {
    // Check if demo accounts are allowed in current environment
    if (!areDemoAccountsAllowed()) {
      return NextResponse.json(
        { error: 'Demo account creation not allowed in this environment' },
        { 
          status: 403,
          headers: getDemoSecurityHeaders()
        }
      );
    }

    const results = [];
    
    for (const accountData of DEMO_ACCOUNTS) {
      // Check if account already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: accountData.email }
      });
      
      if (existingUser) {
        results.push({
          email: accountData.email,
          role: accountData.role,
          status: 'exists',
          message: 'Account already exists'
        });
        continue;
      }
      
      const result = await createDemoAccount(accountData);
      results.push({
        email: accountData.email,
        role: accountData.role,
        status: result.success ? 'created' : 'failed',
        message: result.success ? 'Account created successfully' : result.error,
        user: result.user
      });
    }
    
    // Create sample appointment between therapist and client
    const therapistResult = results.find(r => r.role === 'THERAPIST' && r.status === 'created');
    const clientResult = results.find(r => r.role === 'CLIENT' && r.status === 'created');
    
    if (therapistResult?.user && clientResult?.user) {
      try {
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + 7); // Next week
        
        await prisma.appointment.create({
          data: {
            userId: clientResult.user.id,
            therapistId: therapistResult.user.id,
            scheduledAt: appointmentDate,
            duration: 50,
            type: 'THERAPY_SESSION',
            status: 'SCHEDULED',
            location: 'Virtual Session',
            meetingUrl: 'https://meet.astralcore.com/demo-session',
            notes: 'Regular therapy session focused on anxiety management and coping strategies.'
          }
        });
        
        results.push({
          email: 'system',
          role: 'APPOINTMENT',
          status: 'created',
          message: 'Sample appointment created between therapist and client'
        });
      } catch (error) {
        console.error('Error creating sample appointment:', error);
        results.push({
          email: 'system',
          role: 'APPOINTMENT',
          status: 'failed',
          message: 'Failed to create sample appointment'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Demo account creation completed',
      results,
      credentials: DEMO_ACCOUNTS.map(acc => ({
        role: acc.role,
        email: acc.email,
        password: acc.password,
        name: acc.name
      }))
    });
    
  } catch (error) {
    console.error('Error in demo account creation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create demo accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if demo accounts exist
export async function GET() {
  try {
    const demoAccounts = await prisma.user.findMany({
      where: {
        email: {
          in: DEMO_ACCOUNTS.map(acc => acc.email)
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        status: true,
        createdAt: true
      }
    });
    
    const accountStatus = DEMO_ACCOUNTS.map(acc => {
      const existing = demoAccounts.find(da => da.email === acc.email);
      return {
        role: acc.role,
        email: acc.email,
        exists: !!existing,
        status: existing?.status,
        createdAt: existing?.createdAt
      };
    });
    
    return NextResponse.json({
      success: true,
      accounts: accountStatus,
      allExist: accountStatus.every(acc => acc.exists)
    });
    
  } catch (error) {
    console.error('Error checking demo accounts:', error);
    return NextResponse.json(
      { error: 'Failed to check demo accounts' },
      { status: 500 }
    );
  }
}