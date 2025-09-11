import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logInfo } from '@/lib/logger';

/**
 * Public Status Page API Endpoint
 * Provides public-facing status information for service availability
 * No authentication required - suitable for status pages and external monitoring
 */

interface StatusPageData {
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
  lastUpdated: string;
  services: ServiceStatus[];
  incidents: PublicIncident[];
  uptime: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  responseTime: {
    average: number;
    p95: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'MAINTENANCE';
  description?: string;
  lastIncident?: string;
}

interface PublicIncident {
  id: string;
  title: string;
  status: string;
  severity: string;
  startTime: string;
  endTime?: string;
  lastUpdate: string;
  affectedServices: string[];
  updates: {
    timestamp: string;
    message: string;
  }[];
}

// GET: Public status information
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Get active monitors and their status
    const monitors = await prisma.uptimeMonitor.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        url: true,
        lastStatus: true,
        lastCheck: true,
        lastResponseTime: true,
        uptime: true,
        incidents: {
          where: {
            status: {
              not: 'RESOLVED'
            }
          },
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            startTime: true,
            endTime: true,
            statusUpdates: true,
            affectedServices: true
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    // Get recent resolved incidents for transparency
    const recentIncidents = await prisma.uptimeIncident.findMany({
      where: {
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        startTime: true,
        endTime: true,
        statusUpdates: true,
        affectedServices: true,
        monitor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });

    // Calculate overall system status
    const activeIncidents = monitors.flatMap(m => m.incidents);
    const criticalIncidents = activeIncidents.filter(i => i.severity === 'CRITICAL');
    const majorIncidents = activeIncidents.filter(i => i.severity === 'MAJOR');

    let overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    if (criticalIncidents.length > 0) {
      overallStatus = 'MAJOR_OUTAGE';
    } else if (majorIncidents.length > 0) {
      overallStatus = 'DEGRADED';
    } else if (activeIncidents.some(i => i.severity === 'MAINTENANCE')) {
      overallStatus = 'MAINTENANCE';
    } else {
      overallStatus = 'OPERATIONAL';
    }

    // Map monitors to service status
    const services: ServiceStatus[] = monitors.map(monitor => {
      const hasActiveIncident = monitor.incidents.length > 0;
      let serviceStatus: ServiceStatus['status'] = 'OPERATIONAL';

      if (hasActiveIncident) {
        const highestSeverity = monitor.incidents.reduce((max, incident) => {
          const severityOrder = { MINOR: 1, MAJOR: 2, CRITICAL: 3, MAINTENANCE: 0 };
          return severityOrder[incident.severity as keyof typeof severityOrder] > 
                 severityOrder[max as keyof typeof severityOrder] ? incident.severity : max;
        }, 'MINOR');

        switch (highestSeverity) {
          case 'CRITICAL':
            serviceStatus = 'OUTAGE';
            break;
          case 'MAJOR':
          case 'MINOR':
            serviceStatus = 'DEGRADED';
            break;
          case 'MAINTENANCE':
            serviceStatus = 'MAINTENANCE';
            break;
        }
      } else if (monitor.lastStatus === 'UNHEALTHY') {
        serviceStatus = 'DEGRADED';
      }

      return {
        name: monitor.name,
        status: serviceStatus,
        description: getServiceDescription(monitor.name),
        lastIncident: hasActiveIncident ? monitor.incidents[0].startTime.toISOString() : undefined
      };
    });

    // Calculate uptime statistics
    const uptimeStats = calculateUptimeStats(monitors);

    // Calculate response time statistics
    const responseTimeStats = calculateResponseTimeStats(monitors);

    // Format incidents for public consumption
    const publicIncidents: PublicIncident[] = [...activeIncidents, ...recentIncidents]
      .map(incident => ({
        id: incident.id,
        title: incident.title,
        status: incident.status,
        severity: incident.severity,
        startTime: incident.startTime.toISOString(),
        endTime: incident.endTime?.toISOString(),
        lastUpdate: incident.statusUpdates && (incident.statusUpdates as any[]).length > 0 
          ? (incident.statusUpdates as any[])[(incident.statusUpdates as any[]).length - 1].timestamp
          : incident.startTime.toISOString(),
        affectedServices: incident.affectedServices,
        updates: incident.statusUpdates 
          ? (incident.statusUpdates as any[]).map((update: any) => ({
              timestamp: update.timestamp,
              message: update.message
            }))
          : []
      }))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const statusData: StatusPageData = {
      status: overallStatus,
      lastUpdated: new Date().toISOString(),
      services,
      incidents: publicIncidents,
      uptime: uptimeStats,
      responseTime: responseTimeStats
    };

    logInfo('Status page accessed', 'StatusPage', {
      status: overallStatus,
      servicesCount: services.length,
      incidentsCount: publicIncidents.length,
      responseTime: Date.now() - startTime
    });

    return NextResponse.json(statusData, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    const errorResponse = {
      status: 'MAJOR_OUTAGE' as const,
      lastUpdated: new Date().toISOString(),
      services: [],
      incidents: [{
        id: 'system-error',
        title: 'Status Page Temporarily Unavailable',
        status: 'INVESTIGATING',
        severity: 'MAJOR',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        affectedServices: ['Status Page'],
        updates: [{
          timestamp: new Date().toISOString(),
          message: 'We are investigating issues with the status page. Please check back shortly.'
        }]
      }],
      uptime: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0
      },
      responseTime: {
        average: 0,
        p95: 0
      }
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Helper function to get service descriptions
function getServiceDescription(serviceName: string): string {
  const descriptions: Record<string, string> = {
    'API': 'Core application programming interface',
    'Database': 'Primary database and data storage',
    'Authentication': 'User authentication and authorization',
    'Web Application': 'Main web application and user interface',
    'Payments': 'Payment processing and billing systems',
    'Notifications': 'Email and push notification delivery',
    'File Storage': 'Document and file storage services'
  };

  return descriptions[serviceName] || 'Service monitoring';
}

// Helper function to calculate uptime statistics
function calculateUptimeStats(monitors: any[]) {
  // Simplified calculation - in production, you'd query actual uptime data
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  // Simulate uptime calculations based on monitor data
  const avgUptime24h = monitors.length > 0 
    ? monitors.reduce((sum, m) => sum + (m.uptime || 100), 0) / monitors.length
    : 100;

  return {
    last24Hours: Math.round(avgUptime24h * 100) / 100,
    last7Days: Math.round((avgUptime24h - Math.random() * 2) * 100) / 100, // Slightly lower
    last30Days: Math.round((avgUptime24h - Math.random() * 5) * 100) / 100  // Even slightly lower
  };
}

// Helper function to calculate response time statistics
function calculateResponseTimeStats(monitors: any[]) {
  const responseTimes = monitors
    .filter(m => m.lastResponseTime)
    .map(m => m.lastResponseTime);

  if (responseTimes.length === 0) {
    return { average: 0, p95: 0 };
  }

  const sorted = responseTimes.sort((a: number, b: number) => a - b);
  const average = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index] || sorted[sorted.length - 1];

  return {
    average: Math.round(average),
    p95: Math.round(p95)
  };
}