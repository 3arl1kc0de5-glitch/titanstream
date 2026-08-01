import { getDualCurrencyYield } from '../store/useCountryStore';

export interface FrontendMachineModel {
  id: string;
  tierCode: string;
  name: string;
  tierLabel: string;
  targetUser: string;
  priceUsdt: number;
  capacityGhs: number;
  powerRatingW: number;
  description: string;
  technicalSummary: string;
  simpleExplanation: string;
  personality: string;
  dailyYieldUsdt: number;
  performanceLevel: string;
  computeCapacityText: string;
  processingPriority: string;
  cloudWorkloadRating: string;
  dailyOutputRating: string;
  workloadClass: string;
  processingIndex: string;
  fabricThroughput: string;
  capacityScore: number;
  comparisonText?: string;
  isPopular?: boolean;
  status: 'ACTIVE' | 'AVAILABLE' | 'LOCKED' | 'MAINTENANCE';
  spinnerSpeedMultiplier: number;
  
  // Generic business configuration rules
  earningsCap?: number;
  durationHours?: number;
  passiveYieldRate?: number;
}

export const MACHINE_CATALOG: FrontendMachineModel[] = [
  {
    id: 'free-trial',
    tierCode: 'TS_TRIAL',
    name: 'Free Trial Core',
    tierLabel: 'Trial Tier',
    targetUser: 'Try out the stream platform.',
    priceUsdt: 0.0,
    capacityGhs: 1.0,
    powerRatingW: 10,
    description: 'Temporary trial core with limited capability.',
    technicalSummary: 'Limited duration testing core.',
    simpleExplanation: 'Free entry-level node to test the streaming environment.',
    personality: 'Ideal for trial run.',
    dailyYieldUsdt: 2.0, // Yield factor: yields exactly 0.02 USDT per tap at ×1.0 multiplier
    performanceLevel: 'Trial Tier',
    computeCapacityText: '10 CU Allocation',
    processingPriority: 'Low Priority',
    cloudWorkloadRating: 'Trial Workload',
    dailyOutputRating: 'Trial Stream Output',
    workloadClass: 'Trial Workload',
    processingIndex: 'PX-TRIAL',
    fabricThroughput: '2 Gbps',
    capacityScore: 10,
    status: 'ACTIVE',
    spinnerSpeedMultiplier: 0.5,
    earningsCap: 5.0,
    durationHours: 48,
    passiveYieldRate: 0.00005,
  },
  {
    id: 'ripple-x14',
    tierCode: 'TS_C10',
    name: 'Ripple X14',
    tierLabel: 'Tier 1',
    targetUser: 'Perfect for getting started.',
    priceUsdt: 10.99,
    capacityGhs: 5.0,
    powerRatingW: 50,
    description: 'Entry-level compute node suitable for foundational cloud processing.',
    technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
    simpleExplanation: 'Entry-level processing node designed for consistent daily earnings.',
    personality: 'Optimized for lightweight AI requests.',
    dailyYieldUsdt: 0.27,
    performanceLevel: 'Starter Tier',
    computeCapacityText: '24 CU Allocation',
    processingPriority: 'Standard Queue',
    cloudWorkloadRating: 'Baseline Cloud Workload',
    dailyOutputRating: 'Starter Stream Output',
    workloadClass: 'L1 AI Workload',
    processingIndex: 'PX-14',
    fabricThroughput: '12 Gbps',
    capacityScore: 35,
    status: 'AVAILABLE',
    spinnerSpeedMultiplier: 0.8,
    passiveYieldRate: 0.0001,
  },
  {
    id: 'surge-r28',
    tierCode: 'TS_A50',
    name: 'Surge R28',
    tierLabel: 'Tier 2',
    targetUser: 'Designed for growing daily earnings.',
    priceUsdt: 50.0,
    capacityGhs: 25.0,
    powerRatingW: 250,
    description: 'Advanced processing node built for active cloud workload scaling.',
    technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
    simpleExplanation: 'Expanded compute capacity delivering a noticeable daily earnings boost.',
    personality: 'Optimized for continuous cloud processing.',
    dailyYieldUsdt: 1.40,
    performanceLevel: 'Growth Tier',
    computeCapacityText: '120 CU Allocation',
    processingPriority: 'Accelerated Queue',
    cloudWorkloadRating: 'High-Frequency Processing',
    dailyOutputRating: 'Enhanced Stream Output',
    workloadClass: 'L2 AI Workload',
    processingIndex: 'PX-28',
    fabricThroughput: '48 Gbps',
    capacityScore: 60,
    comparisonText: 'Processes approximately 5× more cloud work than Ripple X14.',
    status: 'AVAILABLE',
    spinnerSpeedMultiplier: 1.5,
    passiveYieldRate: 0.0001,
  },
  {
    id: 'torrent-v63',
    tierCode: 'TS_P250',
    name: 'Torrent V63',
    tierLabel: 'Tier 3',
    targetUser: 'Built for users scaling cloud capacity.',
    priceUsdt: 250.0,
    capacityGhs: 130.0,
    powerRatingW: 1200,
    description: 'High-performance multi-core cluster engineered for high daily data throughput.',
    technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
    simpleExplanation: 'High-performance computing cluster built for active cloud accumulators.',
    personality: 'Optimized for high-volume data streams.',
    dailyYieldUsdt: 7.50,
    performanceLevel: 'High-Performance',
    computeCapacityText: '620 CU Allocation',
    processingPriority: 'Enterprise Queue',
    cloudWorkloadRating: 'Enterprise Data Pipeline',
    dailyOutputRating: 'High-Yield Stream Output',
    workloadClass: 'L3 AI Workload',
    processingIndex: 'PX-63',
    fabricThroughput: '240 Gbps',
    capacityScore: 82,
    comparisonText: 'Processes approximately 5.3× more cloud work than Surge R28.',
    isPopular: true,
    status: 'AVAILABLE',
    spinnerSpeedMultiplier: 2.2,
    passiveYieldRate: 0.0001,
  },
  {
    id: 'cascade-m91',
    tierCode: 'TS_X1000',
    name: 'Cascade M91',
    tierLabel: 'Tier 4',
    targetUser: 'Built for users seeking high-volume cloud allocation.',
    priceUsdt: 1000.0,
    capacityGhs: 550.0,
    powerRatingW: 4500,
    description: 'Professional enterprise supercomputing array delivering massive daily throughput.',
    technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
    simpleExplanation: 'Professional hardware array for demanding AI & parallel cloud data workflows.',
    personality: 'Optimized for enterprise AI pipelines.',
    dailyYieldUsdt: 32.00,
    performanceLevel: 'Professional Tier',
    computeCapacityText: '2,600 CU Allocation',
    processingPriority: 'Priority Allocation',
    cloudWorkloadRating: 'HyperScale Parallel Core',
    dailyOutputRating: 'Professional Stream Output',
    workloadClass: 'L4 AI Workload',
    processingIndex: 'PX-91',
    fabricThroughput: '960 Gbps',
    capacityScore: 94,
    comparisonText: 'Processes approximately 4.2× more cloud work than Torrent V63.',
    status: 'AVAILABLE',
    spinnerSpeedMultiplier: 3.0,
    passiveYieldRate: 0.0001,
  },
  {
    id: 'streamtitan-2028',
    tierCode: 'TS_Q2500',
    name: 'StreamTitan 2028',
    tierLabel: 'Tier 5',
    targetUser: 'Enterprise performance for maximum compute allocation.',
    priceUsdt: 2500.0,
    capacityGhs: 1500.0,
    powerRatingW: 12000,
    description: 'Flagship enterprise quantum supercomputer cluster for maximum capacity allocation.',
    technicalSummary: 'Comparable to modern AI accelerator hardware used in large cloud computing environments.',
    simpleExplanation: 'Ultimate enterprise computing tier producing industry-leading daily yields.',
    personality: 'Optimized for hyperscale compute allocation.',
    dailyYieldUsdt: 85.00,
    performanceLevel: 'Flagship Enterprise',
    computeCapacityText: '7,500 CU Allocation',
    processingPriority: 'Maximum Priority (Priority 5)',
    cloudWorkloadRating: 'Quantum Supercluster Array',
    dailyOutputRating: 'Maximum Stream Output',
    workloadClass: 'L5 AI Workload',
    processingIndex: 'PX-2028',
    fabricThroughput: '2.5 Tbps',
    capacityScore: 99,
    comparisonText: 'Processes approximately 2.6× more cloud work than Cascade M91.',
    status: 'AVAILABLE',
    spinnerSpeedMultiplier: 3.8,
    passiveYieldRate: 0.0001,
  },
];

// Helper to compute full yield details for a machine model
export const getMachineYieldDetails = (machine: FrontendMachineModel) => {
  const dailyUsdt = machine.dailyYieldUsdt;
  const weeklyUsdt = dailyUsdt * 7;
  const monthlyUsdt = dailyUsdt * 30;
  const annualUsdt = dailyUsdt * 365;

  const estimatedRoiPercent = Math.round((monthlyUsdt / machine.priceUsdt) * 100);

  return {
    price: getDualCurrencyYield(machine.priceUsdt),
    daily: getDualCurrencyYield(dailyUsdt),
    weekly: getDualCurrencyYield(weeklyUsdt),
    monthly: getDualCurrencyYield(monthlyUsdt),
    annual: getDualCurrencyYield(annualUsdt),
    roiPercent: estimatedRoiPercent,
  };
};
