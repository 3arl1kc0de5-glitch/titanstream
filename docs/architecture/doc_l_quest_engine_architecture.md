# Document L: Quest Engine Architecture

This document defines the quest validation lifecycle, external task check protocols, and daily cron reset configurations.

---

## 1. Quest Lifecycle State Machine

```
[ Quest Registered in DB ]
           |
           v
    [ Status: IN_PROGRESS ] <--- (User views task card)
           |
           +---------------------------+
           | (Trigger Event)           | (Partner Start Tap)
           v                           v
  [ Progress Evaluation ]        [ External Redirection ]
           |                           |
    (Checks constraints)               v
           |                     [ Status: CHECK ] <--- (User clicks "Check")
           |                           |
           v                           v
    [ Status: CLAIMABLE ] <------------+ (Valid response from API)
           |
           v
     [ User Action: Click Claim ]
           |
           v
    [ System Transaction ] ---> [ Balance Credit ] ---> [ Status: CLAIMED ]
```

---

## 2. Verification Strategies

The Quest Engine uses different verification strategies based on the task type:

### 2.1 Daily Login Quest
* **Mechanism:** When a user logs in, the backend checks their last login date.
* **Verification:** If the calendar date of the last login was yesterday, the streak increments. If it is today, the state is preserved. If it was older, the streak resets to 1. The quest status shifts to `CLAIMABLE` once the daily login check completes.

### 2.2 Telegram Channel Join (Partner Quests)
* **Mechanism:** The user is redirected to a partner channel via a deep link.
* **Verification:**
  * When the user clicks `"Check"`, the backend executes an RPC request to the Telegram Bot API calling the `getChatMember` method:
    `GET https://api.telegram.org/bot<token>/getChatMember?chat_id=<channel_id>&user_id=<user_id>`
  * The response status is parsed. If the user's role is `creator`, `administrator`, or `member`, the status shifts to `CLAIMABLE`. Otherwise, it returns an error.

### 2.3 Home Screen Shortcut Quest
* **Mechanism:** The client uses the browser `beforeinstallprompt` event hook to trigger the shortcut installation.
* **Verification:** Once the native installation dialog completes successfully, the client sends a signed payload to `/api/v1/quests/home-screen/verify`. The server registers the completion and flags the quest as `CLAIMABLE`.

### 2.4 Story Upload Quest
* **Mechanism:** The user clicks `"Post story"` which launches the story editor with a pre-filled graphic.
* **Verification:** Since external story verification is restricted by the Telegram API, the app utilizes client-side share event call receipts. The client reports completion to `/api/v1/quests/story/verify` once the story sharing callback completes.

---

## 3. Daily Reset Cron Engine

* **Reset Interval:** Daily resets run at `00:00 UTC`.
* **Execution Module:**
  * Driven by **BullMQ** scheduled cron jobs.
  * Finds active user quest records (`UserQuest`) linked to tasks categorized as `'Daily'` (e.g. daily logins or daily cooler taps).
  * Executes a database bulk update:
    ```typescript
    await prisma.userQuest.updateMany({
      where: {
        quest: { category: 'Daily' },
        status: { in: ['CLAIMED', 'CLAIMABLE'] }
      },
      data: {
        progressCount: 0,
        status: 'IN_PROGRESS'
      }
    });
    ```
