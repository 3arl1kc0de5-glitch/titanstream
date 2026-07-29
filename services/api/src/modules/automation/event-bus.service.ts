import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface PlatformEvent<T = any> {
  id: string;             // Unique event UUID
  type: string;           // e.g. 'SettlementCompleted', 'WithdrawalRequested'
  timestamp: Date;
  correlationId: string;  // Trace ID across modules
  actorId?: string;       // User or Admin trigger ID
  payload: T;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly bus = new Subject<PlatformEvent>();

  /**
   * Publish a new event onto the global event bus.
   */
  publish<T>(event: Omit<PlatformEvent<T>, 'id' | 'timestamp'>) {
    const fullEvent: PlatformEvent<T> = {
      id: `evt_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: new Date(),
      ...event,
    };
    
    this.logger.log(`[EventBus] Publishing event: ${fullEvent.type} (Correlation ID: ${fullEvent.correlationId})`);
    this.bus.next(fullEvent);
  }

  /**
   * Listen to events of a specific type.
   * Returns an Observable stream.
   */
  on<T>(eventType: string): Observable<PlatformEvent<T>> {
    return this.bus.asObservable().pipe(
      filter((event) => event.type === eventType)
    ) as Observable<PlatformEvent<T>>;
  }

  /**
   * Listen to all events on the bus.
   */
  all(): Observable<PlatformEvent> {
    return this.bus.asObservable();
  }
}
