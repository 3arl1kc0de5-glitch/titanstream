# Document 9: Data Model Inventory

This document defines the logical data schemas and relational entities inferred from the visible user interface states of the TitanStream Telegram Mini App.

---

## 1. User Entity
* **Purpose:** Stores the user profile sync'd from Telegram auth.
* **Fields:**
  * `id` (BigInt, Primary Key): Unique Telegram User ID.
  * `username` (VarChar, Nullable): Telegram handle.
  * `first_name` (VarChar): Telegram first name.
  * `last_name` (VarChar, Nullable): Telegram last name.
  * `referrer_id` (BigInt, Nullable, Foreign Key -> `User.id`): References the user who invited this player.
  * `invited_count` (Integer, Default `0`): Total number of successfully bound referrals.
  * `referral_boost_multiplier` (Decimal, Default `1.0`): The multiplier gained from friends (e.g. `1.0 + (invited_count * 0.02)`).
  * `language_code` (VarChar, Default `'en'`): User language locale setting.
  * `created_at` (Timestamp)
  * `last_active_at` (Timestamp)

---

## 2. Wallet Entity
* **Purpose:** Manages financial balances and statistics.
* **Fields:**
  * `id` (UUID, Primary Key)
  * `user_id` (BigInt, Foreign Key -> `User.id`, Unique constraint): One-to-one mapping to User.
  * `usdt_balance` (Decimal[18, 6], Default `0.000000`): Available USDT balance from mining.
  * `ton_balance` (Decimal[18, 9], Default `0.000000000`): Available TON balance from mining.
  * `crystals_balance` (Integer, Default `0`): Accumulated crystal points.
  * `referral_earned_usdt` (Decimal[18, 6], Default `0.000000`): Total referral commissions in USDT.
  * `referral_earned_ton` (Decimal[18, 9], Default `0.000000000`): Total referral commissions in TON.

---

## 3. MiningSession Entity
* **Purpose:** Represents active mining parameters.
* **Fields:**
  * `id` (UUID, Primary Key)
  * `user_id` (BigInt, Foreign Key -> `User.id`, Unique constraint)
  * `active_currency` (Enum: `'USDT'`, `'TON'`, Default `'USDT'`)
  * `base_speed_ghs` (Decimal[6, 2], Default `2.60`): Current base mining rate.
  * `cooler_multiplier` (Decimal[4, 2], Default `1.00`): Current speed multiplier (e.g. up to `20.20`).
  * `cooler_last_tap` (Timestamp): Timestamp of the last cooling tap (used to calculate decay curves).
  * `last_sync_at` (Timestamp): Used to calculate balance ticks since the last API connection.

---

## 4. Quest & UserQuest Entities
* **Purpose:** Tracks tasks and claim states.

### 4.1 Quest (Master Table)
* **Fields:**
  * `id` (UUID, Primary Key)
  * `type` (Enum: `'Ours'`, `'Partner'`)
  * `category` (VarChar, e.g. `'Daily login'`, `'Friends'`, `'Home screen'`): Used for filtering tab categories.
  * `title` (VarChar): Text shown to users (e.g., `"Invite 3 friends"`).
  * `subtitle` (VarChar): Description details.
  * `reward_type` (Enum: `'Boost'`, `'Crystals'`)
  * `reward_value` (Integer): e.g. `1` for speed boost, `5` for crystals.
  * `target_count` (Integer, Default `1`): Number of completions required.
  * `external_url` (VarChar, Nullable): Redirect links for Partner campaigns.

### 4.2 UserQuest (Join Table)
* **Fields:**
  * `id` (UUID, Primary Key)
  * `user_id` (BigInt, Foreign Key -> `User.id`)
  * `quest_id` (UUID, Foreign Key -> `Quest.id`)
  * `progress_count` (Integer, Default `0`): Current count (e.g. `1` if user has invited 1 out of 3 friends).
  * `status` (Enum: `'In progress'`, `'Claimable'`, `'Claimed'`, Default `'In progress'`)
  * `updated_at` (Timestamp)

---

## 5. WithdrawalRequest Entity
* **Purpose:** Ledger of blockchain payout requests.
* **Fields:**
  * `id` (UUID, Primary Key)
  * `user_id` (BigInt, Foreign Key -> `User.id`)
  * `currency` (Enum: `'USDT'`, `'TON'`)
  * `amount` (Decimal[18, 6])
  * `network` (Enum: `'TON'`, `'BEP20'`)
  * `wallet_address` (VarChar): Destination blockchain address.
  * `tx_hash` (VarChar, Nullable): Blockchain transaction hash after execution.
  * `status` (Enum: `'Pending'`, `'Processing'`, `'Completed'`, `'Failed'`, Default `'Pending'`)
  * `created_at` (Timestamp)

---

## 6. BoostPack & UserBoost Entities
* **Purpose:** Represents purchasable multiplier boost packages.

### 6.1 BoostPack (Master Table)
* **Fields:**
  * `id` (UUID, Primary Key)
  * `multiplier` (Decimal[4, 2]): Speed multiplier factor (e.g. `2.0`, `3.0`, `5.0`).
  * `duration_days` (Integer): Active term (e.g., `10`, `14`, `30`).
  * `price_usd` (Decimal[6, 2]): Cost of the pack (e.g., `3.49`).
  * `original_price_usd` (Decimal[6, 2], Nullable): Original price if on sale.
  * `is_promo` (Boolean, Default `false`): Flags card borders or labels.
  * `promo_badge` (VarChar, Nullable): e.g. `'BEST VALUE'`, `'-44%'`, `'+ ULTRA'`.

### 6.2 UserBoost (Active User Boosts)
* **Fields:**
  * `id` (UUID, Primary Key)
  * `user_id` (BigInt, Foreign Key -> `User.id`)
  * `pack_id` (UUID, Foreign Key -> `BoostPack.id`)
  * `activated_at` (Timestamp)
  * `expires_at` (Timestamp)
