# Document J: Withdrawal Architecture

This document defines the submission, approval, queue orchestration, and execution pathways for user token withdrawals.

---

## 1. Withdrawal Flow

```
[ User Action: Submit Withdraw ]
               |
               v
     [ Input Validation ] <--- (Checks >= 10 USDT, address format regex)
               |
               v
   [ Balance Debit & Lock ] <--- (Deducts from Available, inserts into Locked)
               |
               v
      [ Approval Layer ]
               |
       +-------+-------+
       | [Amount < $50]| [Amount >= $50 OR Risk Flagged]
       v               v
 [ Auto-Approved ]   [ Pending Admin Review ]
       |               |
       |               | (Admin manual approval)
       v               v
  [ Push to BullMQ withdrawal-queue ]
               |
               v
     [ Queue Worker Processing ]
               |
       +-------+-------+
       | (Success)     | (RPC Error / Insufficient Gas)
       v               v
 [ Broadcast TX ]    [ Queue Retry with Exponential Backoff ]
       |
       v
 [ Check Confirmations ] ---> [ Ledger Commit ] ---> [ Tx Status: COMPLETED ]
```

---

## 2. Validation & Risk Assessment

Before a withdrawal job is pushed to the execution queue, the backend checks:

* **Sufficient Balance Check:**Available balance must be greater than or equal to the requested amount.
* **Format Check:**
  * TON address must pass standard user-friendly base64url format rules.
  * BEP20 address must match `/^0x[a-fA-F0-9]{40}$/`.
* **Risk Engine Checks:**
  * Accounts are flagged for manual review if:
    * Invite rate exceeds `5 friends / hour`.
    * Accumulation speed exceeds mathematically possible bounds (anti-cheat verification).
    * IP address matches banned lists.

---

## 3. Queue Orchestration & Nonce Locking

To prevent transaction failures due to blockchain collision (e.g. duplicate transaction nonces), the system uses a sequential queue processor.

* **BullMQ Concurrency Settings:**
  * `withdrawal-queue` processes transactions with `concurrency: 1` per network adapter to ensure sequential processing.
* **Redis Nonce Locking:**
  * For BEP20 (Binance Smart Chain), the execution worker acquires a distributed lock in Redis for the hot wallet address, fetches the current transaction count (nonce) from the node, signs and broadcasts the transaction, and releases the lock only after the transaction is sent.
  * For TON, the worker tracks seqno counters to serialize transfers.

---

## 4. Fee & Gas Management

* **Gas Coverage:** The system covers network fees. Users receive their full withdrawal amount.
* **Funding Model:** The platform maintains local hot wallets funded with native gas tokens (TON for the TON network, BNB for BSC) and the target asset (USDT).
* **Gas Spike Mitigation:** If RPC providers report network gas prices above a safe limit, the queue worker pauses the withdrawal job and schedules a retry in `5 minutes` to avoid excessive gas payments.

---

## 5. Audit Logging

Every transition of a withdrawal request must write a log record to the database:
* Log schema records: Request ID, Action (Created, Approved, Broadcasted, Confirmed, Failed), Worker ID, and details of gas spent or errors returned.
