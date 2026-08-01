import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Bot, Wallet, ArrowDownToLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import { useTelegram } from '../../context/TelegramContext';
import { withdrawalService } from '../../services/withdrawalService';
import { showToast } from '../Toast';
import { CurrencyDisplay } from '../DualCurrencyDisplay';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawMethod = 'MOBILE_MONEY' | 'MPESA' | 'CRYPTOBOT' | 'USDT_ADDRESS';

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { usdtBalance, fetchBalanceFromEngine } = useWalletStore();
  const { hapticFeedback } = useTelegram();
  
  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const withdrawMethods = [
    {
      id: 'MOBILE_MONEY' as WithdrawMethod,
      name: 'Mobile Money',
      displayName: 'Mobile Money',
      icon: <Smartphone size={22} className="text-usdt-green" />,
      description: 'Withdraw to your mobile money account',
      status: 'ENABLED'
    },
    {
      id: 'MPESA' as WithdrawMethod,
      name: 'M-Pesa',
      displayName: 'M-Pesa',
      icon: <Smartphone size={22} className="text-green-500" />,
      description: 'Withdraw to your M-Pesa account',
      status: 'ENABLED'
    },
    {
      id: 'CRYPTOBOT' as WithdrawMethod,
      name: 'CryptoBot',
      displayName: 'Telegram CryptoBot',
      icon: <Bot size={22} className="text-sky-400" />,
      description: 'Withdraw via Telegram @CryptoBot',
      status: 'ENABLED'
    },
    {
      id: 'USDT_ADDRESS' as WithdrawMethod,
      name: 'USDT Address',
      displayName: 'USDT Wallet Address',
      icon: <Wallet size={22} className="text-purple-400" />,
      description: 'Withdraw to your USDT wallet address',
      status: 'ENABLED'
    }
  ];

  const handleWithdraw = async () => {
    const amountVal = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amountVal) || amountVal <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }

    if (amountVal > usdtBalance) {
      setErrorMsg('Insufficient balance.');
      return;
    }

    let destination = '';
    let destinationType = 'MOBILE_MONEY';

    if (selectedMethod === 'USDT_ADDRESS') {
      if (!walletAddress) {
        setErrorMsg('Please enter a valid USDT address.');
        return;
      }
      destination = walletAddress;
      destinationType = 'CRYPTO_WALLET';
    } else if (selectedMethod === 'MOBILE_MONEY' || selectedMethod === 'MPESA') {
      if (!phoneNumber) {
        setErrorMsg('Please enter your phone number.');
        return;
      }
      destination = phoneNumber;
      destinationType = 'MOBILE_MONEY';
    } else if (selectedMethod === 'CRYPTOBOT') {
      destination = 'Telegram @CryptoBot';
      destinationType = 'CRYPTOBOT';
    }

    setIsProcessing(true);
    setErrorMsg(null);
    hapticFeedback.impactOccurred('medium');

    try {
      await withdrawalService.createWithdrawal({
        asset: 'USDT',
        amount: withdrawAmount,
        destination,
        destinationType,
      });

      hapticFeedback.notificationOccurred('success');
      showToast('Withdrawal request submitted successfully!', 'success');
      
      // Refresh balance from engine
      await fetchBalanceFromEngine();
      
      onClose();
    } catch (err: any) {
      hapticFeedback.notificationOccurred('error');
      const apiErr = err?.response?.data?.error?.message || err?.message || 'Withdrawal failed. Try again.';
      setErrorMsg(apiErr);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center text-sm font-black">
                ₮
              </div>
              <h2 className="text-base font-extrabold text-text-primary">
                {selectedMethod ? withdrawMethods.find(m => m.id === selectedMethod)?.displayName : 'Withdraw USDT'}
              </h2>
            </div>

            <button
              onClick={() => {
                hapticFeedback.impactOccurred('light');
                onClose();
              }}
              className="press-feedback p-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          {/* Balance Display */}
          <div className="bg-control-bg/30 border border-white/5 rounded-2xl p-4 mb-4">
            <div className="text-[10px] text-text-secondary font-bold uppercase mb-1">Available Balance</div>
            <div className="text-2xl font-black text-text-primary font-mono">
              <CurrencyDisplay amount={usdtBalance} size="lg" />
            </div>
            <div className="text-[10px] text-usdt-green mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Ready to withdraw
            </div>
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-error-red/10 border border-error-red/25 text-error-red text-[11px] font-bold flex items-center gap-2 animate-shake">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Body Content */}
          {!selectedMethod ? (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Choose a withdrawal method to transfer your USDT to your preferred destination.
              </p>

              {/* Withdrawal Methods */}
              <div className="space-y-2.5">
                {withdrawMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      hapticFeedback.impactOccurred('medium');
                      setSelectedMethod(method.id);
                      setErrorMsg(null);
                    }}
                    className="press-feedback w-full p-4 rounded-2xl glass-panel border border-white/10 hover:border-usdt-green/40 flex items-center justify-between transition-all group text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-control-bg border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {method.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-text-primary group-hover:text-usdt-green transition-colors">
                            {method.displayName}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-usdt-green/10 text-usdt-green border border-usdt-green/20">
                            Instant
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Back navigation button */}
              <button
                onClick={() => {
                  hapticFeedback.selectionChanged();
                  setSelectedMethod(null);
                  setErrorMsg(null);
                }}
                className="mb-4 text-xs font-bold text-usdt-green flex items-center gap-1 hover:underline"
              >
                ← Choose Different Method
              </button>

              {/* Withdrawal Form */}
              <div className="space-y-4">
                {/* Amount Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase">Withdrawal Amount (USDT)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-mono text-text-tertiary">₮</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      max={usdtBalance}
                      className="w-full bg-control-bg text-text-primary text-sm font-mono font-bold rounded-xl pl-7 pr-3 py-3 border border-white/10 focus:border-usdt-green focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-tertiary">
                    <span>Available: ₮{(Number(usdtBalance) || 0).toFixed(4)}</span>
                    <button
                      onClick={() => setWithdrawAmount(usdtBalance.toString())}
                      className="text-usdt-green font-bold hover:underline"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Method-specific fields */}
                {selectedMethod === 'USDT_ADDRESS' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase">USDT Wallet Address</label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter your USDT address (TRC20/ERC20)"
                      className="w-full bg-control-bg text-text-primary text-sm font-mono rounded-xl px-3 py-3 border border-white/10 focus:border-usdt-green focus:outline-none"
                    />
                    <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                      <AlertCircle size={10} /> Make sure the address is correct
                    </div>
                  </div>
                )}

                {selectedMethod === 'MOBILE_MONEY' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-text-tertiary uppercase">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-control-bg text-text-primary text-sm font-mono rounded-xl px-3 py-3 border border-white/10 focus:border-usdt-green focus:outline-none"
                    />
                  </div>
                )}

                {selectedMethod === 'CRYPTOBOT' && (
                  <div className="bg-control-bg/30 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] text-text-secondary flex items-center gap-2">
                      <Bot size={14} className="text-sky-400" />
                      <span>You'll receive a payment invoice from @CryptoBot</span>
                    </div>
                  </div>
                )}

                {/* Fee Information */}
                <div className="bg-control-bg/30 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[10px] text-text-secondary">Withdrawal Fee</span>
                  <span className="text-[10px] font-mono font-bold text-usdt-green">₮0.00</span>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > usdtBalance}
                  className="press-feedback bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold text-xs py-3 rounded-xl shadow-lg w-full flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-app-bg border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine size={14} /> Confirm Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
