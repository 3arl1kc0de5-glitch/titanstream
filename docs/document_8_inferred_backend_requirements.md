# Document 8: Inferred Backend Requirements

This document specifies the backend service modules, database triggers, validation flows, and blockchain interfaces required to power the TitanStream application.

---

## 1. Authentication & Session Service
* **Purpose:** User registration and validation of Telegram session payloads.
* **Functional Scope:**
  * **Payload Verification:** Receives the cryptographic string `initData` from the WebApp client. Recalculates the HMAC-SHA256 signature using the bot token as the secret to verify the integrity of the data.
  * **Session Synchronization:** Searches for user records matching the Telegram user ID. If not found, registers a new account and links it to any present referrer ID. Returns a JWT or session token.

---

## 2. Mining Engine
* **Purpose:** State calculation and balance tracking of USDT and TON tokens.
* **Functional Scope:**
  * **Mining Tick Computation:** Since real-time DB writes at 60 FPS are unfeasible, the backend calculates the mining balance dynamically using a time-delta approach:
    $$\text{Balance}_{\text{current}} = \text{Balance}_{\text{last\_saved}} + \Delta t \times \text{BaseSpeed} \times \text{ActiveBoosts} \times \text{CoolerMultiplier}$$
  * **Cooler Decay Engine:** Calculates the decay rate of the cooling multiplier. Every user tap triggers a request to extend or increase the multiplier. A background scheduler or delta calculation reduces the multiplier value back towards `x1` if no taps are received.

---

## 3. Quests & Tasks Validation Service
* **Purpose:** Handles completion checking and reward payouts for user tasks.
* **Functional Scope:**
  * **Telegram Group/Channel Check:** Interfaces with the Telegram Bot API (`getChatMember` method) to verify if the user has joined partner channels.
  * **Shortcut / Story Check:** Validates action signatures passed from the Telegram WebApp client for system-level actions (e.g. shortcut installs, story uploads).
  * **Daily Login Tracker:** Tracks daily login streaks and triggers consecutive reward distributions.
  * **Reward Credit Engine:** Updates user balances (adding Crystals or adjusting Speed Boost factors) upon successful quest claims.

---

## 4. Referral Tracking Engine
* **Purpose:** Processes deep links and manages affiliate payouts.
* **Functional Scope:**
  * **Deep Link Resolution:** Parses the command `/start ref_Z72G1X5A` when a bot session is created. Links the referee's ID to the referrer's account in a database table.
  * **Multiplier Appending:** Automatically increments the referrer's multiplier boost by `+0.02x` per verified referee.
  * **Earnings Split: ** When a referee claims mining rewards, the backend computes a `1%` bonus fraction and credits it to the referrer's balance dashboard without depleting the referee's earnings.

---

## 5. Mini-Games Reward Engine
* **Purpose:** Prevents client-side fraud during mini-game sessions.
* **Functional Scope:**
  * **Roulette RNG:** Performs prize calculations on the backend using a secure random generator before animating the client roulette strip.
  * **Basketball Session Handler:** Validates game session timestamps. When the client reports swish points, the engine checks for realistic limits (e.g., maximum swishes per second) to block automated macros, and credits crystals or USDT.

---

## 6. Payment & Shop Service
* **Purpose:** Processes boost pack microtransactions.
* **Functional Scope:**
  * **Invoicing:** Interfaces with the Telegram Stars payment gateway (`sendInvoice`) or a crypto checkout provider.
  * **Boost Activation:** Upon receiving a payment webhook, adds/updates user boost items in the database (e.g. activating a `"Boost x5"` multiplier for `14 days`).

---

## 7. Blockchain Withdrawal Gateway
* **Purpose:** Distributes mined USDT/TON to user addresses.
* **Functional Scope:**
  * **Validation Engine:** Checks that the user's available mining balance is $\ge$ 10 USDT and matches the amount requested. Locks the amount to prevent double spending.
  * **Transaction Queue:** Queues withdrawal transactions and triggers payout scripts.
  * **Network Interface:** Integrates with TON and BSC (BEP20) hot wallet nodes or API providers to broadcast transactions, paying gas/network fees from the platform's gas reserve.
  * **Status Updater:** Monitors tx hash receipts and updates the withdrawal request status in the database (Pending -> Processing -> Completed/Failed).
