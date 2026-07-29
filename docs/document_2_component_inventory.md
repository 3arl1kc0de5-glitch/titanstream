# Document 2: Component Inventory

This document catalogs every visible UI component in the TitanStream Telegram Mini App, specifying its purpose, approximate size, positioning, visual appearance, interaction model, state changes, and dependencies.

---

## 1. Global Components

### 1.1 Global App Header Bar
* **Purpose:** Displays balances and provides access to help, games, and language options.
* **Position:** Fixed at the top of every screen, directly below the Telegram system header.
* **Sub-components:**
  * **USDT Balance Card:**
    * **Visuals:** Dark grey capsule pill, green Tether (T) logo on the left, bold white text for numerical balance (e.g., `"0.2267"`).
    * **Interaction:** None visible.
  * **Crystals Balance Card:**
    * **Visuals:** Dark grey capsule pill, blue diamond icon on the left, bold white text for crystals count (e.g., `"0"`).
    * **Interaction:** None visible.
  * **Gamepad Button:**
    * **Visuals:** Dark grey circular button containing a white console controller icon. (Only visible on non-Games screens).
    * **Interaction:** Tapping routes the user to the `Games Screen`.
  * **Help Button:**
    * **Visuals:** Dark grey circular button containing a white question mark `"?"`.
    * **Interaction:** Tapping opens a help overlay or modal (`UNKNOWN — Requires additional reference`).
  * **Language Selector:**
    * **Visuals:** Small dropdown showing flag icon (UK flag `🇬🇧` represents English) with a small downward chevron.
    * **Interaction:** Tapping opens a language selection dropdown list.

### 1.2 Global Bottom Navigation Bar
* **Purpose:** Primary application navigation.
* **Position:** Fixed at the very bottom of the viewport.
* **Visuals:** Five vertical navigation icons laid out horizontally. Background is a solid dark grey.
* **Tabs:**
  * **Friends:** Two user shapes icon.
  * **Boost:** Lightning bolt icon.
  * **Mine:** Pickaxe icon.
  * **Quests:** Checklist clipboard icon. Supports a red circular notification badge with white numbers (e.g., `"26"`, `"1"`).
  * **Withdraw:** Wallet/arrow-out icon.
* **States:**
  * **Inactive:** Grey icon, grey text label.
  * **Active:** Selected tab is enclosed in a green circle backdrop, with the icon and label colored in neon green.

---

## 2. Mine Screen Components

### 2.1 Mining Mode Toggle
* **Purpose:** Toggle between USDT and TON mining.
* **Visuals:** Segmented control button capsule. Selected segment has a green background (for USDT) or dark blue (for TON). Text is bold.
* **Interaction:** Tapping switch updates the mining logo, currency symbol, and data.

### 2.2 Mining Spinner Container
* **Purpose:** Graphical representation of the mining engine.
* **Visuals:** Large central circular widget. Tether logo inside a neon-green circle, surrounded by concentric dashed/segmented rings.
* **States:**
  * **Active Mining:** Circles rotate and pulse.
  * **Paused / Stopped Mining:** `UNKNOWN — Requires additional reference`.

### 2.3 Mining Speed Bar Slider
* **Purpose:** Displays mining speed, cooling multipliers, and current progress.
* **Visuals:** Horizontal gauge. A green progress bar tracking the current multiplier level. Tick marks show `"x1"` on the far left and `"max x20.2"` on the far right.
* **Text labels:**
  * Bold green text overlay showing speed (e.g., `"2.6 GH/s"`).
  * Subtitle text below the bar: `"Tap the cooler"`.
* **Interaction:** Users tap/click the cooler to prevent speed decay (`UNKNOWN — Requires additional reference`).

### 2.4 Mine Screen Action Cards (Boost / Invite)
* **Purpose:** Secondary links to Boost and Friends screens.
* **Visuals:** Rounded rectangular cards, dark grey background. Left side holds an icon (lightning for boost, person for invite). Center holds a title and subtitle description. Right side holds a grey chevron arrow.
* **Interaction:** Tapping navigates to respective screen.

---

## 3. Games Screen Components

### 3.1 Game Card (Roulette)
* **Purpose:** Displays Roulette game preview and play trigger.
* **Visuals:** Dark blue-grey rounded container. Top text "Roulette", sub-label "Prize strip with USDT...". Bottom shows a horizontal row of carousel prize items (USDT and boosts) with two yellow marker arrows pointing to the center selected prize.
* **Button:** Pill button on the bottom right containing `"Play >"` with a dark blue background and white text.
* **Interaction:** Tapping `"Play >"` starts the game.

### 3.2 Game Card (Basketball)
* **Purpose:** Displays Basketball game preview and play trigger.
* **Visuals:** Dark blue-grey container. Shows a cartoon hoop/basketball court illustration with score indicator `"+0.4"`.
* **Button:** Pill button `"Play >"` on the bottom right.
* **Interaction:** Tapping `"Play >"` starts the game.

---

## 4. Withdraw Screen Components

### 4.1 Withdrawal History Card (Empty State)
* **Purpose:** Informs users they have no pending/historical requests.
* **Visuals:** Rounded card with a grey dashed border, document/page icon, and description text in muted grey.

### 4.2 Mining Balance Display Card
* **Purpose:** Shows current mining balance available to withdraw.
* **Visuals:** Dark container, small header text `"USDT FROM MINING"`, large green balance value (e.g., `"0.230932 USDT"`), and small description.

### 4.3 Network Fee Banner
* **Purpose:** Notifies user of network fee policy.
* **Visuals:** Thin horizontal banner. Light green background, dark green text, small shield icon on the left.

### 4.4 Withdrawal Amount Input
* **Purpose:** Amount input field.
* **Visuals:** Rounded dark input field box. Left text shows user input. Right side has a green clickable text button `"Max"`.
* **Placeholder:** `"from 10 USDT"`.

### 4.5 Network Selection Cards
* **Purpose:** Select payout blockchain network.
* **Visuals:** Horizontal pair of buttons. Options: `"TON"` (with blue TON logo) and `"BEP20"` (with yellow BSC logo).
* **States:** Selected card has a green border outline (`UNKNOWN — Requires additional reference`).

---

## 5. Quests Screen Components

### 5.1 Quests Tab Switcher
* **Purpose:** Filter between Ours and Partner tasks.
* **Visuals:** Segmented tab layout.
  * **Ours:** Green text if active, accompanied by a light green pill badge containing the number of available tasks (e.g., `"21"`).
  * **Partner:** Muted grey text if inactive, accompanied by a grey pill badge containing the task count (e.g., `"8"`).

### 5.2 Category Pills (Horizontal Scroll)
* **Purpose:** Sub-filtering Ours tasks.
* **Visuals:** Row of capsule pills. Selected pill is neon green with dark text. Unselected pills are dark grey with white text.

### 5.3 Quest Card (Ours)
* **Purpose:** Represents individual quest item.
* **Visuals:** Rounded dark card. Left holds an icon representing the reward (lightning bolt for boost, diamond for crystals). Title, subtitle, and reward value (e.g., `"+ 1"`) are aligned left.
* **Buttons:**
  * **Single Action:** Active green `"Claim"` button, or a grey disabled `"Claim"` button (with progress text `"In progress"`).
  * **Double Action:** A grey action button (e.g., `"Add"` or `"Post story"`) paired with a disabled grey `"Claim"` button.
  * **Progress Bar:** Thin progress indicator showing progress integers (e.g., `"0/3"` or `"0/1"`).

### 5.4 Partner Quest Card
* **Purpose:** Partner sponsored advertising quest.
* **Visuals:** Rounded dark card. Left circle shows handshake icon. Center shows title (e.g., `"MINE WITH AI ⚡️"`), description, and reward badge (e.g., `"+ 5"` with blue crystal diamond icon). Right side has an outlined capsule button with green text `"Start"`.

---

## 6. Boost Screen Components

### 6.1 Boost Pack Card (Standard)
* **Purpose:** Buy mining boost speed pack.
* **Visuals:** Rounded dark card. Left side shows multiplier icon (e.g., `"x2"`, `"x3"`, `"x10"`). Center shows boost details (e.g., `"10 days • instant activation"`), and speed increase values (e.g., `"0.25 -> 0.50 USDT/day"`). Right side shows price in USD (e.g., `"$3.49"`) and a green `"Buy"` button.

### 6.2 Boost Pack Card (Best Value / Special)
* **Purpose:** Promoted boost speed packs.
* **Visuals:** Same as standard card, but with:
  * Gold border outline.
  * Gold multiplier icon (e.g., `"x5"`, `"x20"`).
  * Promotional pill badges (e.g., `"BEST VALUE"`, `"-44%"`, `"-50%"`, `"+ ULTRA"`).
  * Strikethrough pricing (original price crossed out, new price next to it, e.g., `"$17.99 $9.99"`).

---

## 7. Friends Screen Components

### 7.1 Stats Grid Card
* **Purpose:** Overview of referral performance.
* **Visuals:** Large card divided internally into four quad boxes:
  * Invited: numerical value (e.g., `"0"`).
  * Mining boost: multiplier value (e.g., `"x1"`).
  * Earned USDT: balance string (e.g., `"0.000000 USDT"`).
  * Earned TON: balance string (e.g., `"0.000000 TON"`).

### 7.2 Link Input Card
* **Purpose:** Display and copy referral link.
* **Visuals:** Rounded text container displaying the URL. Right side holds a text button `"Copy"` in green.
* **Interaction:** Tapping `"Copy"` copies link to clipboard.

### 7.3 Action Buttons (Copy / Share)
* **Purpose:** Invite utilities.
* **Visuals:** Two side-by-side pill buttons.
  * Left: `"Copy link"` (dark grey/blue background).
  * Right: `"Share"` (teal-green background).

### 7.4 Referral Benefits List
* **Purpose:** Explains referral bonuses.
* **Visuals:** Vertical stack of list items:
  * Item 1: `"+0.02x per friend • now x1"` with green circle badge `"x0.02"`.
  * Item 2: `"1% share of referral USDT"` with green Tether icon badge.
  * Item 3: `"1% share of referral TON"` with blue TON icon badge.
