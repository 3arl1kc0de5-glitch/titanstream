import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        onboardingProgress: true,
        educationCompletions: {
          include: { module: true },
        },
        userConsents: {
          where: { isActive: true },
        },
        readinessScores: true,
      },
    });

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    return {
      telegramUserId: Number(user.telegramUserId),
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      languageCode: user.languageCode,
      state: user.state,
      loginCount: user.loginCount,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      educationScore: user.educationScore,
      readinessScore: user.readinessScore,
      isReady: user.isReady,
      onboardingProgress: user.onboardingProgress,
      educationProgress: user.educationCompletions.map((ec) => ({
        moduleId: ec.moduleId,
        moduleTitle: ec.module.title,
        status: ec.status,
        score: ec.score,
        passed: ec.passed,
        completedAt: ec.completedAt,
      })),
      consents: user.userConsents.map((c) => ({
        type: c.consentType,
        version: c.version,
        createdAt: c.createdAt,
      })),
      readiness: user.readinessScores,
    };
  }

  async updateProfile(telegramUserId: bigint, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const updated = await this.prisma.user.update({
      where: { telegramUserId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.languageCode && { languageCode: dto.languageCode }),
        ...(dto.photoUrl && { photoUrl: dto.photoUrl }),
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.USER_UPDATED,
      description: 'User profile updated',
      metadata: dto,
    });

    return this.sanitize(updated);
  }

  private sanitize(user: any) {
    return {
      telegramUserId: Number(user.telegramUserId),
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      languageCode: user.languageCode,
      state: user.state,
    };
  }
}