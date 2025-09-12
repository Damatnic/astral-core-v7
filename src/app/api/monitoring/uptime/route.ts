import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/db/prisma';
import { logInfo, logError, toError } from '../../../../lib/logger';
import { z } from 'zod';

/**
 * Uptime Monitoring API Endpoint
 * Comprehensive uptime monitoring and incident management
 * Manages monitors, incidents, and status reporting
 */

const CreateMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  interval: z.number().min(60).max(3600), // 1 minute to 1 hour
  timeout: z.number().min(5).max(120), // 5 seconds to 2 minutes
  expectedStatus: z.number().min(200).max(599).default(200)
});

const UpdateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  interval: z.number().min(60).max(3600).optional(),
  timeout: z.number().min(5).max(120).optional(),
  expectedStatus: z.number().min(200).max(599).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DISABLED']).optional()
});

const CreateIncidentSchema = z.object({
  monitorId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL', 'MAINTENANCE']),
  affectedServices: z.array(z.string()).default([])
});

// GET: Retrieve uptime monitors and status
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || !['ADMIN', 'THERAPIST'].includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or Therapist access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const monitorId = url.searchParams.get('monitorId');

    if (action === 'status' && monitorId) {
      // Get detailed status for specific monitor
      const monitor = await prisma.uptimeMonitor.findUnique({
        where: { id: monitorId },
        include: {
          incidents: {
            where: {
              status: {
                in: ['INVESTIGATING', 'IDENTIFIED', 'MONITORING']
              }
            },
            orderBy: {
              startTime: 'desc'
            },
            take: 10
          }
        }
      });

      if (!monitor) {
        return NextResponse.json(
          { error: 'Monitor not found' },
          { status: 404 }
        );
      }

      // Get recent health checks for this monitor (simulated since we don't have actual monitoring yet)
      const recentChecks = await getRecentHealthChecks(monitor.url);

      return NextResponse.json({
        monitor,
        recentChecks,
        activeIncidents: monitor.incidents.length,
        overallStatus: monitor.lastStatus || 'UNKNOWN'
      });

    } else if (action === 'incidents') {
      // Get all incidents across monitors
      const incidents = await prisma.uptimeIncident.findMany({
        include: {
          monitor: {
            select: {
              name: true,
              url: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        take: 50
      });

      return NextResponse.json({
        incidents,
        total: incidents.length
      });

    } else {
      // Get all monitors with summary information
      const monitors = await prisma.uptimeMonitor.findMany({
        include: {
          incidents: {
            where: {
              status: {
                not: 'RESOLVED'
              }
            },
            select: {
              id: true,
              severity: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate overall system status
      const activeIncidents = monitors.flatMap(m => m.incidents);
      const criticalIncidents = activeIncidents.filter(i => i.severity === 'CRITICAL');
      const majorIncidents = activeIncidents.filter(i => i.severity === 'MAJOR');

      let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      if (criticalIncidents.length > 0) {
        overallStatus = 'UNHEALTHY';
      } else if (majorIncidents.length > 0 || activeIncidents.length > 2) {
        overallStatus = 'DEGRADED';
      } else {
        overallStatus = 'HEALTHY';
      }

      return NextResponse.json({
        overallStatus,
        monitors: monitors.map(monitor => ({
          ...monitor,
          activeIncidentCount: monitor.incidents.length,
          hasActiveIncidents: monitor.incidents.length > 0
        })),
        summary: {
          totalMonitors: monitors.length,
          activeIncidents: activeIncidents.length,
          criticalIncidents: criticalIncidents.length,
          majorIncidents: majorIncidents.length
        }
      });
    }

  } catch (error) {
    logError('Failed to retrieve uptime data', toError(error), 'UptimeMonitoring');

    return NextResponse.json(
      { error: 'Failed to retrieve uptime data' },
      { status: 500 }
    );
  }
}

// POST: Create new monitor or incident
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type } = body;

    if (type === 'monitor') {
      const validatedData = CreateMonitorSchema.parse(body);

      const monitor = await prisma.uptimeMonitor.create({
        data: {
          name: validatedData.name,
          url: validatedData.url,
          interval: validatedData.interval,
          timeout: validatedData.timeout,
          expectedStatus: validatedData.expectedStatus
        }
      });

      logInfo('Uptime monitor created', 'UptimeMonitoring', {
        monitorId: monitor.id,
        name: monitor.name,
        url: monitor.url
      });

      return NextResponse.json({
        success: true,
        monitor,
        message: 'Uptime monitor created successfully'
      }, { status: 201 });

    } else if (type === 'incident') {
      const validatedData = CreateIncidentSchema.parse(body);

      const incident = await prisma.uptimeIncident.create({
        data: {
          monitorId: validatedData.monitorId,
          title: validatedData.title,
          description: validatedData.description ?? null,
          severity: validatedData.severity,
          affectedServices: validatedData.affectedServices
        }
      });

      logInfo('Incident created', 'UptimeMonitoring', {
        incidentId: incident.id,
        monitorId: validatedData.monitorId,
        severity: validatedData.severity,
        title: validatedData.title
      });

      return NextResponse.json({
        success: true,
        incident,
        message: 'Incident created successfully'
      }, { status: 201 });

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Supported types: monitor, incident' },
        { status: 400 }
      );
    }

  } catch (error) {
    logError('Failed to create uptime resource', toError(error), 'UptimeMonitoring');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data format',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}

// PATCH: Update monitor or incident
export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, id } = body;

    if (type === 'monitor') {
      const validatedData = UpdateMonitorSchema.parse(body);
      const updateData = Object.fromEntries(
        Object.entries(validatedData).filter(([, value]) => value !== undefined)
      );

      const monitor = await prisma.uptimeMonitor.update({
        where: { id },
        data: updateData
      });

      logInfo('Uptime monitor updated', 'UptimeMonitoring', {
        monitorId: monitor.id,
        updatedFields: Object.keys(updateData)
      });

      return NextResponse.json({
        success: true,
        monitor,
        message: 'Monitor updated successfully'
      });

    } else if (type === 'incident') {
      const { status, statusUpdate, resolvedBy, rootCause } = body;

      const updateData: { 
        status?: string; 
        endTime?: Date; 
        resolvedBy?: string; 
        rootCause?: string; 
        statusUpdates?: Array<{ timestamp: string; message: string; author: string }> 
      } = {};
      
      if (status) {
        updateData.status = status;
        if (status === 'RESOLVED') {
          updateData.endTime = new Date();
          updateData.resolvedBy = resolvedBy || token.id;
          updateData.rootCause = rootCause;
        }
      }

      if (statusUpdate) {
        // Add status update to the incident
        const incident = await prisma.uptimeIncident.findUnique({
          where: { id },
          select: { statusUpdates: true }
        });

        const currentUpdates = (incident?.statusUpdates as Array<{ timestamp: string; message: string; author: string }>) || [];
        updateData.statusUpdates = [
          ...currentUpdates,
          {
            timestamp: new Date().toISOString(),
            message: statusUpdate,
            author: token.id
          }
        ];
      }

      const incident = await prisma.uptimeIncident.update({
        where: { id },
        data: {
          ...(updateData.status !== undefined && { status: updateData.status as any }),
          ...(updateData.endTime !== undefined && { endTime: updateData.endTime }),
          ...(updateData.resolvedBy !== undefined && { resolvedBy: updateData.resolvedBy }),
          ...(updateData.rootCause !== undefined && { rootCause: updateData.rootCause }),
          ...(updateData.statusUpdates !== undefined && { statusUpdates: updateData.statusUpdates })
        }
      });

      // Calculate duration if incident is resolved
      if (status === 'RESOLVED' && incident.startTime && incident.endTime) {
        const duration = Math.floor(
          (incident.endTime.getTime() - incident.startTime.getTime()) / 1000
        );
        
        await prisma.uptimeIncident.update({
          where: { id },
          data: { duration }
        });
      }

      logInfo('Incident updated', 'UptimeMonitoring', {
        incidentId: incident.id,
        status: status || 'status_update',
        updatedBy: token.id
      });

      return NextResponse.json({
        success: true,
        incident,
        message: 'Incident updated successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Supported types: monitor, incident' },
        { status: 400 }
      );
    }

  } catch (error) {
    logError('Failed to update uptime resource', toError(error), 'UptimeMonitoring');

    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

// DELETE: Remove monitor
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const monitorId = url.searchParams.get('monitorId');

    if (!monitorId) {
      return NextResponse.json(
        { error: 'Monitor ID is required' },
        { status: 400 }
      );
    }

    await prisma.uptimeMonitor.delete({
      where: { id: monitorId }
    });

    logInfo('Uptime monitor deleted', 'UptimeMonitoring', {
      monitorId,
      deletedBy: token.id
    });

    return NextResponse.json({
      success: true,
      message: 'Monitor deleted successfully'
    });

  } catch (error) {
    logError('Failed to delete monitor', toError(error), 'UptimeMonitoring');

    return NextResponse.json(
      { error: 'Failed to delete monitor' },
      { status: 500 }
    );
  }
}

// Helper function to simulate recent health checks
async function getRecentHealthChecks(_url: string) {
  // In a real implementation, this would query actual health check results
  // For now, we'll simulate some data (_url parameter will be used in real implementation)
  const checks = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly checks
    const isHealthy = Math.random() > 0.1; // 90% uptime simulation
    
    checks.push({
      timestamp: timestamp.toISOString(),
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      responseTime: isHealthy ? Math.random() * 500 + 100 : null, // 100-600ms when healthy
      httpStatus: isHealthy ? 200 : Math.random() > 0.5 ? 500 : 503
    });
  }
  
  return checks.reverse(); // Chronological order
}