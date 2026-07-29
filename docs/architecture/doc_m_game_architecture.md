# Document M: Game Architecture

This document defines the game engine integration, session tracking state machines, score validation algorithms, and anti-cheat mechanisms.

---

## 1. Game Session Lifecycle

To prevent score spoofing, game sessions are cryptographically signed and tracked on the server.

```
[ Client Action: Click Play ]
              |
              v
     [ POST /game/session/start ]
              |
              v
   [ Generate Server Session ] ---> [ Save Session ID, StartTime, Token in Redis ]
              |
              v
    [ Return Session Token ]
              |
              v
  [ Client launches HTML5 Game ]
              |
              v
   [ Gameplay active on Client ] <--- (Client logs physics event timeline)
              |
              v
  [ Game End: Send Session Token + Score + Event Log ]
              |
              v
    [ POST /game/session/end ]
              |
              v
    [ Server Verification ] <--- (Validates duration, score curves, physics bounds)
              |
       +------+------+
       | (Valid)     | (Suspicious)
       v             v
 [ Credit Reward ]  [ Flag Fraud / Void Session ]
```

---

## 2. Server-Authoritative Score Validation

The backend verifies client-reported scores using a physics and telemetry validation engine.

* **Duration Verification:**
  * Checks: `duration = ServerEndTime - ServerStartTime`.
  * If the client reports a score that is mathematically impossible within that timeframe, the session is discarded.
* **Telemetry Event Log Check:**
  * The client logs key game actions (e.g. swishes, jumps, target taps) with microsecond timestamps: `{ action: "swish", t: 1420 }`.
  * The server parses this event array. It checks for:
    * **Temporal Spacing:** Taps or swishes occurring closer than the game's physical cooldown limits (e.g. throwing balls faster than physics allows).
    * **Uniform Interval Detection:** Checks for uniform intervals between clicks (indicating bot scripting or macro usage).

---

## 3. Game Plugin System

The architecture is designed to support new game additions (e.g. slots, arcade run) without changing the core backend logic, using a standard Game Interface.

```typescript
export interface IGamePlugin {
  getGameId(): string;
  calculateReward(score: number): { crystals: number; usdt: number };
  validateTelemetry(session: GameSession, telemetryLog: any[]): boolean;
}
```

* **Plugin Registry:**
  * Developers add new game modules by implementing `IGamePlugin` and registering them in the `GameModule` provider registry.
  * The `/game/session/end` route maps requests to the correct validator:
    `const plugin = this.pluginRegistry.get(session.gameId);`
    `const isValid = plugin.validateTelemetry(session, body.telemetryLog);`
