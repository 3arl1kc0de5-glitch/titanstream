import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';
import { SecurityHardeningService } from './services/security-hardening.service';
import { SecurityHardeningController } from './controllers/security-hardening.controller';
import { LaunchCertificationService } from './services/launch-certification.service';
import { LaunchCertificationController } from './controllers/launch-certification.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AdminModule)],
  controllers: [ReadinessController, SecurityHardeningController, LaunchCertificationController],
  providers: [ReadinessService, SecurityHardeningService, LaunchCertificationService],
  exports: [ReadinessService, SecurityHardeningService, LaunchCertificationService],
})
export class ReadinessModule {}