# Document E: Database Architecture

This document defines the relational database schemas, naming standards, indexing policies, and migration workflows for PostgreSQL, managed via Prisma ORM.

---

## 1. Entity Relationship Model

```mermaid
erDiagram
    User ||--|| Wallet : owns
    User ||--|| MiningSession : manages
    User ||--o[ UserQuest : attempts
    User ||--o[ UserBoost : activates
    User ||--o[ WithdrawalRequest : requests
    User ||--o[ AuditLog : generates
    Quest ||--o[ UserQuest : references
    BoostPack ||--o[ UserBoost : references
```

---

## 2. Table Definitions (Prisma Schema Reference)

All database entities and fields use standard casing conventions:
* Models are named in **PascalCase** (e.g. `MiningSession`).
* Database table names and column fields map to **snake_case** (e.g. `mining_session`, `user_id`).

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum Currency {
  USDT
  TON
}

enum Network {
  TON
  BEP20
}

enum TxStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum QuestType {
  OURS
  PARTNER
}

enum QuestRewardType {
  BOOST
  CRYSTALS
}

enum QuestStatus {
  IN_PROGRESS
  CLAIMABLE
  CLAIMED
}

model User {
  id                        BigInt              @id @map("id") // Telegram User ID
  username                  String?             @unique @map("username")
  firstName                 String              @map("first_name")
  lastName                  String?             @map("last_name")
  role                      Role                @default(USER) @map("role")
  referrerId                BigInt?             @map("referrer_id")
  invitedCount              Int                 @default(0) @map("invited_count")
  referralBoostMultiplier   Decimal             @default(1.0) @db.Decimal(4, 2) @map("referral_boost_multiplier")
  languageCode              String              @default("en") @map("language_code")
  createdAt                 DateTime            @default(now()) @map("created_at")
  updatedAt                 DateTime            @updatedAt @map("updated_at")
  deletedAt                 DateTime?           @map("deleted_at")

  wallet                    Wallet?
  miningSession             MiningSession?
  quests                    UserQuest[]
  boosts                    UserBoost[]
  withdrawals               WithdrawalRequest[]
  auditLogs                 AuditLog[]

  referrer                  User?               @relation("UserReferrals", fields: [referrerId], references: [id])
  referees                  User[]              @relation("UserReferrals")

  @@index([referrerId])
  @@map("users")
}

model Wallet {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @unique @map("user_id")
  usdtBalance               Decimal             @default(0.000000) @db.Decimal(18, 6) @map("usdt_balance")
  tonBalance                Decimal             @default(0.000000000) @db.Decimal(18, 9) @map("ton_balance")
  crystalsBalance           Int                 @default(0) @map("crystals_balance")
  referralEarnedUsdt        Decimal             @default(0.000000) @db.Decimal(18, 6) @map("referral_earned_usdt")
  referralEarnedTon         Decimal             @default(0.000000000) @db.Decimal(18, 9) @map("referral_earned_ton")
  createdAt                 DateTime            @default(now()) @map("created_at")
  updatedAt                 DateTime            @updatedAt @map("updated_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("wallets")
}

model MiningSession {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @unique @map("user_id")
  activeCurrency            Currency            @default(USDT) @map("active_currency")
  baseSpeedGhs              Decimal             @default(2.60) @db.Decimal(6, 2) @map("base_speed_ghs")
  coolerMultiplier          Decimal             @default(1.00) @db.Decimal(4, 2) @map("cooler_multiplier")
  coolerLastTap             DateTime            @default(now()) @map("cooler_last_tap")
  lastSyncAt                DateTime            @default(now()) @map("last_sync_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("mining_sessions")
}

model Quest {
  id                        String              @id @default(uuid()) @map("id")
  type                      QuestType           @map("type")
  category                  String              @map("category")
  title                     String              @map("title")
  subtitle                  String              @map("subtitle")
  rewardType                QuestRewardType     @map("reward_type")
  rewardValue               Int                 @map("reward_value")
  targetCount               Int                 @default(1) @map("target_count")
  externalUrl               String?             @map("external_url")
  createdAt                 DateTime            @default(now()) @map("created_at")
  updatedAt                 DateTime            @updatedAt @map("updated_at")

  userQuests                UserQuest[]

  @@map("quests")
}

model UserQuest {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @map("user_id")
  questId                   String              @map("quest_id")
  progressCount             Int                 @default(0) @map("progress_count")
  status                    QuestStatus         @default(IN_PROGRESS) @map("status")
  updatedAt                 DateTime            @updatedAt @map("updated_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  quest                     Quest               @relation(fields: [questId], references: [id], onDelete: Cascade)

  @@unique([userId, questId])
  @@map("user_quests")
}

model BoostPack {
  id                        String              @id @default(uuid()) @map("id")
  multiplier                Decimal             @db.Decimal(4, 2) @map("multiplier")
  durationDays              Int                 @map("duration_days")
  priceUsd                  Decimal             @db.Decimal(6, 2) @map("price_usd")
  originalPriceUsd          Decimal?            @db.Decimal(6, 2) @map("original_price_usd")
  isPromo                   Boolean             @default(false) @map("is_promo")
  promoBadge                String?             @map("promo_badge")

  userBoosts                UserBoost[]

  @@map("boost_packs")
}

model UserBoost {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @map("user_id")
  packId                    String              @map("pack_id")
  activatedAt               DateTime            @default(now()) @map("activated_at")
  expiresAt                 DateTime            @map("expires_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  pack                      BoostPack           @relation(fields: [packId], references: [id], onDelete: Cascade)

  @@map("user_boosts")
}

model WithdrawalRequest {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt              @map("user_id")
  currency                  Currency            @map("currency")
  amount                    Decimal             @db.Decimal(18, 6) @map("amount")
  network                   Network             @map("network")
  walletAddress             String              @map("wallet_address")
  txHash                    String?             @map("tx_hash")
  status                    TxStatus            @default(PENDING) @map("status")
  createdAt                 DateTime            @default(now()) @map("created_at")

  user                      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("withdrawal_requests")
}

model AuditLog {
  id                        String              @id @default(uuid()) @map("id")
  userId                    BigInt?             @map("user_id")
  action                    String              @map("action")
  metadata                  Json?               @map("metadata")
  ipAddress                 String?             @map("ip_address")
  createdAt                 DateTime            @default(now()) @map("created_at")

  user                      User?               @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("audit_logs")
}
```

---

## 3. Database Indexes & Constraints

* **Foreign Keys:** Enforced at database level. Cascade deletion is configured for child records (`Wallet`, `MiningSession`, `UserQuest`) to prevent orphan records.
* **Indexes:**
  * Indexes are applied to foreign key query paths (e.g. `users.referrer_id`, `withdrawal_requests.user_id`).
  * `username` is configured with a unique index.
  * `UserQuest` uses a unique index composite key `[user_id, quest_id]` to enforce card uniqueness.

---

## 4. Soft Delete & Auditing Policies

### 4.1 Soft Delete Policy
* The `User` model contains a nullable `deleted_at` timestamp.
* When a user requests account termination or is banned, the record is flagged (`deleted_at = now()`).
* Database fetch middleware or Prisma extension hooks automatically append filters to queries: `where: { deletedAt: null }`.

### 4.2 Audit Strategy
* Critically sensitive modifications (Admin parameters, wallet adjustments, and withdrawal state triggers) write transactional log summaries into the `AuditLog` table, tracking user ID, IP address, exact action tag, and a JSON block of metadata changes.
