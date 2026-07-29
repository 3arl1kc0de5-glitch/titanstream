# Document 3: Navigation Map

This document specifies the routing, transition behaviors, back navigation, and deep-link entry points for the TitanStream Telegram Mini App.

---

## 1. Primary Bottom Navigation Routing

The application uses a persistent bottom navigation bar containing 5 tabs. Selecting any tab triggers a direct, non-animated screen transition. The active tab state is highlighted in neon green, while the others remain grey.

| Source Screen | Trigger Element | Destination Screen | Transition Type | Transition State |
|---|---|---|---|---|
| Any Screen | "Friends" Tab | `Friends Screen` | Direct Replace | Tab highlighted green |
| Any Screen | "Boost" Tab | `Boost Screen` | Direct Replace | Tab highlighted green |
| Any Screen | "Mine" Tab | `Mine Screen` (Home) | Direct Replace | Tab highlighted green |
| Any Screen | "Quests" Tab | `Quests Screen` | Direct Replace | Tab highlighted green |
| Any Screen | "Withdraw" Tab | `Withdraw Screen` | Direct Replace | Tab highlighted green |

---

## 2. Header-Based Routing & Modal Transitions

The top header bar provides routing to secondary interfaces, overlays, or mini-games.

```mermaid
graph LR
    AnyScreen[Any Screen] -- Tap Gamepad Icon --> GamesScreen[Games Screen]
    AnyScreen -- Tap "?" Button --> HelpModal[Help Overlay / Modal]
    AnyScreen -- Tap Flag Dropdown --> LangDropdown[Language Dropdown Menu]
    QuestsScreen[Quests Screen] -- Tap Ours Tab --> OursTab[Ours Tasks]
    QuestsScreen -- Tap Partner Tab --> PartnerTab[Partner Tasks]
    PartnerTab -- Tap Create Quest --> CreateQuest[Create Quest Webpage]
```

### 2.1 Gamepad Navigation
* **Action:** Tap the console controller icon in the header.
* **Navigation:** Routes to the `Games Screen`.
* **Note:** The gamepad icon is hidden when the user is already on the `Games Screen`.

### 2.2 Help Overlay
* **Action:** Tap the `"?"` button in the header.
* **Navigation:** Opens a modal dialog overlay explaining mining rules, crystals, and payouts.
* **Dismissal:** Tapping a close icon (`"X"`) or clicking outside the modal box returns the user to the active screen.

### 2.3 Language Selector
* **Action:** Tap the flag dropdown selector in the header.
* **Navigation:** Triggers a select overlay dropdown containing available language flags and text.
* **Dismissal:** Selecting a language or tapping outside the dropdown closes it.

### 2.4 Quests Tab Selector
* **Action:** Tap the segmented header button `"Ours"` or `"Partner"`.
* **Navigation:** Toggles the list view between Ours and Partner task collections.

---

## 3. Back Button and Stack Behavior

* **Telegram Native Back Button:**
  * When a user navigates from the `Mine Screen` to the `Games Screen` (via header Gamepad icon) or from `Partner Quests` to an external ad campaign, the Telegram native back button (in the upper-left of the Telegram frame) becomes visible.
  * Tapping this back button pops the active view and returns the user to the preceding dashboard or tab.
* **Web App State Persistence:**
  * Navigating between bottom tabs (Friends, Boost, Mine, Quests, Withdraw) does not reset forms, inputs, or active timers. If a user inputs `"5"` in the Withdraw amount field and clicks to the "Mine" tab, returning to the "Withdraw" tab preserves the inputs unless a page refresh occurs.

---

## 4. Deep-Link Entry Points

* **Referral Link Format:**
  * URL: `https://t.me/TS_usdt_bot?start=ref_Z72G1X5A`
* **Flow:**
  1. User clicks the link inside Telegram.
  2. The Telegram application launches the bot chat window and automatically sends the command `/start ref_Z72G1X5A`.
  3. The backend processes the deep-link query parameter `ref_Z72G1X5A`.
  4. If the user is new, they are registered in the database, and their account is linked to the referrer's account (associated with referral ID `Z72G1X5A`).
  5. The Mini App launch button appears in the chat window. When launched, the user starts on the `Mine Screen` with their initial x1 mining boost (which may increment based on successful referral bindings).
