# Document U-R: Authentication & Onboarding System — Production Readiness Review

> **Review Type:** Gap Analysis & Architecture Audit
> **Reviewer:** Principal Fintech Architect
> **Status:** Draft requires hardening before implementation
> **Date:** 2026-07-28

---

## Table of Contents

1. [Assumption Elimination](#1-assumption-elimination)
2. [Unknown Requirements](#2-unknown-requirements)
3. [User Journey Gap Analysis](#3-user-journey-gap-analysis)
4. [State Machine Audit](#4-state-machine-audit)
5. [Backend Architecture Audit](#5-backend-architecture-audit)
6. [Database Audit](#6-database-audit)
7. [Security & Abuse Review](#7-security--abuse-review)
8. [Compliance & Trust Review](#8-compliance--trust-review)
9. [First Action Optimization](#9-first-action-optimization)
10. [Final Architecture Hardening](#10-final-architecture-hardening)

---

## 1. Assumption Elimination

Each assumption is rated: Valid, Needs Confirmation, Invalid, Unacceptable Risk

---

### 1.1 User Behavior Assumptions

| # | Assumption | Risk | Verdict | Replacement |
|---|-----------|------|---------|-------------|
| A1 | Users will complete 8 education modules without skipping | Users skip -> they miss critical risk information. In fintech, uninformed users = liability. | Invalid | Education must be gated — platform features locked until mandatory modules complete. Quiz must require 100% on risk/compliance questions. |
| A2 | Users read and understand risk disclosures | Standard disclaimer blindness. Users click "I Agree" without reading. Courts do not accept checkbox consent in many jurisdictions. | Unacceptable Risk | Active confirmation: each risk point individually acknowledged. Comprehension quiz must confirm specific risk knowledge. Full audit trail of what was shown, when, and user's explicit response. |
| A3 | Users will return to resume stalled onboarding | Mobile retention drops 80% after 24h. 7-day nudge window is too slow. | Invalid | First nudge at 3 hours, second at 12 hours, third at 48 hours. After 72h, the funnel is likely lost. |
| A4 | Users understand "simulated mining" vs "real mining" | Core confusion. If users believe they perform real computational work, they have false expectations about earnings. | Invalid | Every mining screen must carry a persistent banner: "This is simulated mining. Earnings are platform-determined, not computational." |
| A5 | Users will not share accounts | Telegram account sharing is common (family devices). Account sharing breaks fraud detection and KYC assumptions. | Needs Confirmation | Design for session binding: require re-auth on new device/IP. Flag multi-geo activity. |
| A6 | Users know what USDT and TON are | Many Telegram users in emerging markets have never used crypto. | Invalid | Add Module 0: "What is Crypto?" — explain USDT, TON, wallets, networks in plain language. |
| A7 | Users will withdraw rationally | Users may withdraw all earnings immediately on first eligibility, causing network congestion and support tickets. | Needs Confirmation | Implement first-withdrawal education gate — mandatory explainer about fees, timing, minimums, network selection. |

### 1.2 Telegram Platform Assumptions

| # | Assumption | Risk | Verdict | Replacement |
|---|-----------|------|---------|-------------|
| A8 | Telegram Mini App initData is always available | Desktop Telegram and web clients may not support Mini Apps. | Needs Confirmation | Fallback strategy required: redirect to Telegram Bot conversational flow or web fallback. Document supported clients. |
| A9 | Telegram initData hash verification is a stable protocol | The HMAC verification is a community-reverse-engineered protocol, NOT an official Telegram Bot API feature. Telegram could change the algorithm without notice. | Unacceptable Risk | Critical risk. Implement: (1) Monitor Telegram changelog. (2) Kill switch to fall back to simpler auth (one-time code via bot). (3) Consider official Telegram Login Widget for web fallback. |
| A10 | 24h auth_date tolerance is sufficient | An attacker who captures initData has 24 hours to replay it. | Invalid | Reduce to 5 minutes. Add nonce-based deduplication using query_id stored in Redis with 5min TTL. |
| A11 | Telegram user ID is a stable, unique identifier | Users can delete and recreate accounts (new ID). Users can have multiple accounts on one device. | Needs Confirmation | Document account merge/deletion policy explicitly in ToS. User loses access to old TitanStream account if they delete Telegram. |
| A12 | Telegram Bot API has unlimited throughput | Telegram limits bots to 30 messages/second global, ~1 msg/s per chat. Nudges to thousands of users will hit limits. | Invalid | Design nudge system for batch delivery with BullMQ rate limiting (30/s global, 1/s per chat). Priority queuing for security alerts. |

### 1.3 Compliance and Regulatory Assumptions

| # | Assumption | Risk | Verdict | Replacement |
|---|-----------|------|---------|-------------|
| A13 | No KYC/AML needed because it's "simulated mining" | Regulators do not distinguish "simulated" from "real" when users can withdraw real assets. If users convert in-app value to USDT/TON and withdraw, this is a financial service. | Unacceptable Risk | Legal review required immediately. Design must support: geo-blocking, tiered KYC, AML transaction monitoring, suspicious activity reporting. |
| A14 | Privacy regulations do not apply | Global platform must comply with GDPR, CCPA, LGPD, PIPEDA, etc. | Unacceptable Risk | Privacy-by-design: data minimization, consent records, data export API, right to erasure (with 30-day grace period), DPA with third parties. |
| A15 | No money transmitter licensing needed | If TitanStream holds user funds and facilitates transfers, it may be classified as a money transmitter. | Unacceptable Risk | Legal review required. Determine: who holds USDT/TON? Custodied by TitanStream or third-party? Withdrawal processing by TitanStream or partner? |
| A16 | GDPR right to erasure means immediate deletion | GDPR Art. 17 allows retention for legal/regulatory compliance (tax, AML). Deleting financial records immediately violates AML law. | Invalid | Tiered deletion: personal data anonymized immediately. Financial records retained 5-7 years. Audit logs retained for legal minimum. |
| A17 | "Educational" content shields from financial advice regulations | Educational content about mining/earning could be construed as financial advice or investment scheme. | Needs Confirmation | Legal review of all educational content. Disclaimers on every module: "For informational purposes only. Not financial advice." |

### 1.4 Technical Assumptions

| # | Assumption | Risk | Verdict | Replacement |
|---|-----------|------|---------|-------------|
| A18 | PostgreSQL is sufficient for session storage | Session validation on EVERY API call. 10M users x 100 calls/day = ~11,600 reads/second. PostgreSQL can handle but at query cost. | Needs Confirmation | Redis must be primary session store. PostgreSQL is source of truth. Flow: Redis get -> miss -> PostgreSQL -> write back to Redis. |
| A19 | 15-minute access tokens are secure enough | 15 min is long enough for replay if token stolen. In mobile, tokens can be extracted from memory dumps. | Invalid | Token binding: access tokens bound to session fingerprint (user-agent + IP prefix + session ID hash). Verify binding on each request. |
| A20 | Refresh token rotation is sufficient theft detection | Reuse detection relies on attacker using token before legitimate user refreshes. If attacker uses first, legitimate user is locked out. | Invalid | Grace period: on reuse after rotation, mark session as suspected_compromised, send user notification, allow confirm/deny before revoking. |
| A21 | All users have persistent, low-latency internet | Telegram Mini Apps used on 2G/3G in developing markets. Large education content will fail to load. | Invalid | Offline-first for education: pre-load content on app launch, batch progress sync, allow slide nav without network. Quiz requires network with timeout resilience. |
| A22 | BullMQ single Redis is production-ready | If Redis goes down, onboarding, nudges, notifications, async processing stop. Unacceptable in fintech. | Unacceptable Risk | Redis HA required (Sentinel/Cluster). BullMQ jobs must have persistence. Dead-letter queues for failed jobs with alerting. |
| A23 | User's Telegram language_code is sufficient for i18n | Many users use Telegram in English but prefer financial communications in local language. | Needs Confirmation | Allow independent language selection for onboarding/education. Store as users.preferred_language separate from telegram_accounts.language_code. |

### 1.5 Financial Assumptions

| # | Assumption | Risk | Verdict | Replacement |
|---|-----------|------|---------|-------------|
| A24 | Users understand mining rewards are platform-determined | Most users will believe they earn real cryptocurrency through computational work. When rewards change, users feel defrauded. | Unacceptable Risk | Mandatory disclosure on every earning screen: "Reward rates are determined by TitanStream and may change. Past earnings do not guarantee future results." |
| A25 | Withdrawal fees can be passed without explicit consent | Charging fees without transparent upfront disclosure is a regulatory violation (EU PSD2, US state laws). | Invalid | Fee disclosure at point of earning, not just withdrawal. Display cumulative fees before confirmation with acknowledgement. |
| A26 | No minimum holding period for earned funds | Some jurisdictions require holding period for AML compliance. Immediate withdrawal may facilitate layering. | Needs Confirmation | Cooling-off period on first withdrawal (24-48h) for AML. Disclosed during onboarding. |
| A27 | Platform can adjust mining rates without notice | Rate cuts cause user revolt. Trust issue with direct financial consequence. | Invalid | Rate change policy: (1) Announce 7+ days in advance. (2) Never retroactive. (3) Publish transparent formula. (4) Grandfather existing users. |

---

## 2. Unknown Requirements

### 2.1 Product Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U1 | What happens when user accesses from Telegram web client? | Web client has limited Mini App support. Some features unavailable. InitData may be malformed. | Web users get broken experience, lose trust. | Support web with reduced functionality OR block and redirect to mobile. Blocking is safer for fintech. |
| U2 | What is minimum user age? | Financial services require 18+. Collecting data from minors without parental consent = COPPA/GDPR-K violation. | Regulatory fines, forced deletions. | Default to 18+. Add birth date input (not just checkbox) during onboarding. |
| U3 | Should users be able to explore before committing to onboarding? | Fintech products benefit from progressive onboarding. Some users want to explore first. | High abandonment if too much friction. | Allow "explore mode": read-only dashboard with no financial actions. Full features require completed onboarding. |
| U4 | What is geo-restriction policy? | Certain countries (US, China, Iran) have restrictive regulations. Operating illegally = criminal liability. | Regulatory action, fines, shutdown. | Determine supported countries immediately. Implement geo-blocking at CDN/application level. |

### 2.2 Technical Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U5 | User ID format in JWT sub claim? | All downstream services depend on this consistency. | Cross-service integration failures. | Use Telegram user ID (BigInt) as sub, cast to string for JWT compliance. |
| U6 | How are education modules versioned for updates? | When regulatory content changes, users who completed old version need to re-complete. | Outdated risk disclosures = regulatory liability. | Module versioning: increment version on content change. Users re-complete if version > their completion version. |
| U7 | How to handle rate limiting across multiple API gateways? | With horizontal scaling, per-instance limits are inconsistent. | Uneven throttling, bypass via rotating instances. | Redis-based rate limiter (sliding window with sorted sets). Centralized, consistent. |
| U8 | Backup auth mechanism if Telegram is down? | Telegram has had outages lasting hours. Users cannot generate initData. | Complete platform outage. Users cannot access funds. | Emergency one-time recovery codes (10 codes) given during onboarding. These bypass Telegram auth with CRITICAL severity logging. |

### 2.3 Security Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U9 | How to handle initData for users joining via Telegram group (not Mini App)? | Group context may have different initData format or missing fields. | Auth failures or security bypass. | Block auth from non-Mini-App contexts. Groups must link to Mini App. |
| U10 | Brute-force protection for refresh endpoint? | Refresh tokens are long-lived. Brute-forcing tokens = persistent access. | Account takeover. | Rate limit refresh endpoint: 5 req/min per IP + 3 req/min per user. Alert on >10 failures. |
| U11 | Internal service-to-service auth? | Microservices need secure communication. Compromised container can impersonate any service. | Lateral movement in breach. | mTLS or service mesh (Istio/Linkerd) for inter-service communication. Client certificate validation required. |

### 2.4 Financial Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U12 | What happens when withdrawal is in progress and account is suspended? | Withdrawal may complete after suspension, sending funds to fraudulent user. | Financial loss, AML violation. | Withdrawal freeze: suspended accounts have withdrawals held. Only reinstate or cancel on admin review. |
| U13 | Currency for fees? | If fees in USDT but user withdrawing TON, conversion logic needed. | User confusion, support tickets. | Fees in same currency as withdrawal. Display both crypto and approximate USD equivalent. |
| U14 | Refund policy for failed withdrawals? | Network failures, invalid addresses, bridge failures can lose funds. Users expect refunds. | Financial liability, trust destruction. | Define: on-chain failure = refund in-app balance minus network fees. Invalid address = user responsibility (disclose clearly). |

### 2.5 User Experience Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U15 | Should education modules include interactive elements? | Static text not engaging. Interactive increases comprehension but adds dev cost. | Users may not retain information. | Start with slides + quiz (MVP). Add interactive elements in Phase 6. |
| U16 | Show "your progress among other users" percentile? | Social proof increases completion. But showing stats before completion may pressure. | Reduced onboarding completion. | Show after 3 modules: "87% of users complete onboarding in under 5 minutes." |
| U17 | What notification permissions needed for re-engagement? | Telegram bots can only message users who have interacted with bot. If user blocks bot, nudges impossible. | Cannot re-engage stalled users. | During onboarding, ask user to send a message to the bot. If refused, note in profile and fall back to in-app notifications. |

### 2.6 Operational Decisions

| # | Question | Why It Matters | Impact If Ignored | Recommended Decision |
|---|----------|---------------|-------------------|---------------------|
| U18 | SLA for onboarding completion? | Without target, cannot measure funnel effectiveness. | Cannot optimize. | Target: 60% of users who start onboarding complete within 24 hours. Measure and iterate. |
| U19 | Who owns onboarding funnel monitoring? | Without ownership, drops go unnoticed. | Users silently abandon. | Product team owns onboarding funnel metrics. Alert at 10%+ week-over-week drop. |
| U20 | Support escalation path for onboarding issues? | Users stuck in onboarding contact support. Without defined path, they get no help. | Frustrated users abandon. | Dedicated onboarding support queue. Agents can manually advance user state. Documented procedure. |
| U21 | A/B testing of onboarding content? | Without A/B testing, changes based on intuition. | Suboptimal conversion. | Feature flag every module. Ability to swap order, hide/show, test variants. Use flag management system. |

---

## 3. User Journey Gap Analysis

### 3.1 Full Journey Audit

#### Phase 0: Discovery

| Step | Issue |
|------|-------|
| How does user find the bot? | No discovery flow defined. Viral/invite-only/public? Affects onboarding design. |
| User sends /start in group chat (not PM) | Bot must respond differently or not at all in group context. |

#### Phase 1: Entry

| Step | Issue |
|------|-------|
| Desktop client without Mini App support | No fallback defined. User cannot proceed. |
| Empty or malformed initData | Retry/fallback mechanism not specified. |
| Network timeout on slow connection | Mini App shows loading spinner indefinitely. User closes app. |
| Existing user sees first-time flow | Returning users should skip to dashboard. Not handled. |

#### Phase 2: Education

| Step | Issue |
|------|-------|
| No "What is Crypto?" module | Users without crypto knowledge lost from Module 1. |
| No back-navigation between modules | User who mis-clicks must re-enter the flow. |
| Risk acknowledgement is checkbox | Insufficient for regulatory compliance. Must be active individual confirmation. |
| No mention of withdrawal limits/holding periods | User expects instant withdrawal, first takes 48h = frustration. |
| Quiz: 4/5 pass threshold too low | User can miss risk question and proceed. Risk questions must be 100%. |
| Quiz: unlimited retries with shuffling | User can brute-force answers, learning nothing. Max 3 attempts, then support. |
| Module content hardcoded | Available features may change. Module content must be dynamic. |

#### Phase 3: Trust Building

| Step | Issue |
|------|-------|
| 6 checkboxes bundled in one form | Not compliant. Each consent requires separate active interaction. |
| No ToS/Privacy version tracking | When updated, existing users need re-consent. No mechanism. |

#### Phase 5: First Financial Action

| Step | Issue |
|------|-------|
| First mining: no explanation of GH/s vs earnings | User thinks "I mined X USDT" when they mined speed, not currency. |
| First withdrawal: no readiness check | User could: never made a deposit, not completed KYC, invalid address. Need checklist. |

#### Phase 6: Returning User

| Step | Issue |
|------|-------|
| Terms changed since last visit | No re-consent flow for returning users. |
| 30+ days absence | DORMANT exists but no re-engagement content. "What's New" update needed. |

#### Phase 7: Account Issue

| Step | Issue |
|------|-------|
| User creates new Telegram account | Cannot access old account. No recovery process defined. |
| User reports compromise | No emergency freeze path. Need /freeze bot command. |

### 3.2 Critical Gaps Summary

| Priority | Issue | Impact |
|----------|-------|--------|
| CRITICAL | No KYC/AML strategy | Regulatory non-compliance, platform shutdown |
| CRITICAL | Risk checkbox insufficient consent | Regulatory violation (GDPR) |
| CRITICAL | initData verification is unofficial protocol | Auth could break without notice |
| CRITICAL | No emergency account freeze | Users cannot secure accounts |
| CRITICAL | Quiz allows 4/5 pass + unlimited retries | Users bypass risk comprehension |
| HIGH | No offline design for emerging markets | Education fails on 2G/3G |
| HIGH | Returning user flow undefined | Users confused, frustrated |
| HIGH | No withdrawal readiness check | Support tickets increase |
| HIGH | No "What is Crypto?" module | Users without crypto knowledge lost |
| HIGH | 24h auth_date tolerance | Replay attack window too large |

---

## 4. State Machine Audit

### 4.1 Missing States

| State | Why Needed | Position |
|-------|------------|----------|
| AWAITING_KYC | User attempts withdrawal requiring KYC | Between ELIGIBLE and first withdrawal |
| KYC_REJECTED | KYC submission rejected, user needs to resubmit | Between AWAITING_KYC and ELIGIBLE |
| CONSENT_EXPIRED | ToS/privacy updated, user must re-consent | Any state -> CONSENT_EXPIRED -> previous state |
| FROZEN | Emergency freeze (user request or fraud) | Any state. Overrides all others. |
| PENDING_DELETION | Grace period between request and actual deletion | Any state -> PENDING_DELETION (30 days) -> DELETED |
| LIMITED_USER | Onboarding complete, not KYC'd. Basic features only. | Between ACTIVE and VERIFIED_USER |

### 4.2 Invalid Transitions

| From | To | Problem | Fix |
|------|----|---------|-----|
| ELIGIBLE | ACTIVE | "First platform action" ambiguous | Define: must perform mining tap or invite |
| DORMANT | ACTIVE | Skips re-consent if ToS changed during dormancy | Route through CONSENT_EXPIRED check |
| ONBOARDING_* | STALLED | 7 days too slow. Mobile retention drops in hours. | Move to STALLED after 24h inactivity |
| EDUCATION_COMPLETE | READY_FOR_PLATFORM | Missing consent step between these | Add explicit CONSENT_PENDING state |

### 4.3 Recovery Scenarios

| Scenario | Current Design | Gap | Fix |
|----------|---------------|-----|-----|
| Abandons mid-module | Nudges at 3h/24h/72h, STALLED at 7d | No "I'm stuck" button | Add help button on every slide -> support chat with context |
| Loses Telegram access | None defined | Account inaccessible forever | Emergency recovery codes (10 codes given during onboarding) |
| Telegram account hacked | Not handled | Hacker can withdraw funds | /freeze command. Unfreeze requires identity verification. |
| Created new Telegram account | Not handled | Two accounts, user wants to merge/transfer | Not initially supported. Require withdrawal from old account first. |

### 4.4 Corrected State Machine

```
NEW_USER -> ONBOARDING_WELCOME -> ONBOARDING_EDUCATION -> EDUCATION_COMPLETE
  -> CONSENT_PENDING -> READY_FOR_PLATFORM -> ELIGIBLE_USER -> ACTIVE_USER
  -> AWAITING_KYC -> VERIFIED_USER

Stalled paths:
  ONBOARDING_* (24h inactivity) -> ONBOARDING_STALLED -> re-engage -> return to previous
  ACTIVE_USER (30d inactivity) -> DORMANT_USER -> re-authenticate -> CONSENT_EXPIRED check -> ACTIVE
  DORMANT_USER (180d inactivity) -> FROZEN_USER -> support re-auth -> ACTIVE

Exceptional states:
  Any state -> CONSENT_EXPIRED (ToS update) -> re-consent -> resume previous state
  Any state -> FROZEN (emergency / fraud) -> support review -> resume / SUSPENDED
  ACTIVE/VERIFIED -> SUSPENDED (admin/fraud) -> appeal -> ACTIVE/VERIFIED or BANNED
  Any state -> PENDING_DELETION (30d grace) -> cancel -> resume / expire -> DELETED
  Any -> BANNED (permanent, no return)
```

---

## 5. Backend Architecture Audit

### 5.1 Service Boundary Corrections

| Service | Current Design | Issue | Corrected |
|---------|---------------|-------|-----------|
| Auth Service | InitData + JWT + sessions + user creation | Too many responsibilities | Split: (1) Auth Verification Service (HMAC only), (2) Session Service (JWT + rotation), (3) User Profile Service (existing) |
| Onboarding Service | Sync + async (stalled detection) | Mixed sync/async concerns | Keep sync. Move stalled detection to scheduled cron job in worker. |
| Education Service | Module delivery + quiz + caching missing | Module content mostly static but fetched per-user | Split: Module catalog -> CDN with versioned URLs. Quiz logic + scoring -> API. Progress -> API with Redis cache. |
| Consent Service | Record + version tracking | No expiry/renewal logic | Add daily consent expiry job. Notify users, downgrade state if critical consents expire. |
| Notification Service | Message dispatch + template management | Template DB lookup per message adds latency | Pre-compile common notifications, cache in Redis with version invalidation. |
| Fraud Detection | Event consumer only | Cannot block requests in real-time asynchronously | Split: (1) Real-time Fraud Guard (middleware, sync), (2) Batch Fraud Analyzer (async job). |

### 5.2 Scalability Risks

| Service | Risk | Mitigation |
|---------|------|------------|
| Auth Service | Burst load on auth (users returning after announcement) | Pre-compute HMAC key at startup. Cuts CPU per request by ~40%. |
| Education Service | Quiz writes are synchronous | Batch quiz answers in Redis, flush single write on completion. 5 writes -> 1 write. |
| Session Service | Refresh rotation creates write amplification | Shorten access token to 5min, reduce refresh calls. Session caching with TTL. |
| Audit Service | Synchronous writes for every event | All audit writes async via BullMQ. CRITICAL -> immediate, INFO -> batch every 30s. |

### 5.3 Security Weaknesses

| Service | Weakness | Fix |
|---------|----------|-----|
| Auth | initData verification has no timeout | Implement 500ms timeout. Reject oversized initData (>4096 bytes). |
| Session | No rate limit on refresh endpoint | 3 req/min per user. After 10 failures -> freeze all sessions. |
| Onboarding | Step advancement trust-based (client sends stepId) | Server must validate previous step completed. Maintain canonical completedSteps list server-side. |
| Education | Quiz answers submitted out of order | Validate answer sequence server-side. Reject out-of-order. |
| Notification | Bot token in env = leak risk | Secrets manager (Vault/AWS Secrets Manager). Rotate on suspicion. Never log. |
| All | No audit on internal API calls | mTLS + audit logging for inter-service calls. |

---

## 6. Database Audit

### 6.1 Missing Tables

| Table | Purpose |
|-------|---------|
| kyc_verifications | Track KYC submissions over time (history, not just latest status) |
| user_fingerprints | Device fingerprint tracking for fraud detection |
| feature_flags | Per-user and global feature toggles for A/B testing |
| account_merge_requests | Track merge requests when user has multiple accounts |
| security_events | High-severity security events for monitoring |
| rate_limits | Counter-based rate limiting with sliding window |
| recovery_codes | Emergency one-time recovery codes |

### 6.2 Missing Fields

| Table | Missing Field | Why |
|-------|---------------|-----|
| users | anonymized_at | GDPR erasure tracking (separate from deleted_at) |
| users | last_active_ip | Fraud detection |
| users | referred_by (string) | Referral code used, not just referrer ID |
| telegram_accounts | blocked_bot (boolean) | Whether user blocked bot (affects notifications) |
| sessions | device_type, country_code | Analytics and fraud detection |
| sessions | suspected_compromised (boolean) | Grace period tracking for theft detection |
| onboarding_progress | current_education_module_id | Direct link to education flow position |
| education_completions | module_version | Track which version was completed |
| education_completions | passed (boolean) | Whether threshold was met |
| education_completions | version (int) | Optimistic locking for race conditions |
| user_consents | document_hash | SHA-256 of ToS/Privacy at consent time |
| user_consents | document_url | URL of document version consented to |
| audit_events | target_user_id | For admin actions |
| audit_events | correlation_id | Trace across multiple events in same flow |

### 6.3 Data Integrity Risks

| Risk | Fix |
|------|-----|
| Race condition: simultaneous auth creates two sessions | Use INSERT ... ON CONFLICT or advisory lock per user_id |
| Orphaned education_completions if module deleted | onDelete: Cascade or prevent deletion of modules with completions |
| State inconsistency between onboarding_progress and users.state | Application-level consistency check on write |
| TOCTOU: multiple simultaneous quiz submissions | Optimistic locking (version field) |
| Duplicate consent on rapid clicks | Unique constraint (user_id, consent_type, version) with skipDuplicates |

---

## 7. Security & Abuse Review

### 7.1 Threat Model

| Threat | Level | Detection | Prevention |
|--------|-------|-----------|------------|
| Fake Telegram accounts (Sybil) | CRITICAL | Account age (<30d flagged), VoIP phone detection, IP clustering | Min 30d account age for rewards. VoIP rejection. IP rate limit. |
| Account farming | CRITICAL | Action timing analysis (too regular), IP clustering, device fingerprint | CAPTCHA on suspicious behavior. Rate limit per IP/device. |
| KYC identity fraud | CRITICAL | Liveness check, document authenticity, fraud DB cross-ref | Reputable KYC provider with liveness detection. |
| Session hijacking | CRITICAL | Sudden IP/device change, multi-geo activity | Session fingerprint binding. New device confirmation. /freeze command. |
| Bot automation | HIGH | Regular timing (human = variable), missing Mini App context | Require valid initData for all actions. Rate limit. CAPTCHA. |
| Withdrawal address manipulation | HIGH | New address from new device, address previously associated with fraud | Address whitelist. 24h cooldown on new addresses. Confirmation notification. |
| Bonus/referral abuse | HIGH | Multiple accounts claiming same bonus, abnormally fast claim rate | Unique IP/device checks. Bonus caps. Manual approval for high-value. |
| Session theft | HIGH | Fingerprint mismatch, token reuse detection | 5min access tokens. HTTP-Only Secure cookies. Session fingerprinting. |
| Data scraping | MEDIUM | Unusual GET patterns, high volume from single IP | Rate limit per endpoint. Return minimal data. Obfuscate IDs. |
| API abuse/fuzzing | MEDIUM | High 400/500 error rate, unusual parameters | Strict input validation (whitelist). Generic error messages. WAF. |
| Rate gaming | MEDIUM | Abnormal mining patterns, data center IPs | Anti-cheat mining logic. Cap max effective speed. |

### 7.2 Access Control Model

```typescript
enum EndpointAccess {
  PUBLIC,           // Only POST /auth/telegram
  AUTHENTICATED,    // Valid JWT required
  STATE_GATED,      // JWT + user must be in allowed states
  KYC_GATED,        // JWT + KYC status >= VERIFIED
  ADMIN_ONLY        // JWT + role = ADMIN
}
```

Every endpoint must declare its access level. State-gated endpoints check `STATE_RESTRICTIONS[currentState]` before proceeding.

---

## 8. Compliance & Trust Review

### 8.1 Areas Requiring Legal Review

| Area | Risk | Required Action |
|------|------|-----------------|
| Jurisdiction classification | Is TitanStream a money transmitter, game, or financial service? | Legal opinion needed before launch. |
| KYC/AML obligations | When does KYC trigger? What AML monitoring is needed? | Consult with AML compliance specialist. |
| Cross-border operations | Which countries are restricted? What are local licensing requirements? | Geo-blocking strategy + per-country legal review. |
| User age requirements | 18+ verification method | Age verification UX + legal review of COPPA/GDPR-K compliance. |
| Terms of Service | Must cover: no guaranteed returns, rate changes, account suspension, liability limits, dispute resolution. | ToS drafting by fintech lawyer. |
| Privacy Policy | Must specifically describe: data collected, purposes, third-party sharing, retention periods, user rights. | Privacy policy drafting by privacy lawyer. |

### 8.2 Required User Disclosures

| Disclosure | Location | Timing |
|------------|----------|--------|
| "Not a bank" disclaimer | Welcome screen, mining screen, withdrawal screen | Persistent |
| "Not investment advice" | Every education module header | Per module |
| "Rewards not guaranteed" | Mining screen, boost purchase screen | Point of action |
| Fee schedule | Withdrawal screen, education module 6 | Before first withdrawal |
| Rate change policy | Settings/FAQ, mining screen footer | Persistent |
| Risk disclosure | Onboarding module 5 + separate consent | Mandatory completion |
| Privacy Policy | Onboarding consent step, app footer | Before data collection |
| Terms of Service | Onboarding consent step | Before account activation |
| AML holding period | Withdrawal screen, onboarding module 6 | Before first withdrawal |
| Support contact | Every error screen, help menu | At point of failure |

### 8.3 Consent Requirements

| Consent | Type | Renewal | Evidence |
|---------|------|---------|----------|
| Risk acknowledgement | Active (button per item) | When risk doc updated | Timestamp + IP + document hash |
| ToS acceptance | Active | When ToS updated | Timestamp + IP + version |
| Privacy acceptance | Active | When Privacy updated | Timestamp + IP + version |
| Data processing consent | Active | Annual | Timestamp + IP |
| Marketing opt-in (optional) | Active | None | Timestamp |
| KYC consent | Active | Per KYC submission | Timestamp + provider reference |

All consents stored with: user_id, type, version, document_hash, ip_address, user_agent, session_id, timestamp.

---

## 9. First Action Optimization

### 9.1 Pre-First-Action Checklist

Before a user can perform their first meaningful financial action (mining), the following MUST be true:

| Check | Where Verified | Friction |
|-------|---------------|----------|
| User has Telegram account >= 30 days | Auth service | None (passive check) |
| User completed all 8 education modules | Onboarding service | 8 modules (~10 min) |
| User passed quiz (100% on risk questions) | Education service | 5 questions |
| User acknowledged all 6 consent items individually | Consent service | 6 interactions |
| User confirmed "Enter TitanStream" | Onboarding service | 1 click |
| User's IP is not from restricted country | Geo-blocking middleware | None (passive check) |
| User's device fingerprint is not flagged | Fraud guard | None (passive check) |
| User has not exceeded account limit per IP/device | Fraud guard | None (passive check) |

### 9.2 First Mining Experience

```
1. User clicks "Start Mining" on dashboard
2. System shows: "Welcome to mining! Here's how it works:" -> 3-slide quick guide
   - Slide 1: "Tap the spinner to earn GH/s (mining speed)"
   - Slide 2: "Your GH/s determines your mining rate"
   - Slide 3: DISCLAIMER: "This is simulated mining. Earnings are platform-determined."
3. User's first tap:
   - System responds: "+0.1 GH/s! Your first mine!"
   - Shows: "You earned mining speed! Speed converts to rewards over time."
   - Shows current balance (0.000001 USDT/TON)
4. After 3 taps:
   - System shows: "Tip: Invite friends to boost your mining speed!"
   - System shows: "Tip: Check the Cooler to multiply your speed!"
5. First session ends:
   - Shows summary: "You mined for X minutes. Earned Y speed. Potential: Z USDT/TON"

All screens carry: "Reward rates determined by TitanStream. Not guaranteed."
```

### 9.3 First Withdrawal Pre-Flight

```
Withdrawal Readiness Checklist (shown before first withdrawal):
  [✓] Identity verified (KYC status)
  [✓] Minimum balance met (X USDT / Y TON)
  [✓] Holding period satisfied (24h since first earning)
  [✓] Withdrawal address is valid (format check)
  [✓] Fee acknowledgement displayed and accepted
  [✓] Network selected (BEP20 / TON)
  [✓] Processing time estimated (1-24h)

  If any check fails -> show specific message and link to resolve.
```

---

## 10. Final Architecture Hardening

### 10.1 Updated System Architecture

```
TELEGRAM CLIENT (Mini App)
       |
       | initData (verified via official + fallback)
       |
FEATURE FLAGS (LaunchDarkly/flagd)
       |
API GATEWAY (NestJS + Cloudflare WAF)
       |
       |--- Auth Verification Service (HMAC only, 500ms timeout)
       |--- Session Service (JWT + Redis primary + PostgreSQL fallback)
       |--- Fraud Guard (real-time, sync)
       |--- State Guard (checks user state per endpoint)
       |
       |--- User Profile Service (CRUD + Telegram sync)
       |--- Onboarding Service (state machine + progress)
       |--- Education Service (module delivery + quiz engine)
       |--- Consent Service (recording + expiry)
       |--- Trust Service (achievements + scoring)
       |--- Notification Service (template + dispatch)
       |
       +--- BullMQ Worker Pool
            |--- Onboarding Worker (nudges + cron: stalled check)
            |--- Notification Worker (rate-limited Telegram dispatch)
            |--- Audit Worker (batch writes)
            |--- Fraud Analyzer (hourly batch)
            |--- Consent Expiry (daily cron)
            |--- Session Cleanup (daily cron)
            |--- Dead Letter Queue (failed jobs with alerting)
       |
       +--- Redis Cluster (Sentinel/HA)
            |--- Session cache (TTL-based)
            |--- Rate limit counters (sliding window)
            |--- BullMQ queues
            |--- Nonce deduplication
            |--- Education progress cache
       |
       +--- PostgreSQL (Primary + Read Replica)
            |--- Users, Sessions (source of truth)
            |--- Onboarding, Education, Consents
            |--- Financial records (wallets, withdrawals)
            |--- Audit logs (partitioned monthly, 7yr retention)
       |
       +--- CDN
            |--- Education module static content (versioned URLs)
            |--- Terms of Service / Privacy Policy (versioned)
```

### 10.2 Updated User Lifecycle

Final states (17 total):
```
NEW_USER -> ONB_WELCOME -> ONB_EDUCATION -> ONB_EDU_COMPLETE
  -> CONSENT_PENDING -> READY_FOR_PLATFORM -> ELIGIBLE_USER
  -> ACTIVE_USER -> AWAITING_KYC -> VERIFIED_USER

Stalled/Dormant:    ONB_STALLED (24h inactive), DORMANT_USER (30d),
                    FROZEN_USER (180d inactive)

Exceptional:        CONSENT_EXPIRED (re-consent needed),
                    FROZEN (emergency/fraud),
                    SUSPENDED (temporary, appealable),
                    BANNED (permanent),
                    PENDING_DELETION (30d grace),
                    DELETED (anonymized, financial records kept)
```

### 10.3 Updated Database Model

New tables: kyc_verifications, user_fingerprints, recovery_codes, security_events, feature_flags

Fields added to existing tables: anonymized_at, last_active_ip, referred_by, blocked_bot, device_type, country_code, suspected_compromised, current_education_module_id, module_version, passed, document_hash, document_url, target_user_id, correlation_id

Critical indexes: (state, updated_at), (user_id, is_active), (event_type, created_at), (severity, created_at)

### 10.4 Updated Backend Services

```
1. Auth Verification Service   - Single responsibility: HMAC verify initData
2. Session Service             - JWT issuance, refresh rotation, Redis session caching
3. User Profile Service        - User CRUD, Telegram profile sync
4. Onboarding Service          - State machine, step advancement (synchronous only)
5. Education Service           - Module delivery, quiz engine, scoring (offline-first)
6. Consent Service             - Individual consent recording, version tracking, expiry
7. Trust Service               - Achievements, education scoring, trust indicators
8. Notification Service        - Template management, rate-limited Telegram dispatch
9. Fraud Guard (Middleware)    - Real-time synchronous fraud checks
10. Batch Fraud Analyzer       - Async hourly/daily clustering analysis
```

### 10.5 Missing Requirements Checklist

| Requirement | Priority | Status |
|-------------|----------|--------|
| KYC/AML strategy | CRITICAL | UNSET — legal review needed |
| Geo-blocking configuration | CRITICAL | UNSET — country list needed |
| Emergency account freeze (/freeze) | CRITICAL | UNSET — not defined |
| Recovery codes (10 codes) | HIGH | UNSET — not defined |
| Offline-first education content | HIGH | UNSET — not defined |
| Returning user flow | HIGH | UNSET — not defined |
| "What is Crypto?" Module 0 | HIGH | UNSET — not defined |
| Withdrawal readiness checklist | HIGH | UNSET — not defined |
| Consent expiry and renewal | HIGH | UNSET — not defined |
| Education module versioning | HIGH | UNSET — not defined |
| Session fingerprint binding | HIGH | UNSET — not defined |
| Redis HA setup | HIGH | UNSET — not defined |
| Secrets manager integration | CRITICAL | UNSET — not defined |
| mTLS for inter-service comms | MEDIUM | UNSET — not defined |
| A/B testing feature flags | MEDIUM | UNSET — not defined |
| Funnel analytics instrumentation | HIGH | UNSET — not defined |
| Rate change notification system | HIGH | UNSET — not defined |

### 10.6 Implementation Blockers

| Blocker | Reason | Unblocked By |
|---------|--------|-------------|
| initData verification protocol stability | Telegram may change unofficial protocol without notice | Implement fallback auth (one-time code, Telegram Login Widget). Architect a kill switch. |
| Regulatory classification | Unknown whether platform is money transmitter/game/financial service | Legal opinion from fintech lawyer. Required before any user Onboarding. |
| Geo-restriction list | Unknown which jurisdictions to block | Business decision + legal review. Must be defined before launch. |
| KYC provider selection | No provider chosen, no integration designed | Evaluate Sumsub, Onfido, Persona. Budget + jurisdiction dependent. |
| Secrets management | No Vault/AWS Secrets Manager configured | DevOps/infrastructure setup required before any service can run. |

### 10.7 Recommended Build Order (Revised)

| Phase | Duration | Focus | Dependencies |
|-------|----------|-------|-------------|
| P0: Legal & Compliance | Week 1-2 | Legal review of jurisdiction classification, KYC/AML requirements, geo-restrictions, ToS, Privacy Policy | None — starts immediately |
| P1: Auth Infrastructure | Week 3-4 | Redis HA, PostgreSQL, secrets manager, mTLS setup, CI/CD pipeline | P0 decisions on geo-blocking |
| P2: Core Auth | Week 5-6 | Auth Verification Service + Session Service + JWT + initData verification + fallback mechanism | P1 infrastructure |
| P3: State Machine + Onboarding | Week 7-8 | Onboarding Service + State Guard middleware + progress tracking + stalled detection | P2 auth |
| P4: Education Engine | Week 9-10 | Education modules + quiz engine + offline-first content + versioning | P3 onboarding |
| P5: Trust Layer | Week 11-12 | Consent Service + audit system + achievement system + education scoring | P4 education |
| P6: Fraud Detection | Week 13-14 | Real-time Fraud Guard + Batch Fraud Analyzer + fingerprinting | P2 auth (needs sessions) |
| P7: Production Hardening | Week 15-16 | Load testing, security audit, monitoring, funnel analytics | P6 fraud detection |

---

## Appendix: Document Decisions Requiring Confirmation

| Ref | Decision | Confirmation Needed From |
|-----|----------|------------------------|
| A9 | initData fallback auth strategy | Tech lead + Telegram API documentation review |
| A13 | KYC/AML requirements | Legal counsel + compliance officer |
| A15 | Money transmitter classification | Legal counsel |
| U2 | Minimum age policy | Legal counsel |
| U4 | Geo-restriction list | Business + legal |
| U14 | Withdrawal refund policy | Finance + legal |
| U17 | Bot messaging permissions | Product |
| U18 | Onboarding completion SLA | Product |
| U21 | Feature flag system choice | Tech lead |
| P0 | KYC provider selection | Product + finance |
