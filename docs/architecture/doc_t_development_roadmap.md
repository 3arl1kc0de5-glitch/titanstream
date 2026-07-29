# Document T: Development Roadmap

This document outlines the development phases, milestone exit criteria, dependency trees, and risk logs for the TitanStream project build.

---

## 1. Project Build Milestones

```
[ M1: Monorepo & Auth Setup ] ---> [ M2: Mining Engine & State ]
                                                |
                                                v
[ M4: Withdrawals & Ledger ] <----- [ M3: Quests & Referral System ]
              |
              v
[ M5: Games & Admin Dash ]   -----> [ M6: Deploy, CI/CD & Audit ]
```

---

## 2. Milestone Details

### Milestone 1: Monorepo Initialization & Auth Pipeline
* **Objective:** Establish workspace structure and verify Telegram WebApp SDK login authentication.
* **Deliverables:**
  * Configured pnpm workspaces monorepo.
  * Verified DB schemas and migrations.
  * NestJS API auth route checking `initData` signature.
  * React template loading custom styles and JWT headers.
* **Dependencies:** None.
* **Exit Criteria:**
  * API verifies mock `initData` payloads.
  * React application launches within Telegram, calls auth endpoint, and saves JWT.
* **Complexity:** Medium (3/5).
* **Risk Assessment:** Telegram WebApp signature mismatches during initial local testing. *Mitigation:* Provide robust local environment configuration scripts.

---

### Milestone 2: Core Mining Engine & State Sync
* **Objective:** Implement real-time balance increments and anti-macro tap cooling controls.
* **Deliverables:**
  * Mining schema entities.
  * Server calculation models for yield and exponential decay.
  * Redis-backed active session registers.
  * React main mine view containing animated spinner, slider multipliers, and odometer balance.
* **Dependencies:** Milestone 1 completed.
* **Exit Criteria:**
  * Main balance increment matches server math delta computations.
  * Taps registered trigger server updates and decay correctly over time.
* **Complexity:** High (5/5).
* **Risk Assessment:** High frequency tapping spams HTTP requests, causing database lockups. *Mitigation:* Implement Redis caching locks and throttling.

---

### Milestone 3: Quests, Campaigns & Referral Binds
* **Objective:** Deploy user tasks and deep-linked invitation systems.
* **Deliverables:**
  * Referral tracking logic (attributions, user links, stats grid).
  * Quest validation interfaces (TG API member check, daily streaks).
  * Ours and Partner quest tab UI layouts.
* **Dependencies:** Milestone 2 completed.
* **Exit Criteria:**
  * Launching bot with referral parameters binds users.
  * Joining a partner channel is verified via bot API.
* **Complexity:** Medium (3/5).
* **Risk Assessment:** Users script fake accounts to farm invite boosts. *Mitigation:* Limit referral boost payouts to active referees.

---

### Milestone 4: Ledger Accounting & Withdrawals
* **Objective:** Build secure balance-locking withdrawal forms.
* **Deliverables:**
  * Double-entry ledger database schema.
  * Withdrawal queue (BullMQ) processing system.
  * Address validations and network option selections.
* **Dependencies:** Milestone 2 & 3 completed.
* **Exit Criteria:**
  * Initiating a withdrawal moves funds to Locked balance.
  * Transaction jobs execute sequentially to prevent nonce collision.
* **Complexity:** High (5/5).
* **Risk Assessment:** Race conditions allow double spending. *Mitigation:* Enforce row-level DB locks and double-entry auditing.

---

### Milestone 5: Mini-Games & Admin Controls
* **Objective:** Implement games and the back-office panel.
* **Deliverables:**
  * React/Phaser mini-games wrapper.
  * Score validation and anti-cheat telemetry checker.
  * Admin Panel UI (RBAC, user edits, emergency switches).
* **Dependencies:** Milestone 4 completed.
* **Exit Criteria:**
  * Game completions verify duration/event rates before crediting rewards.
  * Admins can approve withdrawals and toggle emergency switches.
* **Complexity:** High (4/5).
* **Risk Assessment:** Score spoofing from browser extensions. *Mitigation:* Server validation of physics timelines.

---

### Milestone 6: Infrastructure, CI/CD & Production Audit
* **Objective:** Containerize and deploy the app to VPS.
* **Deliverables:**
  * Docker Compose configurations.
  * Nginx configurations and SSL certificates.
  * GitHub Actions automated workflows.
  * Prometheus and Grafana monitoring dashboard.
* **Dependencies:** Milestone 5 completed.
* **Exit Criteria:**
  * Pushing to `main` branch deploys code to the production VPS.
  * API monitoring shows metrics on system latency and error rates.
* **Complexity:** Medium (3/5).
* **Risk Assessment:** Insecure secrets exposures. *Mitigation:* Inject secrets strictly at runtime.
