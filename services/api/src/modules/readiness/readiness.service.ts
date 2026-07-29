import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventType, UserState } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';

export interface ReadinessResult {
  overallScore: number;
  educationScore: number;
  trustScore: number;
  engagementScore: number;
  riskScore: number;
  isReady: boolean;
  reasons: string[];
  barriers: string[];
}

@Injectable()
export class ReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async calculateReadiness(telegramUserId: bigint): Promise<ReadinessResult> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        educationCompletions: { where: { status: 'COMPLETED' } },
        userConsents: { where: { isActive: true } },
        onboardingProgress: true,
      },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const educationScore = await this.calculateEducationScore(telegramUserId);
    const trustScore = await this.calculateTrustScore(telegramUserId);
    const engagementScore = await this.calculateEngagementScore(user);
    const riskScore = await this.calculateRiskScore(user);

    const overallScore = Math.round(
      educationScore * 0.30 +
      trustScore * 0.25 +
      engagementScore * 0.20 +
      riskScore * 0.25
    );

    const reasons: string[] = [];
    const barriers: string[] = [];

    if (educationScore >= 70) reasons.push('Education completed successfully');
    else barriers.push(`Education score too low (${educationScore}/100). Complete all modules and pass the quiz.`);

    const requiredConsentTypes = [
      'not_a_bank', 'rewards_not_guaranteed', 'may_lose_value',
      'withdrawal_terms', 'terms_of_service', 'restricted_jurisdiction',
    ];
    const consentTypes = new Set(user.userConsents.map((c) => String(c.consentType)));
    const allConsentsGiven = requiredConsentTypes.every((t) => consentTypes.has(t));
    if (allConsentsGiven) reasons.push('All required consents given');
    else barriers.push('Not all required consents have been recorded.');

    const userState = user.state as UserState;

    if (trustScore >= 60) reasons.push('Trust level sufficient');
    else barriers.push('Trust score too low. Complete education and provide consents.');

    if (userState === UserState.READY || userState === UserState.ACTIVE_USER || userState === UserState.ELIGIBLE_USER) {
      reasons.push('User state permits platform access');
    } else {
      barriers.push(`Current state (${userState}) does not permit platform access. Complete onboarding.`);
    }

    const isReady = barriers.length === 0 && overallScore >= 60;

    const result: ReadinessResult = {
      overallScore,
      educationScore,
      trustScore,
      engagementScore,
      riskScore,
      isReady,
      reasons,
      barriers,
    };

    await this.prisma.readinessScore.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        overallScore,
        educationScore,
        trustScore,
        engagementScore,
        riskScore,
        isReady,
        reasons,
        barriers,
        calculatedAt: new Date(),
      },
      update: {
        overallScore,
        educationScore,
        trustScore,
        engagementScore,
        riskScore,
        isReady,
        reasons,
        barriers,
        calculatedAt: new Date(),
      },
    });

    await this.prisma.readinessHistory.create({
      data: {
        telegramUserId,
        overallScore,
        educationScore,
        trustScore,
        engagementScore,
        riskScore,
        isReady,
        reasons,
        barriers,
      },
    });

    await this.prisma.user.update({
      where: { telegramUserId },
      data: {
        readinessScore: overallScore,
        isReady,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: isReady ? AuditEventType.USER_READY : AuditEventType.USER_NOT_READY,
      description: isReady
        ? `User is ready for platform actions (score: ${overallScore})`
        : `User is not ready (score: ${overallScore}). Barriers: ${barriers.join('; ')}`,
      metadata: result,
      source: 'readiness_service',
    });

    return result;
  }

  async getReadiness(telegramUserId: bigint) {
    const score = await this.prisma.readinessScore.findUnique({
      where: { telegramUserId },
    });
    if (!score) {
      return this.calculateReadiness(telegramUserId);
    }
    return score;
  }

  async getReadinessHistory(telegramUserId: bigint, limit = 20) {
    return this.prisma.readinessHistory.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async calculateEducationScore(telegramUserId: bigint): Promise<number> {
    const totalModules = await this.prisma.educationModule.count({
      where: { isActive: true, mandatory: true },
    });
    if (totalModules === 0) return 0;

    const completions = await this.prisma.educationCompletion.findMany({
      where: { telegramUserId, status: 'COMPLETED' },
    });

    const completedCount = completions.length;
    if (completedCount === 0) return 0;

    const completionRatio = completedCount / totalModules;
    const quizCompletions = completions.filter((c) => c.passed === true);
    const quizScore = quizCompletions.length > 0
      ? quizCompletions.reduce((sum, c) => sum + (c.score || 0), 0) /
        quizCompletions.reduce((sum, c) => sum + (c.maxScore || 1), 0) * 100
      : 0;

    const withTimeSpent = completions.filter((c) => c.timeSpentSeconds > 0);
    const timeScore = withTimeSpent.length > 10 ? 100 : (withTimeSpent.length / Math.max(totalModules, 1)) * 100;

    return Math.round(
      completionRatio * 40 +
      quizScore * 0.35 +
      timeScore * 0.25
    );
  }

  private async calculateTrustScore(telegramUserId: bigint): Promise<number> {
    const activeConsents = await this.prisma.userConsent.count({
      where: { telegramUserId, isActive: true },
    });

    const requiredTypes = [
      'not_a_bank', 'rewards_not_guaranteed', 'may_lose_value',
      'withdrawal_terms', 'terms_of_service', 'restricted_jurisdiction',
    ];

    const consentsGiven = await this.prisma.userConsent.count({
      where: {
        telegramUserId,
        consentType: { in: requiredTypes as any },
        isActive: true,
      },
    });

    const consentRatio = consentsGiven / requiredTypes.length;
    const consentScore = consentRatio * 60;

    const completions = await this.prisma.educationCompletion.count({
      where: { telegramUserId, status: 'COMPLETED' },
    });
    const totalModules = await this.prisma.educationModule.count({
      where: { isActive: true, mandatory: true },
    });

    const educationTrust = totalModules > 0
      ? (completions / totalModules) * 25
      : 0;

    const loginCount = await this.prisma.user.findUnique({
      where: { telegramUserId },
      select: { loginCount: true },
    });
    const loginScore = Math.min((loginCount?.loginCount || 0) * 5, 15);

    return Math.round(consentScore + educationTrust + loginScore);
  }

  private async calculateEngagementScore(user: any): Promise<number> {
    let score = 0;

    if (user.loginCount > 0) score += 20;
    if (user.loginCount >= 5) score += 15;
    if (user.lastActiveAt) {
      const daysSinceActive = (Date.now() - new Date(user.lastActiveAt).getTime()) / 86400000;
      if (daysSinceActive < 1) score += 25;
      else if (daysSinceActive < 7) score += 15;
      else score += 5;
    }

    const completions = user.educationCompletions?.length || 0;
    score += Math.min(completions * 5, 40);

    return Math.min(score, 100);
  }

  private async calculateRiskScore(user: any): Promise<number> {
    let score = 100;

    if (user.loginCount === 0) score -= 20;
    if (!user.lastActiveAt) score -= 20;

    if (user.deletedAt) score = 0;
    if ((user.state as UserState) === UserState.SUSPENDED_USER) score -= 50;
    if ((user.state as UserState) === UserState.BANNED_USER) score = 0;
    if ((user.state as UserState) === UserState.FROZEN) score -= 30;

    return Math.max(score, 0);
  }
}
