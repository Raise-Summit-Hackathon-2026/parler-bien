# Telephone Fraud Verification & Suspicious Activity Script

**Company:** BrightPath Community Bank | **Doc ID:** FRAUD-CC-007 | **Version:** 4.2 | **Effective:** 2026-03-15 | **Owner:** Fraud Prevention Office

## Purpose & scope

Mandatory script and decision tree for BrightPath Community Bank contact center agents handling inbound calls about account lockouts, wire transfers, card disputes, and suspected phishing. Protects customers and the bank from authorized fraud and social engineering.

## Key terms

- **Out-of-wallet question:** Verification question not answered from data visible on caller ID screen.
- **Hard stop:** End call and warm-transfer to Fraud Specialist queue — no account changes on current call.
- **Coercion indicator:** Caller rushing agent, refusing verification, or coaching "what to say" to another party on the line.

## Standard procedure

1. Open with branded greeting and agent ID; state call may be recorded.
2. Never ask for full SSN or full card number — verify last four only after triad match.
3. Complete verification triad: full name, DOB, last four SSN OR account number + PIN reset security answer.
4. For wire requests over $5,000: read back beneficiary details; mandatory callback to number on file.
5. If caller fails verification twice: hard stop — do not hint which question failed.
6. Document all fraud flags in CRM ticket type FRAUD-INBOUND within 5 minutes of call end.

## Approved phrases

> "For your security, I need to verify a few details before I can access your account."

> "BrightPath will never ask for your password or full Social Security number by phone or text."

> "I'm placing a temporary hold while our fraud team reviews this — you'll receive a letter within three business days."

> "I'll call you back at the number ending in 4821 on your profile — please do not share codes with anyone calling you."

## Scenarios

**Scenario A — Locked online banking:** Customer forgot password after travel. Agent verifies triad, sends one-time reset link to email on file; does not read temporary password aloud.

**Scenario B — Urgent wire to new beneficiary:** Caller insists on same-day wire to overseas account. Agent completes verification, explains callback policy, flags first-time beneficiary for fraud review even if verified.

**Scenario C — "Bank fraud department" callback:** Customer received spoof call; real customer now reports it. Agent verifies identity, reviews recent transactions, issues new debit card, educates on never sharing OTP codes.

## Escalation matrix

| Signal | Route to |
|--------|----------|
| Failed verification x2 | Fraud queue — end call politely |
| Elderly caller + third party coaching | Fraud supervisor + welfare check script |
| Confirmed unauthorized transaction | Disputes team + provisional credit policy |
| Law enforcement on line | BSA officer only — agent does not disclose |

## Do / Don't

**Do:** Pause if caller pressures you to skip steps; use hold to consult fraud playbook.

**Don't:** Send money or unlock accounts based on email requests; trust caller ID alone; read one-time passcodes to caller.
