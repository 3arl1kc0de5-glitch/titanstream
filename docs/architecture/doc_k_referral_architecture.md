# Document K: Referral Architecture

This document defines the referral program architecture, including data bindings, commission engines, and anti-fraud systems.

---

## 1. Referral Binding Lifecycle

```
1. Guest clicks: t.me/TS_usdt_bot?start=ref_Z72G1X5A
                           |
                           v
2. Bot Chat launches, User enters /start ref_Z72G1X5A
                           |
                           v
3. WebApp launches. Client POSTs verification data to /auth/telegram
                           |
                           v
4. Server parses data. Checks user table.
                           |
       +-------------------+-------------------+
       | [New User]                            | [Existing User]
       v                                       v
5. Inserts new User record.            Ignore referral parameters.
   Binds User.referrer_id = 18273645
                           |
                           v
6. Triggers background job:
   - Updates Referrer.invited_count (+1)
   - Recalculates Referrer.referral_boost_multiplier (+0.02x)
   - Writes Audit Log entry
```

---

## 2. Commission Distribution Engine

Referrers receive a `1%` share of all USDT and TON mined by their referees.

* **Trigger:**
  * Commission is not updated on every mining tick. Instead, it is calculated and transferred when the referee performs a balance-updating action (e.g. claiming a quest, registering cooler taps, or toggling mining currencies).
* **Calculation:**
  * When a referee triggers a sync, the server calculates the referee's mining accumulation since their last sync (e.g., `0.045 USDT`).
  * The server computes the commission: `0.045 * 0.01 = 0.00045 USDT`.
  * The server performs a multi-record transaction:
    1. Credits the referee's available balance with `0.045 USDT`.
    2. Credits the referrer's wallet balance with `0.00045 USDT`.
    3. Logs a record in the ledger table: `wallet_ledger_entries` with type `REFERRAL_COMMISSION` referencing the referee's ID.

---

## 3. Fraud Detection & Sybil Prevention

To prevent users from creating thousands of fake Telegram accounts using automation scripts to claim referral boosts, the system implements a multi-tier fraud check:

1. **Telegram Profile Age Check:**
   * The `initData` payload contains the referee's Telegram ID. Numerical IDs represent account age (smaller numbers represent older accounts).
   * Accounts with IDs indicating recent registration (above a set threshold) are marked as suspicious.
2. **Activity Requirement Verification:**
   * The referrer does not receive the `+0.02x` multiplier boost permanently until the referee completes the first `"Open the game"` daily quest.
   * If a referee registers but never plays or taps the cooler, the referral is marked as `"Inactive"`, and the boost is withheld or revoked.
3. **IP & Subnet Fingerprinting:**
   * If multiple referees register using the same IP address or subnet range within a short period, their accounts are flagged, and their referral bonuses are disabled pending manual review.
