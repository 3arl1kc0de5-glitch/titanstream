import { Test, TestingModule } from '@nestjs/testing';
import { CommandCenterConfigService } from './command-center-config.service';
import { PrismaService } from '../../../database/prisma.service';

describe('CommandCenterConfigService', () => {
  let service: CommandCenterConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandCenterConfigService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CommandCenterConfigService>(CommandCenterConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve default mobile money receiving registry', () => {
    const registry = service.getMobileMoneyRegistry();
    expect(registry.length).toBeGreaterThan(0);
    expect(registry[0].ussdTemplate).toContain('{phone}');
  });

  it('should validate and substitute USSD templates correctly', () => {
    const template = '*165*1*1*{phone}*{amount}#';
    const result = service.testUssdTemplate(template, '0771234567', 50000);
    expect(result.generatedUssd).toBe('*165*1*1*0771234567*50000#');
    expect(result.telUri).toBe('tel:*165*1*1*0771234567*50000%23');
  });
});
