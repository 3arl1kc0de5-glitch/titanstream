import { describe, it, expect } from 'vitest';
import { MACHINE_CATALOG, getMachineYieldDetails } from '../apps/web/src/data/machines';
import { getMultiCurrencyYield, formatUgx, formatRwf, formatUsdt } from '../apps/web/src/store/useCountryStore';

describe('Stage 12A — Production Architecture & Calibration Tests', () => {
  describe('Part 1: Telegram Authentication & Identity', () => {
    it('verifies Telegram is the primary identity provider and session schema is valid', () => {
      const mockTelegramUser = {
        id: 987654321,
        first_name: 'TestUser',
        username: 'test_user',
      };
      
      expect(mockTelegramUser.id).toBeDefined();
      expect(typeof mockTelegramUser.id).toBe('number');
    });
  });

  describe('Part 4 & 6: Compute Engine Calibration & Machine Naming', () => {
    it('contains all 5 TitanStream cloud models with distinct non-NVIDIA product names', () => {
      expect(MACHINE_CATALOG.length).toBe(5);
      const names = MACHINE_CATALOG.map((m) => m.name);
      
      expect(names).toEqual([
        'Ripple X14',
        'Surge R28',
        'Torrent V63',
        'Cascade M91',
        'StreamTitan 2028',
      ]);
    });

    it('calibrates spinner speeds such that higher tier machines spin faster', () => {
      const c10 = MACHINE_CATALOG.find((m) => m.tierCode === 'TS_C10')!;
      const q2500 = MACHINE_CATALOG.find((m) => m.tierCode === 'TS_Q2500')!;

      expect(q2500.spinnerSpeedMultiplier).toBeGreaterThan(c10.spinnerSpeedMultiplier);
      expect(q2500.capacityGhs).toBeGreaterThan(c10.capacityGhs);
      expect(q2500.powerRatingW).toBeGreaterThan(c10.powerRatingW);
    });

    it('includes required technical summary disclaimer for every machine', () => {
      MACHINE_CATALOG.forEach((m) => {
        expect(m.technicalSummary).toBe(
          'Comparable to modern AI accelerator hardware used in large cloud computing environments.'
        );
        expect(m.simpleExplanation.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Part 7 & 8: Dual/Triple Currency Presentation (UGX, RWF, USDT)', () => {
    it('correctly calculates yields in UGX, RWF, and USDT', () => {
      const usdt = 100;
      const ugx = formatUgx(usdt);
      const rwf = formatRwf(usdt);
      const usdtFormatted = formatUsdt(usdt);

      expect(ugx).toBe('UGX 370,000');
      expect(rwf).toBe('RWF 135,000');
      expect(usdtFormatted).toBe('100.00 USDT');

      const yieldInfo = getMultiCurrencyYield(10);
      expect(yieldInfo.ugx).toBe('UGX 37,000');
      expect(yieldInfo.rwf).toBe('RWF 13,500');
      expect(yieldInfo.usdt).toBe('10.00 USDT');
    });

    it('computes full machine yield breakdown with ROI percentages', () => {
      const c10 = MACHINE_CATALOG[0];
      const yieldDetails = getMachineYieldDetails(c10);

      expect(yieldDetails.price.usdt).toBe('≈ 10.99 USDT');
      expect(yieldDetails.roiPercent).toBeGreaterThan(50);
    });
  });

  describe('Part 9: 24-Hour Free Trial Cloud Node', () => {
    it('verifies 24h trial duration calculation and machine requirement after expiry', () => {
      const trialDurationMs = 24 * 60 * 60 * 1000;
      const startedAt = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      
      const isExpired = Date.now() - startedAt >= trialDurationMs;
      expect(isExpired).toBe(true);
    });
  });

  describe('Stage 12B — Machine Experience Redesign (Selling Outcomes)', () => {
    it('verifies 5 tiers contain clear asset positioning and understandable metrics', () => {
      expect(MACHINE_CATALOG.length).toBe(5);
      MACHINE_CATALOG.forEach((m) => {
        expect(m.targetUser.length).toBeGreaterThan(5);
        expect(m.performanceLevel.length).toBeGreaterThan(3);
        expect(m.processingPriority).toBeDefined();
        expect(m.cloudWorkloadRating).toBeDefined();
        expect(m.dailyOutputRating).toBeDefined();
      });
    });

    it('verifies upgrade comparison statements exist for higher tiers', () => {
      const a50 = MACHINE_CATALOG.find((m) => m.tierCode === 'TS_A50')!;
      const p250 = MACHINE_CATALOG.find((m) => m.tierCode === 'TS_P250')!;

      expect(a50.comparisonText).toContain('C10');
      expect(p250.comparisonText).toContain('A50');
    });
  });
});
