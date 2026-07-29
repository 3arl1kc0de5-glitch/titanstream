# Document 10: Unknown Items Requiring More Evidence

This document registers all functional gaps, missing layouts, and ambiguous rules that cannot be verified solely from the 7 unique reference screenshots. These items are flagged as `UNKNOWN — Requires additional reference` to prevent guessing or inventing features.

---

## 1. Mining Mechanics & Decays

* **Cooler Decay Rate:**
  * > UNKNOWN — Requires additional reference.
  * The rate at which the cooler speed multiplier (from `x1` to `max x20.2`) decays over time is unknown.
  * It is unknown if the decay is linear, exponential, or if it stops decaying at a certain baseline speed.
* **Cooler Tap Increments:**
  * > UNKNOWN — Requires additional reference.
  * The speed multiplier increase per tap is unknown. (e.g. does one tap increment the multiplier by `+0.1x`, or is it dependent on tap frequency?)
* **TON Mining Configuration:**
  * > UNKNOWN — Requires additional reference.
  * It is unknown if the base mining speed for TON is identical to USDT (`2.6 GH/s` base) or if it has a different baseline speed.
  * It is unknown if the visual styling (accent colors, spinners) changes from green to blue when switching the toggle to TON.

---

## 2. Withdrawal Screen Details

* **Submit Button Placement:**
  * > UNKNOWN — Requires additional reference.
  * The visual style, text, and position of the main withdrawal submit button are unknown because they are located below the viewport fold in the reference screenshot.
* **Withdrawal Limits & Fees:**
  * > UNKNOWN — Requires additional reference.
  * While the minimum threshold is documented as `10 USDT`, the maximum transaction limit and daily caps are unknown.
  * It is unknown if there is a flat or percentage processing fee withheld by the system, despite the banner claiming the system covers the network gas fee.
* **Address Validation:**
  * > UNKNOWN — Requires additional reference.
  * The exact frontend regex or backend validation rules for TON addresses and BEP20 addresses are unknown.

---

## 3. Quests & Tasks Validation

* **Device-Level Task Verification:**
  * > UNKNOWN — Requires additional reference.
  * It is unknown how the app validates OS-level tasks like `"Add Mini App to your home screen"` or `"Post a story with your miner"`. (e.g., does it use specific browser API callbacks, Telegram story SDK returns, or is it verified on a self-reported basis?)
* **Quest Library:**
  * > UNKNOWN — Requires additional reference.
  * Only 4 of the 21 `"Ours"` tasks and 1 of the 8 `"Partner"` tasks are visible. The definitions, rewards, and conditions for the remaining tasks are unknown.

---

## 4. Mini-Games Active Interfaces

* **Active Game Screens:**
  * > UNKNOWN — Requires additional reference.
  * The visual designs and game loops for both active mini-games (Roulette and Basketball) are unknown.
* **Game Restrictions:**
  * > UNKNOWN — Requires additional reference.
  * It is unknown if playing games requires energy, crystals, or USDT, or if they are free to play with time-based cooldown limits.

---

## 5. Payment System & Stacking

* **Checkout Providers:**
  * > UNKNOWN — Requires additional reference.
  * The payment gateways used to process the purchase of Boost Packs (e.g. Telegram Stars, crypto payments, or stripe invoice integrations) are unknown.
* **Boost Stacking Rules:**
  * > UNKNOWN — Requires additional reference.
  * It is unknown if buying multiple speed boost packs (e.g. buying two x2 packs) stacks their multipliers (additively or multiplicatively) or extends their duration.
  * It is unknown if purchased boost packs apply to USDT mining, TON mining, or both.

---

## 6. Referral Tree & Lists

* **Referrals list UI:**
  * > UNKNOWN — Requires additional reference.
  * The layout card structure and columns displayed when the referrals list has active referrals are unknown.
* **Multi-Tier Referrals:**
  * > UNKNOWN — Requires additional reference.
  * It is unknown if the referral commission extends to secondary tiers (e.g., earning a percent of friends' referrals).

---

## 7. Help Menu Contents

* **Help Text:**
  * > UNKNOWN — Requires additional reference.
  * The full instructional content and layout inside the help modal (triggered by `"?"` in the header) are unknown.
