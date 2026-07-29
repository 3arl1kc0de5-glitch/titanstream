# Document 7: Visual Design System

This document outlines the visual design system tokens, typography rules, color palettes, and layout constraints of the TitanStream Telegram Mini App.

---

## 1. Color Palette

The color palette is optimized for a premium dark mode layout, using vibrant accents to highlight key activities and branding elements.

### 1.1 Base System Colors
* **Primary App Background:** `#0e0f12` (deep charcoal-black)
* **Secondary App Background:** `#15161b` (slightly lighter charcoal)
* **Card Container Background:** `#1d1e24` (dark grey-blue slate)
* **Control / Inactive Pill Background:** `#252730` (dark grey)
* **Dotted Border / Divider lines:** `#2c2e3a`

### 1.2 Accent Colors
* **Tether (USDT) Green:** `#00e676` (neon bright green)
* **TON Blue:** `#0088cc` (Telegram / TON standard blue)
* **Crystals Blue:** `#29b6f6` (sky blue diamond)
* **Premium Gold:** `#ffb300` / `#ffd700` (used for Boost x5 and x20)
* **Error / Notification Red:** `#ff3b30` (bright red badges)
* **Success Banner Background:** `#d4edda` (light green, with text `#155724`)

### 1.3 Text Colors
* **Primary Text:** `#ffffff` (pure white, bold labels, balances)
* **Muted/Secondary Text:** `#8a8c98` (medium grey, used for subtitles and descriptions)
* **Form Labels:** `#737581` (dark grey-slate)

---

## 2. Typography System

The application utilizes a clean, modern sans-serif typeface (such as `Inter` or standard Telegram system font stacks).

| Style Token | Font Size | Font Weight | Letter Spacing | Case / Transform | Usage |
|---|---|---|---|---|---|
| **Large Balance** | `36px` - `40px` | Bold (`700`) | `-0.02em` | Sentence | Main Mine Screen Balance |
| **Page Title** | `26px` - `30px` | Bold (`700`) | `normal` | Sentence | Page Titles (e.g. Games, Speed up) |
| **Section Header** | `12px` | Extra Bold (`800`)| `0.1em` | Uppercase | Group headers (e.g. "WHAT FRIENDS GIVE") |
| **Card Title** | `16px` | Semi-Bold (`600`)| `normal` | Sentence | Item headings (e.g. "Roulette") |
| **Header Balances**| `13px` | Bold (`700`) | `normal` | Sentence | Header capsule text |
| **Body / Description**| `12px` | Regular (`400`) | `normal` | Sentence | Subtitles, descriptions |
| **Pill Badges** | `10px` | Bold (`700`) | `normal` | Uppercase | Promo flags ("BEST VALUE") |

---

## 3. Layout Grid & Spacing

* **App Frame Constraints:**
  * Width: Responsive fluid design fitting `360px` to `480px` (standard mobile Telegram WebApp viewport).
  * Padding: Consistent outer padding of `16px` on the left and right margins of the viewport.
* **Component Margins:**
  * Space between cards: `12px` to `16px`.
  * Space between header elements and content: `24px`.
* **Sizing Rules:**
  * **Card Corner Radius:** `12px` border-radius.
  * **Pill/Button Radius:** `50px` (pill-shaped) or `8px` (option cards).
  * **Global Bottom Nav Height:** `68px` fixed.
  * **Global Header Height:** `56px` fixed.

---

## 4. Iconography System

Icons are unified in style, utilizing simple vector glyphs matching the following categories:

* **Currency Badges:**
  * **Tether (USDT) Icon:** `T` symbol inside a circular green badge.
  * **TON Symbol:** TON network logo inside a circular blue badge.
  * **Crystals Symbol:** Simple faceted diamond glyph.
* **Navigation & Control Icons:**
  * **Gamepad:** Retro console controller icon.
  * **Help:** Circular outline icon enclosing `?`.
  * **Language:** Country flags (UK flag `🇬🇧` default).
  * **Chevron:** Right-pointing arrow indicator `>`.
  * **Friends Tab:** Double-silhouette person icon.
  * **Boost Tab / speed indicator:** Lightning bolt icon.
  * **Mine Tab:** Pickaxe icon.
  * **Quests Tab:** Clipboard checklist icon.
  * **Withdraw Tab:** Wallet with ascending arrow icon.
  * **Partners Icon:** Double handshake glyph.
  * **Create Quest Icon:** Folder icon overlayed with a `+` symbol.
