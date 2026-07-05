# Tier-1 Support Escalation Playbook

**Company:** TechFlow SaaS | **Doc ID:** SUP-L1-012 | **Version:** 3.1 | **Effective:** 2026-03-01 | **Owner:** Customer Support Operations

## Purpose & scope

Playbook for Tier-1 support agents at TechFlow SaaS handling inbound chat and email for the FlowBoard product. Defines when to resolve at L1, when to escalate to L2 Engineering or Account Management, and required data collection.

## Key terms

- **P1:** Production down or data loss — 15-minute escalation to L2 on-call.
- **P2:** Major feature broken for multiple users — 4-hour L2 response.
- **P3:** Single-user issue or how-to — L1 owns unless unresolved after 20 minutes documented troubleshooting.
- **Repro steps:** Numbered steps another agent can follow to see the same bug.

## Standard procedure

1. Acknowledge ticket within SLA (chat: 2 min; email: 4 business hours).
2. Identify account in CRM; confirm plan tier and admin vs. member role.
3. Classify severity using decision tree in appendix A — do not let customer set P1 alone.
4. Collect: browser/OS, workspace ID, timestamp UTC, screenshots, repro steps.
5. Search internal KB and known-issues board before escalating.
6. If escalating: complete escalation template ESC-001; warm handoff in Slack #l2-escalations for P1/P2.

## Approved phrases (chat/email)

> "I'm sorry FlowBoard isn't syncing your boards right now — I'm going to trace this on our side and keep you updated every thirty minutes."

> "To escalate to our engineering team I need the exact steps that led to the error — can you walk me through click by click?"

> "Your account shows the Enterprise SSO module — I'm looping in our identity specialist who can join this thread within the hour."

> "This is resolved in version 4.2.1 — I'll send the release notes link and confirm your workspace updates tonight."

## Scenarios

**Scenario A — Login loop after SSO change:** Admin changed Okta mapping. L1 verifies SAML logs, finds certificate expiry, escalates to Identity L2 with P2; provides customer workaround (backup login domain) if documented.

**Scenario B — "Everything is down":** Customer on free tier, single user, local Wi-Fi issue. L1 runs status page check — no incident; guides cache clear; does not escalate as P1.

**Scenario C — Data export missing rows:** Paid team, reproducible export bug. L1 collects sample export + expected row count; files P2 with repro; sets expectation on fix timeline from known issues.

## Escalation matrix

| Condition | Escalate to |
|-----------|-------------|
| P1 production outage | L2 on-call + incident commander |
| Security / data breach suspicion | Security ops — do not ask customer for passwords |
| Billing dispute > $500 | Account management |
| Feature request only | Product feedback tag — no L2 |
| Abusive language | Supervisor — agent may end chat per policy |

## Do / Don't

**Do:** Set clear next-update time; summarize ticket in one sentence for L2; thank customer for patience.

**Don't:** Promise ship dates; share internal Jira keys with customers; escalate without repro steps or logs.
