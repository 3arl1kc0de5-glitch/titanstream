# Document C: Frontend Architecture

This document defines the architecture, directory standards, state management, and visual rendering strategies for the TitanStream React client.

---

## 1. Directory Structure (`/apps/web/src`)

```
/src
├── assets/             # SVGs, coin assets, fonts
├── components/         # Reusable atomic UI (Button, Card, Input, Modal, Badge)
├── context/            # Global React Contexts (TelegramAuthContext)
├── hooks/              # Custom hooks (useMiningTicker, useTelegramSdk)
├── layouts/            # Persistent layout containers (MainLayout)
├── pages/              # Page view entries (Mine, Friends, Boost, Quests, Withdraw, Games)
├── services/           # Axios API clients & configurations
├── store/              # Zustand global state modules
├── styles/             # Global CSS and Tailwind CSS base layers
└── utils/              # Text formatting, validators, date helpers
```

---

## 2. Navigation & Routing Strategy

* **Tab Switching Control:**
  * While traditional SPA routing (React Router) is used for separate sub-pages, the primary bottom navigation operates via a high-performance tab state switcher managed inside `MainLayout`.
  * Navigating between tabs (Mine, Friends, Boost, Quests, Withdraw) toggles the visibility of the page containers rather than destroying the component DOM, ensuring instant loading and local form state preservation.
* **Secondary Route Stack:**
  * Sub-pages (e.g. Games Screen, active game instances) are loaded via React Router routes, mounting overlay layers. The Telegram SDK native back button is tied to standard navigation pops (`navigate(-1)`).

---

## 3. State Management & API Caching

```
+-----------------------------------------------------------------+
|                         React Components                        |
+-----------------------------------------------------------------+
       |                                                 |
       v                                                 v
+------------------------+                     +------------------+
| Zustand State Store    |                     | TanStack Query   |
| (Real-time balances,   |                     | (HTTP Data cache |
|  cooler multiplier)    |                     |  quests, profile)|
+------------------------+                     +------------------+
```

### 3.1 Client Global State (Zustand)
* **Scope:** Real-time values requiring instant access across screens (e.g. active balances, user config, mining speed in GH/s, and active cooler decay variables).
* **Benefits:** Minimal boilerplate, fast updates outside the React render cycle (crucial for 60 FPS balance ticker animation).

### 3.2 Server State Caching (TanStack Query)
* **Scope:** Asynchronous server data (e.g., Quest list collections, transaction history registers, active boost packages catalog).
* **Strategy:**
  * Default `staleTime` is set to `30` seconds.
  * Quest claims trigger explicit cache invalidations (`queryClient.invalidateQueries(['quests'])`), forcing background refetches.

### 3.3 HTTP Request Wrapper (Axios)
* **Token Injection:** Automatically intercepts requests to inject JWT credentials.
* **InitData Headers:** Attaches the raw Telegram `initData` string under custom headers (`X-Telegram-Init-Data`) for authentication verification.

---

## 4. UI System, Themes & Animations

### 4.1 Tailwind CSS Theme System
* CSS custom variables are defined inside `index.css` mapping the design system tokens. These are bound directly into Tailwind configurations:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        appBg: 'var(--color-app-bg)',
        cardBg: 'var(--color-card-bg)',
        usdtGreen: 'var(--color-usdt-green)',
        tonBlue: 'var(--color-ton-blue)',
      }
    }
  }
}
```

### 4.2 Animation Strategy (Framer Motion)
* **Micro-Animations:** Handled using CSS transitions (`transition-all duration-100 ease-in-out`) to minimize javascript overhead.
* **Transitions & Overlays:** Modals and tab crossfades utilize **Framer Motion** (`AnimatePresence`) for clean entry and exit animations.

---

## 5. Offline Handling, Error Boundaries & Skeletons

### 5.1 Offline Strategy
* The client checks connectivity status using browser API hooks (`navigator.onLine`).
* If offline, the client renders a floating connectivity warning banner and disables database-modifying buttons (`Buy`, `Claim`, `Withdraw`).

### 5.2 Error Boundaries
* React error boundaries enclose key pages. If a page crashes (e.g., due to corrupt API responses), it renders a fallback view (a warning message and a `"Reload App"` button) instead of breaking the entire Telegram container.

### 5.3 Skeleton Loading Page
* List containers (Quests, Boost packs, Withdraw requests) render grey skeleton gradient slots during the initial fetch.
