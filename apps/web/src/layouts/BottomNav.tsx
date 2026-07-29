import { Zap, Cpu, Vault, Wallet, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigationStore } from '../store/useNavigationStore';
import { useTreasuryStore } from '../store/useTreasuryStore';
import { Badge } from '../components/Badge';

type TabId = 'friends' | 'boost' | 'mine' | 'treasury' | 'wallet' | 'growth';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigationStore();
  const claimableMissionsCount = useTreasuryStore(
    (s) => s.missions.filter((m) => m.status === 'CLAIMABLE').length
  );

  const navItems: NavItem[] = [
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
    { id: 'growth', label: 'Trust', icon: <ShieldCheck size={18} /> },
    { id: 'mine', label: 'Fleet', icon: <Cpu size={19} /> },
    { id: 'treasury', label: 'Treasury', icon: <Vault size={18} />, badge: claimableMissionsCount },
    { id: 'boost', label: 'Deploy', icon: <Zap size={18} /> },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] lg:max-w-[700px] xl:max-w-[960px] h-[64px] lg:h-[72px] glass-nav rounded-2xl flex items-center justify-around px-1 z-30 select-none">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              relative flex flex-col items-center justify-center flex-1 h-full py-1.5 press-feedback transition-colors duration-150
              ${isActive ? 'text-usdt-green' : 'text-text-secondary hover:text-text-primary'}
            `}
          >
            {/* Animated active backdrop capsule - fits perfectly inside the selected item */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-x-1.5 inset-y-1 rounded-xl bg-usdt-green/10 border border-usdt-green/20 shadow-[0_0_12px_rgba(0,230,118,0.15)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <div className="relative z-10 mb-0.5 flex items-center justify-center">
              {item.icon}
              {item.badge ? (
                <Badge
                  count={item.badge}
                  className="absolute -top-1.5 -right-2.5 shadow-md border border-[#12141d] scale-85"
                />
              ) : null}
            </div>

            <span className={`relative z-10 text-[9px] font-extrabold uppercase tracking-widest leading-none mt-1 ${isActive ? 'text-usdt-green' : 'text-text-tertiary'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
