// TelegramLoginScreen is now a re-export alias of AuthGate.
// AuthGate owns the complete authentication lifecycle (Mini App + Web Widget).
// This file is kept for backward compatibility with any imports.
export { AuthGate as TelegramLoginScreen } from './AuthGate';
