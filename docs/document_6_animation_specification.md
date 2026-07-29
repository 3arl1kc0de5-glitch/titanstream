# Document 6: Animation Specification

This document details the visual motion and animations required to replicate the interactive dynamics of the TitanStream Telegram Mini App.

---

## 1. Mining Spinner Animations

The central spinner widget on the `Mine Screen` uses layered CSS animations to indicate an active mining session.

* **Concentric Segmented Rings:**
  * **Behavior:** Two concentric dashed rings rotate around the Tether/TON icon.
  * **Direction:** Outer ring rotates clockwise, inner ring rotates counter-clockwise.
  * **Timing:** Infinite linear rotation. Outer ring: `20s` duration; inner ring: `12s` duration.
* **Spinner Base Breathing Pulse:**
  * **Behavior:** The main green circle scales up and down slightly (breathing effect) to represent mining pulses.
  * **Scale Range:** `scale(1.0)` to `scale(1.03)`.
  * **Timing:** `2.5s` duration, ease-in-out curve, infinite loop.
* **Neon Glow Pulse:**
  * **Behavior:** The outer shadow glow fluctuates in intensity.
  * **Value:** `box-shadow: 0 0 10px rgba(0,230,118,0.2)` to `box-shadow: 0 0 25px rgba(0,230,118,0.6)`.
  * **Timing:** Synchronized with the breathing scale pulse.

---

## 2. Odometer Ticker (Real-Time Balance Increment)

* **Behavior:** The USDT and TON balance readouts (in the header and center of the Mine screen) increment continuously rather than updating in steps.
* **Mechanism:** Calculated based on the current mining speed in GH/s (e.g. `2.6 GH/s`). The last 5 decimal places count upward smoothly at a high refresh rate (60 FPS or matching requestAnimationFrame).
* **Visuals:** Numeric values roll upward or tick smoothly like an odometer.

---

## 3. Button Micro-Interactions

* **Press State:**
  * **Behavior:** Clicking/tapping any button (e.g., `"Play >"`, `"Claim"`, `"Buy"`, `"Copy link"`) shrinks the button size slightly.
  * **CSS:** `transform: scale(0.96); filter: brightness(0.95);`
  * **Timing:** `0.08s` transition duration.
* **Release/Hover State:**
  * **Behavior:** Releasing or hovering (on desktop) restores standard sizing.
  * **CSS:** `transform: scale(1.0); transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);`

---

## 4. Quest Claim Particle Animation

* **Trigger:** Tapping the green `"Claim"` button on a completed quest card.
* **Flow:**
  1. The quest card fade-shrinks slightly as it is greyed out.
  2. A cluster of 5-8 small particle assets (coins for USDT quests, small diamonds for crystal quests) spawn from the card's position.
  3. These particles fly along a curved bezier path towards the respective balance capsule in the top header.
  4. Upon particle collision with the header, the balance capsule executes a temporary scale-up shake (`scale(1.15)`) for `0.2s` and updates the number value.

---

## 5. Premium Cards Shimmer (Gold Boost Cards)

* **Target:** Boost x5 ("Best Value") and Boost x20 cards.
* **Visuals:** A subtle linear-gradient shimmer sweeps diagonally across the card face and its gold borders.
* **CSS Implementation:** Uses a background gradient shift:
  * `background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.3) 50%, rgba(255,215,0,0.1) 100%);`
  * Background position animated from `-100%` to `200%` on a `3s` infinite interval loop.

---

## 6. Page & Filter Transition Animations

* **Tab Switching:** Navigating using bottom navigation tabs fades out the active view container (`opacity: 0`) and fades in the new container (`opacity: 1`) over `0.12s`.
* **Category Pill Filter:** Clicking a filter pill causes the list elements to slide vertical positions smoothly (`transition: transform 0.2s ease-out`) rather than jumping.

---

## 7. Skeleton Loading Gradients

* **Behavior:** During API calls or app load, placeholder cards display a running grey gradient skeleton.
* **CSS Keyframes:**
  * `@keyframes skeleton-loading { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`
  * Gradient: `linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%)` moving continuously.
