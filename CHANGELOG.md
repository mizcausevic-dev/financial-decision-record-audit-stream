# Changelog

## [0.1] — 2026-05-29

### Added

- Initial draft event schema.
- 15-kind event taxonomy spanning consumer credit + deposit account + payment + fraud + AML/BSA + robo-advisor + Section 1071 small business + deletion.
- 19-line product taxonomy.
- 18-type resource taxonomy.
- 15-doctrine regulatory_basis taxonomy.
- TWO orthogonal invariants: human-credit-officer-required (exit 3) AND FCRA permissible-purpose required (exit 4).
- Optional `fcra_governance` block (permissible_purpose, consumer-dispute-pathway-uri, adverse-action-fcra-615-notice-template-id).
- Hash chain conventions.
- Node verifier with 5 distinct exit codes.
- Canonical example: Meridian Financial 2026 Q4 consumer-credit-card stream — VendorF CreditMind v4.x pull → recommendation → human credit officer counter-offer adverse-action notice.
- CI workflow.

### Not yet

- Section 1071 small business example stream.
- Deposit-account opening + KYC example stream.
- Payment-fraud-flagging example stream.
- Robo-advisor recommendation example stream.
- AML/BSA SAR-candidate example stream.
- Optional Rust + Go verifiers.
