import { useTelegram } from '../context/TelegramContext';

export const useHaptics = () => {
  const { hapticFeedback } = useTelegram();
  return hapticFeedback;
};
