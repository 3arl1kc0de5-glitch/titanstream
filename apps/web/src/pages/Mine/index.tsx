import type React from 'react';
import { useEffect } from 'react';
import { MiningModeToggle } from './components/MiningModeToggle';
import { MiningSpinner } from './components/MiningSpinner';
import { BalanceDisplay } from './components/BalanceDisplay';
import { CoolerSlider } from './components/CoolerSlider';
import { ActionCards } from './components/ActionCards';
import { useMiningStore } from '../../store/useMiningStore';
import { useWalletStore } from '../../store/useWalletStore';

export const MineScreen: React.FC = () => {
  const { fetchMiningState } = useMiningStore();
  const { fetchBalanceFromEngine } = useWalletStore();

  useEffect(() => {
    fetchMiningState();
    fetchBalanceFromEngine();
  }, [fetchMiningState, fetchBalanceFromEngine]);

  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      <MiningModeToggle />
      <MiningSpinner />
      <BalanceDisplay />
      <CoolerSlider />
      <ActionCards />
    </div>
  );
};
