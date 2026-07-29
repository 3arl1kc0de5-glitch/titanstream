import { Injectable, NotFoundException } from '@nestjs/common';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';

export interface SystemIncident {
  id: string;
  reference: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedComponent: string;
  ownerId?: string;
  ownerName?: string;
  timeline: Array<{ timestamp: string; message: string; author: string }>;
  createdAt: string;
  resolvedAt?: string;
}

@Injectable()
export class IncidentEngineService {
  private readonly incidents = new Map<string, SystemIncident>();

  constructor() {
    // Seed initial operational incident for monitoring demonstration if needed
    const seedId = 'inc_101';
    this.incidents.set(seedId, {
      id: seedId,
      reference: 'INC-2026-001',
      title: 'CryptoBot Webhook Delay Monitor',
      description: 'Transient latency observed on Telegram CryptoBot payment confirmation webhook dispatch.',
      severity: 'LOW',
      status: 'INVESTIGATING',
      affectedComponent: 'Settlement Webhook Receiver',
      ownerName: 'Treasury Duty Engineer',
      timeline: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'Incident registered by automated monitoring probe.', author: 'System' },
        { timestamp: new Date(Date.now() - 1800000).toISOString(), message: 'Investigating webhook latency parameters.', author: 'Treasury Duty Engineer' },
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    });
  }

  getAllIncidents(): SystemIncident[] {
    return Array.from(this.incidents.values());
  }

  getActiveIncidents(): SystemIncident[] {
    return Array.from(this.incidents.values()).filter((i) => i.status !== 'RESOLVED');
  }

  getIncident(id: string): SystemIncident {
    const inc = this.incidents.get(id);
    if (!inc) throw new NotFoundException('INCIDENT_NOT_FOUND');
    return inc;
  }

  createIncident(dto: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affectedComponent: string;
    ownerName?: string;
  }): SystemIncident {
    const id = `inc_${Date.now()}`;
    const reference = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const incident: SystemIncident = {
      id,
      reference,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      status: 'OPEN',
      affectedComponent: dto.affectedComponent,
      ownerName: dto.ownerName || 'Unassigned',
      timeline: [
        {
          timestamp: new Date().toISOString(),
          message: `Incident created with severity ${dto.severity}`,
          author: dto.ownerName || 'Operator',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    this.incidents.set(id, incident);
    return incident;
  }

  assignOwner(id: string, ownerName: string): SystemIncident {
    const inc = this.getIncident(id);
    inc.ownerName = ownerName;
    inc.status = 'INVESTIGATING';
    inc.timeline.push({
      timestamp: new Date().toISOString(),
      message: `Assigned incident ownership to ${ownerName}`,
      author: ownerName,
    });
    this.incidents.set(id, inc);
    return inc;
  }

  resolveIncident(id: string, resolutionNote: string, authorName?: string): SystemIncident {
    const inc = this.getIncident(id);
    inc.status = 'RESOLVED';
    inc.resolvedAt = new Date().toISOString();
    inc.timeline.push({
      timestamp: new Date().toISOString(),
      message: `Incident resolved: ${resolutionNote}`,
      author: authorName || 'Operator',
    });
    this.incidents.set(id, inc);
    return inc;
  }
}
