# Document 4: Feature Specification

This document details the functional specifications for each feature category in the TitanStream Telegram Mini App, derived directly from the audited application states.

---

## 1. Authentication & Security
* **Functional Scope:** Secure Telegram-native login.
* **Requirements:**
  * Uses the native Telegram WebApp SDK (`window.Telegram.WebApp`).
  * Extracts the launch data payload (`initData` and `initDataUnsafe`) to verify user integrity against backend security checks.
  * Captures the Telegram user object (ID, username, first name, last name, language code) during launch to create/sync the user session.
  * Preserves user data throughout tab switching.

---

## 2. Dual-Currency Mining Engine
* **Functional Scope:** Passive/active accumulation of USDT and TON tokens.
* **Requirements:**
  * **Mining Mode Toggle:** Segmented toggle allowing the user to select either USDT or TON mining.
  * **Active Mining Representation:** Spinner graphic (concentric rotating rings around Tether or TON logos) showing active mining status.
  * **Balance Accumulation:** A real-time incrementing numerical readout representing the active currency balance.
  * **Mining Speed Indicator:** Speed reading in GH/s (e.g. `"2.6 GH/s"`).
  * **Cooling Multiplier Slider:** A slider track displaying the active multiplier (e.g. from `"x1"` to `"max x20.2"`).
  * **Cooler Mechanic:** A label `"Tap the cooler"` indicating that the mining speed decreases unless the user periodically interacts with the cooler component.

---

## 3. Mini-Games
* **Functional Scope:** Interactive games that reward USDT, Crystals, or Speed Boosts.
* **Requirements:**
  * **Games Dashboard:** A list of available games.
  * **Roulette Game:**
    * A prize-wheel carousel showing payouts (e.g. USDT 5, USDT 10, USDT 50, Crystals 250, Crystals 500, Boost x10).
    * Yellow arrows select the central prize on spin.
    * Triggered by a `"Play >"` action button.
  * **Basketball Game:**
    * Hoop and court interface where swishes award crystals, and special bonus hoops award USDT.
    * Displays point indicator `"+0.4"`.
    * Triggered by a `"Play >"` action button.

---

## 4. Tasks & Quests (Campaigns)
* **Functional Scope:** Reward system based on user actions.
* **Requirements:**
  * **Ours Tab (Internal Tasks):**
    * Tasks managed by the app, categorized under: "All ours", "Daily login", "Friends", "Taps", "Home screen", etc.
    * Tasks reward either Speed Boosts (e.g., `"+ 1"` lightning) or Crystals (e.g., `"+ 5"` diamonds).
    * Supports progress checking (e.g., "0/3 friends" or "0/1 home screen").
    * Provides action buttons (e.g., `"Add"` for home screen, `"Post story"` for miner status sharing).
    * Active reward claims via the green `"Claim"` button.
  * **Partner Tab (External Ad Tasks):**
    * Displays ad campaigns (e.g. subscribing to third-party Telegram channels or groups).
    * Action button `"Start"` redirects to external links.
    * Reward badge (e.g. `"+ 5"` crystals).
  * **Create Quest Card:**
    * A promotion card targeting channel/project owners, linking to a campaign creator form (`"Create quest"`).

---

## 5. Referral Program
* **Functional Scope:** Reward users for inviting new players.
* **Requirements:**
  * **Stats Dashboard:** Display of Invited count, referral-earned Mining Boost (e.g. `"x1"` base), Earned USDT total, and Earned TON total.
  * **Referral Link Copy Widget:** Box showing user-specific URL (`https://t.me/TS_usdt_bot?start=ref_<ID>`) with a green inline `"Copy"` button.
  * **Social Share Buttons:** Two main buttons: `"Copy link"` and `"Share"` (opens the native Telegram share picker with a pre-filled invitation text).
  * **Referral Benefit Rules:** Lists rewards: `+0.02x` multiplier boost per active friend, `1%` share of referral USDT earnings, and `1%` share of referral TON earnings.
  * **Referrals list:** Dynamic roster displaying friends and their crystal value contribution (currently showing an empty state).

---

## 6. Withdrawals
* **Functional Scope:** Transfer USDT/TON from the application to external crypto wallets.
* **Requirements:**
  * **Balance Card:** Shows the current USDT from mining (same as header balance).
  * **Fee Flag:** A banner reminding the user that the platform pays the blockchain network fees.
  * **Amount Input Field:** Input field with placeholder `"from 10 USDT"`. Minimum withdrawal threshold is 10 USDT.
  * **Max Button:** An inline button `"Max"` that fills the field with the user's total withdrawable balance.
  * **Network Selector:** Buttons to choose between TON and BEP20 (Binance Smart Chain) networks.
  * **Request Log:** Historical list of withdrawal requests (displays an empty state placeholder card if no requests exist).

---

## 7. App Settings & Notifications
* **Functional Scope:** App-wide status and language adjustments.
* **Requirements:**
  * **Help Menu:** Triggered by `?` button. Shows documentation on mining and rewards.
  * **Language Selector:** Dropdown menu allowing selection of languages (default UK flag / English).
  * **Red Notification Badges:** Overlay dots showing unfinished tasks (e.g. badge `"26"` on Quests bottom nav tab, and badges `"21"` and `"8"` on quest sub-categories).
