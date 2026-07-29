export interface StateConfig {
  allowedTransitions: string[];
  triggers: Record<string, TransitionTrigger>;
  blockedActions: string[];
  allowedActions?: string[];
  description: string;
}

export interface TransitionTrigger {
  type: 'auto' | 'step' | 'event' | 'cron' | 'admin';
  condition?: string;
  stepId?: string;
  event?: string;
}

export interface ActionAuthorization {
  allowed: boolean;
  blockedActions: string[];
  state: string;
}
