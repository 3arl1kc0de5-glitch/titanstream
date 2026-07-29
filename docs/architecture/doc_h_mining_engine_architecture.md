# Document H: Mining Engine Architecture

This document defines the mathematical equations, synchronization lifecycles, and anti-cheat validations governing USDT and TON mining.

---

## 1. Mining Reward Accumulation Model

To maintain client responsiveness without excessive database writes, balance calculation is executed using a server-authoritative time-delta formula.

$$\text{Yield} (\Delta t) = \int_{0}^{\Delta t} \text{Rate}_{\text{base}} \times B_{\text{purchased}}(t) \times B_{\text{referral}} \times M_{\text{cooler}}(t) \, dt$$

Where:
* $\text{Rate}_{\text{base}}$: Base token yield per second (equivalent to standard base mining rates, e.g. `0.25 USDT / 86400` seconds).
* $B_{\text{purchased}}(t)$: Active purchased speed multipliers (sum of unexpired x2, x3, x5 boost packs, or `1.0` if none are active).
* $B_{\text{referral}}$: Active referral boost factor (e.g., `1.0 + (invited_count * 0.02)`).
* $M_{\text{cooler}}(t)$: Active cooling multiplier decay function.

---

## 2. Cooler Multiplier Decay Model

Tapping the cooler increases the mining speed multiplier to a maximum cap (e.g., `x20.2`). When tapping stops, the multiplier decays exponentially back to `x1.0`.

$$M_{\text{cooler}}(t) = 1.0 + (M_{\text{cooler}}(0) - 1.0) \times e^{-\lambda t}$$

Where:
* $M_{\text{cooler}}(0)$: The multiplier value at the moment of the last tap.
* $t$: Time in seconds elapsed since the last tap.
* $\lambda$: Decay rate constant (e.g. $\lambda = 0.000577$, resulting in a half-life of 20 minutes).

### 2.1 Multiplier Increment
* Each validated tap increments $M_{\text{cooler}}$ by a fixed coefficient (e.g. `+0.05`), capped at the maximum value configured in system settings (`max x20.2`).

---

## 3. Balance Synchronization (Client vs Server)

```
[ TMA React Client ]                                 [ NestJS API Server ]
        |                                                     |
        |---- 1. GET /profile ------------------------------->| (Calculates server time-delta)
        |<--- 2. Return last saved balance & speed params ----|
        |                                                     |
        | (Starts local window.requestAnimationFrame          |
        |  to tick the UI odometer using cached parameters)   |
        |                                                     |
        |---- 3. POST /mining/tap { tapCount } -------------->| (Calculates exact decay since last tap,
        |                                                     |  verifies tap speed, adds multiplier,
        |                                                     |  updates ledger, commits to Redis cache)
        |<--- 4. Return new multiplier & verified balance ----|
        |                                                     |
        | (Updates local odometer offset variables)            |
```

* **Client Ticker:** The frontend interpolates the balance increment locally using standard JS animation frames to create a smooth ticking odometer.
* **Server Authority:** The client-side ticker is for display purposes only. The database and Redis cache balances are updated during API invocations (`/mining/tap`, `/mining/toggle`, `/withdraw`, `/quests/:id/claim`).

---

## 4. Anti-Cheat & Fraud Prevention

To prevent users from using software macros or auto-clickers to keep the cooler at `max x20.2` permanently, the server enforces three boundary checks:

1. **Tap Ceiling Constraint:**
   * Requests containing a `tapCount` that translates to more than `10 taps/second` (based on timestamps since the last request) are flagged. The excess taps are dropped, and the user's IP is temporarily throttled.
2. **Ascending Chronological Timestamps:**
   * Requests must contain a client-side timestamp `clientTimestamp`. The server validates that `clientTimestamp` is greater than the previous request's timestamp. If a request has an old or backdated timestamp, it is discarded.
3. **Decay Consistency Check:**
   * The server recalculates decay using its own network system clock. If the client claims a high multiplier value that does not match the computed exponential decay history, the server overwrites the multiplier with its own calculated value.
