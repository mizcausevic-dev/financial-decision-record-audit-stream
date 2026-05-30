#!/usr/bin/env node
// verify.mjs — Financial Decision Record Audit Stream verifier.
//
// Verifies:
//  1. Schema validation against schema/financial-decision-event.schema.json.
//  2. Hash chain integrity.
//  3. Human-credit-officer invariant: events whose recommendation could trigger
//     an adverse-action notice MUST set human_credit_officer_required = true.
//  4. FCRA-permissible-purpose invariant: events whose resource.type involves
//     credit-bureau data MUST include fcra_governance.permissible_purpose.
//
// Exit codes:
//   0 — all events valid
//   1 — schema failed
//   2 — chain failed
//   3 — human-credit-officer invariant violated
//   4 — FCRA permissible-purpose invariant violated
//   5 — usage / IO error

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ZERO_HASH = "0".repeat(64);

const ADVERSE_ACTION_CAPABLE_KINDS = new Set([
  "fintech.consumer-credit.recommendation-produced",
  "fintech.section-1071-small-business.recommendation-produced",
  "fintech.deposit-account.opening-evaluated",
  "fintech.consumer-credit.line-management-evaluated"
]);

const ADVERSE_ACTION_CAPABLE_RECOMMENDATIONS = new Set([
  "decline",
  "approve-with-conditions",
  "counter-offer",
  "freeze",
  "reduce-line"
]);

const CREDIT_BUREAU_RESOURCE_TYPES = new Set([
  "credit-bureau-tradeline",
  "credit-bureau-inquiry-history"
]);

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

function sha256Hex(s) { return createHash("sha256").update(s, "utf8").digest("hex"); }
function loadJson(path) { return JSON.parse(readFileSync(path, "utf8")); }

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("usage: node src/verify.mjs <events.ndjson>");
    process.exit(5);
  }

  const schema = loadJson(new URL("../schema/financial-decision-event.schema.json", import.meta.url));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const raw = readFileSync(args[0], "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  const events = lines.map((l, i) => {
    try { return JSON.parse(l); }
    catch (e) { console.error(`event ${i}: not JSON — ${e.message}`); process.exit(1); }
  });

  let schemaErrors = 0;
  for (const [i, ev] of events.entries()) {
    if (!validate(ev)) {
      schemaErrors++;
      console.error(`event ${i} (${ev.event_id ?? "?"}): schema errors`);
      for (const e of validate.errors ?? []) console.error(`  - ${e.instancePath || "/"} ${e.message}`);
    }
  }
  if (schemaErrors > 0) { console.error(`schema validation failed: ${schemaErrors}/${events.length}`); process.exit(1); }

  let chainErrors = 0;
  for (const [i, ev] of events.entries()) {
    const expectedPrev = i === 0 ? ZERO_HASH : events[i - 1].hash;
    if (ev.prev_hash !== expectedPrev) {
      chainErrors++;
      console.error(`event ${i} (${ev.event_id}): prev_hash mismatch`);
      continue;
    }
    const { hash, ...rest } = ev;
    const recomputed = sha256Hex(canonicalize(rest));
    if (hash !== recomputed) {
      chainErrors++;
      console.error(`event ${i} (${ev.event_id}): hash mismatch`);
    }
  }
  if (chainErrors > 0) { console.error(`chain validation failed: ${chainErrors}/${events.length}`); process.exit(2); }

  let humanInLoopErrors = 0;
  for (const [i, ev] of events.entries()) {
    if (!ADVERSE_ACTION_CAPABLE_KINDS.has(ev.kind)) continue;
    if (!ev.ai_recommendation) continue;
    const rec = ev.ai_recommendation.recommendation;
    if (!ADVERSE_ACTION_CAPABLE_RECOMMENDATIONS.has(rec)) continue;
    if (ev.ai_recommendation.human_credit_officer_required !== true) {
      humanInLoopErrors++;
      console.error(`event ${i} (${ev.event_id}): recommendation=${rec} on kind=${ev.kind} requires human_credit_officer_required=true (ECOA 12 CFR 1002.9 + CFPB UDAAP + OCC/FRB/FDIC joint AI statement)`);
    }
  }
  if (humanInLoopErrors > 0) { console.error(`human-credit-officer invariant violated: ${humanInLoopErrors}`); process.exit(3); }

  let fcraErrors = 0;
  for (const [i, ev] of events.entries()) {
    if (!CREDIT_BUREAU_RESOURCE_TYPES.has(ev.resource?.type)) continue;
    if (!ev.fcra_governance?.permissible_purpose) {
      fcraErrors++;
      console.error(`event ${i} (${ev.event_id}): credit-bureau resource access requires fcra_governance.permissible_purpose (FCRA 15 USC 1681b)`);
    }
  }
  if (fcraErrors > 0) { console.error(`FCRA permissible-purpose invariant violated: ${fcraErrors}`); process.exit(4); }

  console.log(`OK — ${events.length} events validated, chain intact, human-in-loop + FCRA invariants preserved.`);
}

main();
