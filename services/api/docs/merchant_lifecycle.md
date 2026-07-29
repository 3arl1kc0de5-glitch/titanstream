# Merchant Lifecycle & Performance Engine

## Merchant Lifecycle State Machine

```
  [PENDING]  ---> (Admin Approval) --->  [ACTIVE]
      |                                     |
      |                            (Admin Pause/Hold)
      v                                     v
  [DISABLED] <--- (Violation) <--- [PAUSED / SUSPENDED]
```

- **PENDING**: Newly onboarded merchant awaiting KYC/verification.
- **ACTIVE**: Fully verified merchant eligible for dynamic settlement routing.
- **PAUSED**: Temporarily paused merchant (e.g. daily limit reached or merchant request).
- **SUSPENDED**: Suspended by Risk or Operations due to dispute threshold breach.
- **DISABLED**: Permanently deactivated merchant.

## Merchant Trust Score Formula

The Merchant Performance Engine calculates trust scores based on a rolling 30-day window:

$$\text{Trust Score} = 100 - (\text{Disputes} \times 5.0) - (\text{Rejections} \times 2.0) - (\text{Failures} \times 1.0)$$

- Range: `0.0%` to `100.0%`
- Re-calculated dynamically on demand via `GET /admin/merchants/:id/performance`.
- High trust scores prioritize operators during dynamic candidate selection in `RoutingService`.
