import type React from 'react';
import { useState, useEffect } from 'react';
import { 
  commandCenterService, 
  type MobileMoneyConfig, 
  type CryptoWalletConfig, 
  type CommandCenterSettings, 
  type AdminAccountRecord 
} from '@/services/commandCenterService';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { Smartphone, Wallet, Play, Plus, Settings, UserCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { showToast } from '@/components/Toast';

export const SettingsPage: React.FC = () => {
  const [section, setSection] = useState<'mobile_money' | 'crypto_wallets' | 'ussd_engine' | 'settings' | 'admins'>('mobile_money');
  const [mmConfigs, setMmConfigs] = useState<MobileMoneyConfig[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWalletConfig[]>([]);
  const [settings, setSettings] = useState<CommandCenterSettings | null>(null);
  const [admins, setAdmins] = useState<AdminAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // USSD Tester state
  const [testTemplate, setTestTemplate] = useState('*165*1*1*{phone}*{amount}#');
  const [testPhone, setTestPhone] = useState('0771234567');
  const [testAmount, setTestAmount] = useState(50000);
  const [testResult, setTestResult] = useState<any>(null);

  // Admin Invite State
  const [inviteTgId, setInviteTgId] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('TREASURY_OPERATOR');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mm, cw, st, ad] = await Promise.all([
        commandCenterService.getMobileMoneyRegistry(),
        commandCenterService.getCryptoWalletRegistry(),
        commandCenterService.getSettings(),
        commandCenterService.getAdminAccounts(),
      ]);
      setMmConfigs(mm);
      setCryptoWallets(cw);
      setSettings(st);
      setAdmins(ad);
    } catch (err: any) {
      console.warn('Failed to load Command Center settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestUssd = async () => {
    try {
      const res = await commandCenterService.testUssdTemplate(testTemplate, testPhone, testAmount);
      setTestResult(res);
      showToast('USSD Template validated cleanly!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'USSD Template validation failed', 'error');
    }
  };

  const handleToggleMmStatus = async (cfg: MobileMoneyConfig) => {
    const nextStatus = cfg.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const updated = await commandCenterService.upsertMobileMoney({ ...cfg, status: nextStatus });
      setMmConfigs(mmConfigs.map((m) => (m.id === cfg.id ? updated : m)));
      showToast(`Receiving number ${cfg.phoneNumber} is now ${nextStatus}`, 'info');
    } catch (err: any) {
      showToast('Failed to update receiving number status', 'error');
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTgId || !inviteName) return;
    try {
      const newAdmin = await commandCenterService.inviteAdmin(inviteTgId, inviteName, inviteRole);
      setAdmins([...admins, newAdmin]);
      setInviteTgId('');
      setInviteName('');
      showToast(`Admin ${newAdmin.name} onboarded cleanly!`, 'success');
    } catch (err: any) {
      showToast('Failed to invite admin', 'error');
    }
  };

  const sections = [
    { id: 'mobile_money', label: 'Mobile Money Registry', icon: Smartphone },
    { id: 'crypto_wallets', label: 'Crypto Wallets', icon: Wallet },
    { id: 'ussd_engine', label: 'USSD Engine Tester', icon: Play },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'admins', label: 'Admin RBAC', icon: UserCheck },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                section === s.id
                  ? 'bg-usdt-green text-app-bg shadow-md'
                  : 'bg-card-bg text-text-secondary border border-white/10 hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Mobile Money Receiving Registry */}
      {section === 'mobile_money' && (
        <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Smartphone size={18} className="text-usdt-green" /> Configurable Mobile Money Receiving Registry
              </h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                Receiving numbers and USSD templates configured dynamically. Zero code deployments required.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {mmConfigs.map((cfg) => (
              <div key={cfg.id} className="p-4 rounded-xl bg-control-bg border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-text-primary text-sm">{cfg.displayName}</span>
                    <span className="px-2 py-0.5 rounded bg-usdt-green/20 text-usdt-green font-mono text-[10px] font-bold">
                      {cfg.provider} ({cfg.country})
                    </span>
                    <span className="text-xs font-mono font-bold text-text-secondary">Phone: {cfg.phoneNumber}</span>
                  </div>
                  <div className="text-xs font-mono text-usdt-green">
                    USSD Template: <code>{cfg.ussdTemplate}</code>
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    Priority: {cfg.priority} | Daily Capacity: ${(Number(cfg.dailyCapacityUsdt) || 0).toLocaleString()} USDT | Notes: {cfg.notes}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleToggleMmStatus(cfg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                      cfg.status === 'ACTIVE' ? 'bg-usdt-green text-app-bg' : 'bg-white/10 text-text-tertiary'
                    }`}
                  >
                    {cfg.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Crypto Receiving Wallets */}
      {section === 'crypto_wallets' && (
        <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Wallet size={18} className="text-ton-blue" /> Configurable Crypto Receiving Wallets Registry
          </h3>

          <div className="space-y-3">
            {cryptoWallets.map((cw) => (
              <div key={cw.id} className="p-4 rounded-xl bg-control-bg border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-text-primary text-sm">{cw.label}</span>
                    <span className="px-2 py-0.5 rounded bg-ton-blue/20 text-ton-blue font-mono text-[10px] font-bold">
                      {cw.asset} ({cw.network})
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-usdt-green/20 text-usdt-green font-mono text-[10px] font-bold">
                    {cw.status}
                  </span>
                </div>
                <code className="text-xs text-text-secondary font-mono bg-app-bg p-2 rounded-lg block truncate">
                  {cw.address}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. USSD Engine Tester */}
      {section === 'ussd_engine' && (
        <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <Play size={18} className="text-usdt-green" /> USSD Template Engine & Live Protocol Previewer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary">USSD Template</label>
              <input
                type="text"
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="w-full h-10 px-3 bg-control-bg border border-white/10 rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-usdt-green"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary">Receiving Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full h-10 px-3 bg-control-bg border border-white/10 rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-usdt-green"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary">Amount (Local)</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-full h-10 px-3 bg-control-bg border border-white/10 rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-usdt-green"
              />
            </div>
          </div>

          <button
            onClick={handleTestUssd}
            className="px-4 py-2.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Play size={14} /> Validate & Generate USSD Launcher
          </button>

          {testResult && (
            <div className="p-4 rounded-xl bg-usdt-green/10 border border-usdt-green/30 space-y-2 text-xs">
              <div className="font-extrabold text-usdt-green">🟢 Valid USSD Push String Generated:</div>
              <div className="font-mono text-sm font-bold text-text-primary bg-control-bg p-2.5 rounded-lg border border-white/10">
                {testResult.generatedUssd}
              </div>
              <div className="text-text-secondary">
                URI Protocol: <code className="text-usdt-green font-mono">{testResult.telUri}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Admin Management & RBAC */}
      {section === 'admins' && (
        <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <UserCheck size={18} className="text-usdt-green" /> Authenticated Telegram Admin Management & RBAC
          </h3>

          <form onSubmit={handleInviteAdmin} className="p-4 rounded-xl bg-control-bg border border-white/10 space-y-3">
            <div className="text-xs font-bold text-text-primary">Invite New Telegram Admin</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Telegram User ID (e.g. 88102931)"
                value={inviteTgId}
                onChange={(e) => setInviteTgId(e.target.value)}
                className="h-10 px-3 bg-app-bg border border-white/10 rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-usdt-green"
              />
              <input
                type="text"
                required
                placeholder="Admin Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="h-10 px-3 bg-app-bg border border-white/10 rounded-xl text-xs text-text-primary focus:outline-none focus:border-usdt-green"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-10 px-3 bg-app-bg border border-white/10 rounded-xl text-xs text-text-primary focus:outline-none focus:border-usdt-green"
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="TREASURY_MANAGER">TREASURY_MANAGER</option>
                <option value="TREASURY_OPERATOR">TREASURY_OPERATOR</option>
                <option value="SUPPORT">SUPPORT</option>
                <option value="OPERATIONS">OPERATIONS</option>
                <option value="ANALYST">ANALYST</option>
                <option value="READ_ONLY">READ_ONLY</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus size={14} /> Onboard Admin User
            </button>
          </form>

          <div className="space-y-2">
            {admins.map((ad) => (
              <div key={ad.id} className="p-3 rounded-xl bg-control-bg/60 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-text-primary">{ad.name}</div>
                  <div className="text-[10px] text-text-tertiary">Telegram ID: {ad.telegramUserId} | Role: {ad.role}</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-usdt-green/20 text-usdt-green font-mono text-[10px] font-bold">
                  {ad.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
