import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventType, UserState } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { ConsentType } from '@prisma/client';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async recordConsent(
    telegramUserId: bigint,
    consentType: ConsentType,
    options: {
      version?: number;
      documentHash?: string;
      documentUrl?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      metadata?: any;
    } = {},
  ) {
    const existing = await this.prisma.userConsent.findFirst({
      where: {
        telegramUserId,
        consentType,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException('CONSENT_ALREADY_RECORDED');
    }

    const consent = await this.prisma.userConsent.create({
      data: {
        telegramUserId,
        consentType,
        version: options.version || 1,
        documentHash: options.documentHash,
        documentUrl: options.documentUrl,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
        metadata: options.metadata || {},
        isActive: true,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.CONSENT_ACCEPTED,
      description: `Consent recorded: ${consentType}`,
      metadata: { consentType, version: options.version || 1 },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
    });

    const allConsentsGiven = await this.checkAllConsentsGiven(telegramUserId);
    if (allConsentsGiven) {
      await this.prisma.user.update({
        where: { telegramUserId },
        data: { state: UserState.READY },
      });

      await this.prisma.userStateTransition.create({
        data: {
          telegramUserId,
          fromState: UserState.CONSENT_REQUIRED,
          toState: UserState.READY,
          reason: 'All required consents recorded',
          triggerEvent: 'consent_service',
        },
      });

      await this.auditService.create({
        telegramUserId,
        eventType: AuditEventType.CONSENT_ALL_COMPLETED,
        description: 'All required consents completed',
      });

      await this.auditService.create({
        telegramUserId,
        eventType: AuditEventType.USER_STATE_CHANGED,
        description: `State transition: CONSENT_REQUIRED -> READY`,
        metadata: { fromState: 'CONSENT_REQUIRED', toState: 'READY' },
      });
    }

    return consent;
  }

  async revokeConsent(telegramUserId: bigint, consentType: ConsentType) {
    const consent = await this.prisma.userConsent.findFirst({
      where: { telegramUserId, consentType, isActive: true },
    });
    if (!consent) throw new NotFoundException('CONSENT_NOT_FOUND');

    return this.prisma.userConsent.update({
      where: { id: consent.id },
      data: { isActive: false },
    });
  }

  async getConsentStatus(telegramUserId: bigint) {
    const consents = await this.prisma.userConsent.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
    });

    const requiredTypes: ConsentType[] = [
      'not_a_bank',
      'rewards_not_guaranteed',
      'may_lose_value',
      'withdrawal_terms',
      'terms_of_service',
      'restricted_jurisdiction',
    ];

    const consentMap = new Map(consents.filter(c => c.isActive).map((c) => [c.consentType, c]));

    return {
      allRequiredGiven: requiredTypes.every((t) => consentMap.has(t)),
      consents: requiredTypes.map((type) => ({
        type,
        given: consentMap.has(type),
        recordedAt: consentMap.get(type)?.createdAt || null,
        version: consentMap.get(type)?.version || null,
      })),
      additional: consents
        .filter((c) => !requiredTypes.includes(c.consentType))
        .map((c) => ({
          type: c.consentType,
          given: c.isActive,
          recordedAt: c.createdAt,
        })),
    };
  }

  private async checkAllConsentsGiven(telegramUserId: bigint): Promise<boolean> {
    const requiredTypes: ConsentType[] = [
      'not_a_bank',
      'rewards_not_guaranteed',
      'may_lose_value',
      'withdrawal_terms',
      'terms_of_service',
      'restricted_jurisdiction',
    ];

    const givenCount = await this.prisma.userConsent.count({
      where: {
        telegramUserId,
        consentType: { in: requiredTypes },
        isActive: true,
      },
    });

    return givenCount >= requiredTypes.length;
  }

  async getRequiredConsents() {
    return [
      {
        type: 'not_a_bank',
        label: 'I understand that TitanStream is not a bank or financial institution',
        required: true,
      },
      {
        type: 'rewards_not_guaranteed',
        label: 'I understand that mining rewards are not guaranteed and may fluctuate',
        required: true,
      },
      {
        type: 'may_lose_value',
        label: 'I understand that I may lose value in my in-app balance',
        required: true,
      },
      {
        type: 'withdrawal_terms',
        label: 'I understand that withdrawals are subject to minimum amounts, network fees, and processing times',
        required: true,
      },
      {
        type: 'terms_of_service',
        label: 'I accept the Terms of Service and Privacy Policy',
        required: true,
      },
      {
        type: 'restricted_jurisdiction',
        label: 'I confirm I am not a resident of a restricted jurisdiction',
        required: true,
      },
    ];
  }
}
