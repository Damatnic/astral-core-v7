import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/db/prisma';
import bcrypt from 'bcryptjs';
import { audit } from '../../../../../lib/security/audit';
import { areDemoAccountsAllowed, getDemoSecurityHeaders, DEMO_ACCOUNT_INFO } from '../../../../../lib/utils/demo-accounts';

// Demo profile and data configurations
const DEMO_PROFILES = {
  ADMIN: {
    firstName: 'Sarah',
    lastName: 'Administrator',
    dateOfBirth: new Date('1985-06-15'),
    phoneNumber: '+1-555-ADMIN-01',
    address: '123 Admin Street, Tech City, TC 12345',
    city: 'Tech City',
    state: 'TC',
    zipCode: '12345',
    country: 'USA'
  },
  THERAPIST: {
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
  CLIENT: {
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
  },
  CRISIS_RESPONDER: {
    firstName: 'Alex',
    lastName: 'Crisis-Response',
    dateOfBirth: new Date('1988-09-14'),
    phoneNumber: '+1-555-CRISIS-1',
    address: '24/7 Emergency Response Center, Crisis City, CR 99999',
    city: 'Crisis City',
    state: 'CR',
    zipCode: '99999',
    country: 'USA'
  },
  SUPERVISOR: {
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
};

const THERAPIST_PROFILE_DATA = {
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
};

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

async function createDemoAccount(role: string, demoAccountInfo: typeof DEMO_ACCOUNT_INFO[string]) {
  const profile = DEMO_PROFILES[role as keyof typeof DEMO_PROFILES];
  if (!profile) {
    throw new Error(`No profile configuration found for role: ${role}`);
  }

  return await prisma.$transaction(async (tx) => {
    try {
      // Hash password
      const hashedPassword = await hashPassword(demoAccountInfo.password);
      
      // Create user with profile
      const user = await tx.user.create({
        data: {
          email: demoAccountInfo.email,
          password: hashedPassword,
          name: demoAccountInfo.name,
          role: role as any,
          status: 'ACTIVE',
          emailVerified: new Date(),
          profile: {
            create: profile
          }
        }
      });
      
      // Create therapist profile if needed
      if (role === 'THERAPIST') {
        await tx.therapistProfile.create({
          data: {
            userId: user.id,
            ...THERAPIST_PROFILE_DATA
          }
        });
      }
      
      // Add demo data for clients
      if (role === 'CLIENT') {
        // Create wellness data
        await tx.wellnessData.create({
          data: {
            userId: user.id,
            ...DEMO_WELLNESS_DATA
          }
        });
        
        // Create journal entries
        for (const entry of DEMO_JOURNAL_ENTRIES) {
          await tx.journalEntry.create({
            data: {
              userId: user.id,
              ...entry
            }
          });
        }
      }
      
      // Log successful creation (resilient - won't break transaction)
      try {
        await audit.logSuccess(
          'DEMO_ACCOUNT_CREATED',
          'User',
          user.id,
          { role: role, environment: process.env.NODE_ENV },
          user.id
        );
      } catch (auditError) {
        console.error('Audit logging failed for demo account creation:', auditError);
        // Continue - don't break transaction for audit failures
      }
      
      return { 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          name: user.name
        } 
      };
      
    } catch (error) {
      console.error(`Error creating demo account ${demoAccountInfo.email}:`, error);
      throw error; // Re-throw to rollback transaction
    }
  });
}

async function createSampleAppointment(therapistId: string, clientId: string) {
  try {
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7); // Next week
    
    const appointment = await prisma.appointment.create({
      data: {
        userId: clientId,
        therapistId: therapistId,
        scheduledAt: appointmentDate,
        duration: 50,
        type: 'THERAPY_SESSION',
        status: 'SCHEDULED',
        location: 'Virtual Session',
        meetingUrl: 'https://meet.astralcore.com/demo-session',
        notes: 'Regular therapy session focused on anxiety management and coping strategies.'
      }
    });
    
    return { success: true, appointment };
  } catch (error) {
    console.error('Error creating sample appointment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if demo accounts are allowed in current environment
    if (!areDemoAccountsAllowed()) {
      return NextResponse.json(
        { 
          error: 'Demo account creation not allowed in this environment',
          environment: process.env.NODE_ENV,
          allowDemoAccounts: process.env.ALLOW_DEMO_ACCOUNTS
        },
        { 
          status: 403,
          headers: getDemoSecurityHeaders()
        }
      );
    }

    const results = [];
    const credentials = [];
    
    // Process each demo account
    for (const [role, accountInfo] of Object.entries(DEMO_ACCOUNT_INFO)) {
      try {
        // Check if account already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: accountInfo.email }
        });
        
        if (existingUser) {
          results.push({
            email: accountInfo.email,
            role: role,
            status: 'exists',
            message: 'Account already exists',
            userId: existingUser.id
          });
          
          // Still add to credentials for existing accounts
          credentials.push({
            role: role,
            email: accountInfo.email,
            password: accountInfo.password,
            name: accountInfo.name
          });
          continue;
        }
        
        // Create the demo account
        const result = await createDemoAccount(role, accountInfo);
        
        results.push({
          email: accountInfo.email,
          role: role,
          status: 'created',
          message: 'Account created successfully',
          userId: result.user.id
        });
        
        credentials.push({
          role: role,
          email: accountInfo.email,
          password: accountInfo.password,
          name: accountInfo.name
        });
        
      } catch (error) {
        console.error(`Failed to create demo account for role ${role}:`, error);
        results.push({
          email: accountInfo.email,
          role: role,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Create sample appointment between therapist and client if both exist
    const therapistResult = results.find(r => r.role === 'THERAPIST' && (r.status === 'created' || r.status === 'exists'));
    const clientResult = results.find(r => r.role === 'CLIENT' && (r.status === 'created' || r.status === 'exists'));
    
    if (therapistResult?.userId && clientResult?.userId) {
      const appointmentResult = await createSampleAppointment(therapistResult.userId, clientResult.userId);
      
      results.push({
        email: 'system',
        role: 'APPOINTMENT',
        status: appointmentResult.success ? 'created' : 'failed',
        message: appointmentResult.success 
          ? 'Sample appointment created between therapist and client'
          : `Failed to create sample appointment: ${appointmentResult.error}`
      });
    }
    
    // Log overall operation success
    try {
      await audit.logSuccess(
        'DEMO_ACCOUNTS_SETUP',
        'System',
        'demo-system',
        { 
          totalAccounts: results.length,
          successfulCreations: results.filter(r => r.status === 'created').length,
          existingAccounts: results.filter(r => r.status === 'exists').length,
          failedCreations: results.filter(r => r.status === 'failed').length,
          environment: process.env.NODE_ENV
        }
      );
    } catch (auditError) {
      console.error('Failed to log demo accounts setup:', auditError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Demo account creation completed',
      results,
      credentials,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === 'created').length,
        existing: results.filter(r => r.status === 'exists').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    }, {
      headers: getDemoSecurityHeaders()
    });
    
  } catch (error) {
    console.error('Error in demo account creation:', error);
    
    // Log the error
    try {
      await audit.logError(
        'DEMO_ACCOUNTS_SETUP_FAILED',
        'System',
        error,
        undefined
      );
    } catch (auditError) {
      console.error('Failed to log demo account creation error:', auditError);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create demo accounts',
        details: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV
      },
      { 
        status: 500,
        headers: getDemoSecurityHeaders()
      }
    );
  }
}

// GET endpoint to check if demo accounts exist
export async function GET() {
  try {
    if (!areDemoAccountsAllowed()) {
      return NextResponse.json(
        { error: 'Demo accounts not allowed in this environment' },
        { 
          status: 403,
          headers: getDemoSecurityHeaders()
        }
      );
    }

    const demoEmails = Object.values(DEMO_ACCOUNT_INFO).map(acc => acc.email);
    
    const demoAccounts = await prisma.user.findMany({
      where: {
        email: {
          in: demoEmails
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        status: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    const accountStatus = Object.entries(DEMO_ACCOUNT_INFO).map(([role, accountInfo]) => {
      const existing = demoAccounts.find(da => da.email === accountInfo.email);
      return {
        role: role,
        email: accountInfo.email,
        name: accountInfo.name,
        exists: !!existing,
        status: existing?.status,
        createdAt: existing?.createdAt,
        lastLogin: existing?.lastLogin
      };
    });
    
    return NextResponse.json({
      success: true,
      accounts: accountStatus,
      allExist: accountStatus.every(acc => acc.exists),
      environment: process.env.NODE_ENV,
      allowDemoAccounts: process.env.ALLOW_DEMO_ACCOUNTS
    }, {
      headers: getDemoSecurityHeaders()
    });
    
  } catch (error) {
    console.error('Error checking demo accounts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check demo accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: getDemoSecurityHeaders()
      }
    );
  }
}