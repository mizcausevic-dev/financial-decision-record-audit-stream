# financial-decision-record-audit-stream

> **Financial Decision Record Audit Stream v0.1 draft.** Per-consumer-credit / deposit-account / payment / fraud / AML / robo-advisor / Section-1071-small-business AI-tool-access events, hash-chained and signed, designed to bridge core-banking + ACH + card-network semantics to the Kinetic Gain Protocol Suite audit-stream spine. The Operator surface that lets a bank's / credit-union's / neobank's / fintech's core-banking + fraud + KYC + lending platforms emit Suite-compliant audit events covering the seven primary FinTech AI decision surfaces under one schema with kind enum branching.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com). Opens the **FinTech / Financial Services AI** vertical alongside the existing HealthTech, EdTech, PropTech, InsurTech, and HR Tech 6-packs.

> Status: v0.1 draft. Schema at [`schema/financial-decision-event.schema.json`](./schema/financial-decision-event.schema.json), Node verifier at [`src/verify.mjs`](./src/verify.mjs), canonical example at [`examples/meridian-creditmind-2026q4/`](./examples/meridian-creditmind-2026q4/).

## Why this exists

**CFPB Section 1071** (small business lending data collection) is in phased compliance through 2026. **CFPB Section 1033** (consumer financial data rights) proposed rule is reshaping data portability + AI use. The **OCC + FRB + FDIC joint statement on use of AI** (2023) sets banking-supervisor expectations. **OCC Bulletin 2011-12** + **FRB SR 11-7** define the model-risk-management framework that AI tools must fit into. **ECOA Reg B (12 CFR Part 1002)** applies broadly across all consumer credit, not just mortgage. **FCRA Reg V (12 CFR Part 1022)** governs every credit-bureau pull. **GLBA Safeguards (16 CFR Part 314)** governs every customer-data exchange with a vendor. **BSA/AML (31 CFR Part 1010)** governs every KYC / SAR / CTR moment.

A bank / credit union / fintech that uses AI tools across consumer credit + deposit + payment + fraud + AML + robo-advisor + small business lending needs a single audit-stream architecture that satisfies all of those regulators at once. This repo defines the schema + verifier.

**Out of scope**: mortgage lending (handled by [`mortgage-decision-record-audit-stream`](https://github.com/mizcausevic-dev/mortgage-decision-record-audit-stream) — PropTech sibling) and insurance underwriting / claims (handled by [`insurance-decision-record-audit-stream`](https://github.com/mizcausevic-dev/insurance-decision-record-audit-stream) — InsurTech sibling).

## Two distinct invariants

**Invariant 1: human-credit-officer required.** Events whose `kind` is in the adverse-action-capable set AND whose `ai_recommendation.recommendation` is in `{decline, approve-with-conditions, counter-offer, freeze, reduce-line}` MUST set `ai_recommendation.human_credit_officer_required = true`. Verifier exits **3**. ECOA 12 CFR §1002.9 + CFPB UDAAP + OCC/FRB/FDIC joint AI statement — no autonomous adverse-action issuance.

**Invariant 2: FCRA permissible-purpose required.** Events whose `resource.type` is in `{credit-bureau-tradeline, credit-bureau-inquiry-history}` MUST include `fcra_governance.permissible_purpose`. Verifier exits **4**. FCRA §604 (15 USC 1681b) — every credit-bureau pull must be tied to a permissible-purpose code.

## The shape

| Field group | Purpose |
| --- | --- |
| `event_id`, `timestamp`, `kind` | 15-kind event taxonomy across consumer credit + deposit account + payment + fraud + AML/BSA + robo-advisor + Section 1071 small business + deletion |
| `source` | Emitting system (core banking, ATM, mobile, fraud engine, KYC engine, vendor AI tool) |
| `subject_ref` | **Tokenized** consumer / applicant / business identifier — raw SSN, EIN, account number, name, DOB MUST NOT appear |
| `product_line` | 19-line product taxonomy (credit card / personal loan / BNPL / deposit / payment rail / robo / small business loan etc.) |
| `resource` | 18-type resource taxonomy (consumer-credit-application + small-business-credit-application-section-1071 + deposit-account-application + credit-bureau-tradeline + alternative-data-cashflow + alternative-data-bnpl-history + device-fingerprint + IP-geo + telephony + transaction history + payment instruction + KYC document + AML screening + robo-investor questionnaire + adverse-action notice + credit-line management event) |
| `regulatory_basis` | 15-doctrine taxonomy spanning CFPB + OCC/FRB/FDIC joint AI + OCC 2011-12 + FRB SR 11-7 + ECOA + FCRA + GLBA + BSA/AML + SEC/FINRA + consent + judicial-order |
| `records_of_disclosure_status` | ECOA + Section 1071 LAR + GLBA + BSA/AML logs |
| `ai_recommendation` | OPTIONAL — invariant 1 applies on adverse-action-capable events |
| `fcra_governance` | OPTIONAL — invariant 2 applies on credit-bureau resources |
| `signature` | Optional ed25519 |
| `prev_hash`, `hash` | Hash chain (SHA-256 over canonical JSON of event minus `hash`) |

## Canonical example

[`examples/meridian-creditmind-2026q4/source.json`](./examples/meridian-creditmind-2026q4/source.json) — three events from Meridian Financial's 2026 Q4 stream:

1. **`fintech.consumer-credit.application-read`** — VendorF CreditMind v4.x pulls five tokenized credit-bureau-tradeline fields under FCRA §604 permissible-purpose `credit-transaction-initiated-by-consumer`. Tokenized applicant ID. Name / SSN / address / DOB redacted.
2. **`fintech.consumer-credit.recommendation-produced`** — VendorF recommends `approve-with-conditions` with reason codes + model_confidence 0.81 + `human_credit_officer_required: true`. (NOT a final decision.)
3. **`fintech.consumer-credit.adverse-action-evaluated`** — Meridian's human credit officer accepts the approve-with-conditions recommendation but reduces from $20K to $7,500 limit with rate-up, issues counter-offer adverse-action notice with reasons reconciled against ECOA 1002.9(b)(2) + FCRA §615.

## Composes with

| Repo | Role |
| --- | --- |
| [`evidence-bundle-spec`](https://github.com/mizcausevic-dev/evidence-bundle-spec) | Underlying audit-stream conventions |
| [`fhir-resource-access-audit`](https://github.com/mizcausevic-dev/fhir-resource-access-audit) | Sibling HealthTech audit-stream |
| [`student-data-access-audit-stream`](https://github.com/mizcausevic-dev/student-data-access-audit-stream) | Sibling EdTech audit-stream |
| [`mortgage-decision-record-audit-stream`](https://github.com/mizcausevic-dev/mortgage-decision-record-audit-stream) | Sibling PropTech audit-stream (mortgage-only) |
| [`insurance-decision-record-audit-stream`](https://github.com/mizcausevic-dev/insurance-decision-record-audit-stream) | Sibling InsurTech audit-stream |
| [`employment-decision-record-audit-stream`](https://github.com/mizcausevic-dev/employment-decision-record-audit-stream) | Sibling HR Tech audit-stream |

## Compliance posture

FinTech-readiness scaffolding for CFPB AI bulletin (2023) + CFPB Section 1071 small business + CFPB Section 1033 financial data rights + CFPB UDAAP + OCC/FRB/FDIC joint AI statement (2023) + OCC Bulletin 2011-12 model-risk-management + FRB SR 11-7 + ECOA Reg B (12 CFR Part 1002) + FCRA Reg V (12 CFR Part 1022) + GLBA Safeguards (16 CFR Part 314) + GLBA Financial Privacy (12 CFR Part 1016) + BSA/AML (31 CFR Part 1010) + SEC/FINRA investment-recommendation best-interest standards. The schema + verifier support an institution's program toward those expectations but do not by themselves establish compliance with any of them. Per the standing public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "CFPB-compliant" or "ECOA-attested" without an external attestation.

## License

MIT — see [`LICENSE`](./LICENSE).
