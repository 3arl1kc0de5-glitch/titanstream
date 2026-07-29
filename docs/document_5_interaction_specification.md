# Document 5: Interaction Specification

This document defines the interactive behaviors, state changes, and user feedbacks for all controls within the TitanStream Telegram Mini App.

---

## 1. Global Navigation & Header Interaction

### 1.1 Bottom Navigation Bar
* **Tap Event:** Tapping an inactive tab immediately sets the active layout container to the selected screen.
* **Feedback:** The selected tab's icon is enclosed in a green circular background, and its label turns green. Inactive tabs lose their highlights.
* **Badge updates:** The Quests tab badge (e.g. `"26"`) updates in real-time if tasks are completed/claimed.

### 1.2 Gamepad Controller & "?" Buttons
* **Tap Event:** Tapping the Gamepad button triggers routing to the `Games Screen`. Tapping the "?" button triggers a help modal overlay.
* **Feedback:** Standard active touch feedback (button scales down to 95% opacity/size temporarily during click).

### 1.3 Language Dropdown Selector
* **Tap Event:** Clicking the flag icon opens a custom CSS dropdown overlay showing other flags/labels.
* **Feedback:** Chevron icon rotates 180 degrees. Selecting an item updates the UI language and closes the list.

---

## 2. Mine Screen Interactions

### 2.1 Mining Mode Segmented Control
* **Action:** Tap "USDT" or "TON".
* **Feedback:**
  * Selected option slides active background color (green for USDT, blue for TON).
  * Page data updates: The central logo changes to the selected token, the balance updates to the respective token balance, and speed readings scale accordingly.

### 2.2 Cooler Multiplier Gauge
* **Action:** Tapping the cooler spinner or speed bar.
* **Mechanism:** Represents the `"Tap the cooler"` mechanic.
* **Feedback:** Each tap fills the progress slider slightly towards the right (`"max x20.2"`). If the user stops tapping, the progress bar slowly decays back to `"x1"` over time.

---

## 3. Quests & Tasks List Interactions

### 3.1 Category Pill Selection
* **Action:** Swiping horizontally or tapping category pills (e.g., "Daily login", "Friends", "Home screen").
* **Feedback:** The active category pill changes style (green background, black text), and the task list below filters instantly without page reload.

### 3.2 Quest Card Controls
* **Claim Reward:**
  * **Condition:** Task is completed (progress bar is full, or task is verified). The `"Claim"` button turns bright green.
  * **Action:** Clicking `"Claim"` triggers a backend API call.
  * **Feedback:** A success dialog or animation occurs, balance updates in the header, and the quest item is removed or marked as completed.
* **Quest Progress State:**
  * **Condition:** Task is not completed (e.g., progress is `0/3`).
  * **Feedback:** The `"Claim"` button is styled in disabled grey with low opacity.
* **Action Shortcuts:**
  * **"Add" Button:** Triggers the Telegram WebApp prompt to add the mini-app shortcut to the mobile device home screen.
  * **"Post story" Button:** Triggers the native Telegram story editor (`window.Telegram.WebApp.shareToStory`), attaching the custom miner story media.
  * **"Start" Button (Partner Quests):** Opens the third-party Telegram bot/channel link in a new window. The button text shifts to `"Check"` or `"Verify"` to trigger validation after the user joins.

---

## 4. Withdraw Form Interactions

### 4.1 "Max" Button
* **Action:** Tap `"Max"` inside the amount field.
* **Feedback:** The text input value is automatically populated with the user's full USDT/TON balance up to 6 decimal places.

### 4.2 Amount Input Validation
* **Action:** Typing numbers.
* **Rules:**
  * Accepts only numbers and one decimal separator.
  * Checks balance: If input exceeds available balance, or is below 10 USDT, the main submit button remains disabled.

### 4.3 Network Option Buttons
* **Action:** Click `"TON"` or `"BEP20"` cards.
* **Feedback:** Selected network card shows a green outline border. The other card is deselected.

---

## 5. Boost Page Transactions

### 5.1 "Buy" Trigger
* **Action:** Tap the green `"Buy"` button on a Boost Pack card.
* **Feedback:** Launches the Telegram Native Invoice (`window.Telegram.WebApp.openInvoice`) or passes a crypto checkout link. The screen locks with a loading indicator until the transaction is completed or cancelled.

---

## 6. Friends Page Clipboard & Social Share

### 6.1 Copy Buttons
* **Action:** Tapping `"Copy"` inside the link container or the `"Copy link"` pill button.
* **Feedback:** Copies `https://t.me/TS_usdt_bot?start=ref_Z72G1X5A` to the device clipboard. A transient toast banner saying `"Referral link copied!"` appears on screen.

### 6.2 Share Trigger
* **Action:** Tapping the `"Share"` button.
* **Feedback:** Triggers `window.Telegram.WebApp.shareReferralLink`, displaying the Telegram native user/chat selector with a default referral invitation message.
