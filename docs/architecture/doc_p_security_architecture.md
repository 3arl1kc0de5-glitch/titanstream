# Document P: Security Architecture

This document defines the platform threat model, input sanitization rules, rate-limiting policies, and disaster recovery blueprints.

---

## 1. Threat Model & Vulnerability Vectors

| Threat Vector | Description | Mitigation Strategy |
|---|---|---|
| **Client-Side Yield Tampering**| Users hack the React build to inflate mining speed or claim invalid USDT balances. | **Server Authority:** The client only displays interpolated values. The database and calculations are computed on the server. |
| **Referral Sybil Attack** | Attackers create automated bots to register under their own referral links for multipliers. | **Activity Gates:** Multipliers are only active when referees complete basic quests (e.g. daily login check). |
| **API Parameter Injection** | Attackers attempt SQL injection, XSS, or parameter manipulation via API requests. | **DTO Validation:** Strict whitelisting with NestJS class-validator pipes rejects any properties not defined in the DTO schema. |
| **Replay Attacks** | Replaying old Telegram auth signatures. | **Timestamp Check:** Validates that `auth_date` is within a 24-hour window. |
| **Outbound Wallet Drain** | Exploiters attempt to request multiple rapid withdrawals. | **Locked Balances:** Instant locking of funds on submission. BullMQ sequential execution limits. Manual approval thresholds for transfers $\ge$ $50. |

---

## 2. Input Sanitization & Web Security Controls

* **SQL Injection Prevention:**
  * Driven by **Prisma ORM** which automatically parameterized queries, eliminating SQL injection vectors.
* **Cross-Site Scripting (XSS):**
  * React automatically escapes variables in JSX.
  * APIs use the NestJS `helmet` middleware to apply HTTP security headers (e.g., Content-Security-Policy, X-Frame-Options, X-Content-Type-Options).
* **Cross-Site Request Forgery (CSRF):**
  * Short-lived JWTs are stored in application memory. Long-lived refresh cookies use `SameSite=Strict` and `Secure` attributes, preventing CSRF tokens from being sent on third-party links.

---

## 3. Infrastructure & Network Shielding

* **DDoS & Web Application Firewall (WAF):**
  * Hosted exclusively behind **Cloudflare**.
  * WAF rules are configured to challenge suspicious IP regions, restrict requests containing SQL/XSS signatures, and rate-limit repeat API calls.
* **Container Isolation:**
  * Application containers run inside a private Docker bridge network. The only port exposed to the host system is Nginx (`80/443`). Direct database connections from outside the host VPS are blocked.

---

## 4. Secrets & Key Storage Management

* **Environment Separation:**
  * Production secrets (database password, bot token, encryption keys, hot wallet private keys) are never committed to git.
  * Secrets are injected into containers at runtime using secure env files managed via Docker Compose, or accessed from a vault service.
* **Cryptographic Storage:**
  * Sensitive configuration variables (e.g., hot wallet private keys used by workers) are encrypted at rest using AES-256-GCM. The decryption key is passed via system environment variables.

---

## 5. Backup & Disaster Recovery Blueprint

* **Database Backups:**
  * Automated nightly snapshots are generated using `pg_dump`.
  * Backups are encrypted and pushed to an external S3-compatible bucket.
  * **Retention policy:** Backups are retained for 30 days.
* **Recovery Procedure:**
  * System configurations are defined in Docker Compose and Nginx files. Recovery involves deploying the repository configuration to a new VPS instance, initializing containers, and restoring the database from the latest encrypted S3 snapshot.
* **Target metrics:**
  * Recovery Point Objective (RPO): Maximum 24 hours of lost transactions.
  * Recovery Time Objective (RTO): Restored within 2 hours of hardware failure.
