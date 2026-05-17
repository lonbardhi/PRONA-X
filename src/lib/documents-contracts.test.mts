import assert from "node:assert/strict";
import test from "node:test";

import {
  formatContractTransactionMismatch,
  getContractTransactionScope,
  isContractCompatibleWithTransaction,
} from "./documents-contracts.ts";

test("contract workflow scope separates rental and sale contracts", () => {
  assert.equal(getContractTransactionScope("rent_contract"), "rental");
  assert.equal(getContractTransactionScope("tenant_brokerage_contract"), "rental");
  assert.equal(getContractTransactionScope("buying_contract"), "sale");
  assert.equal(getContractTransactionScope("buyer_brokerage_contract"), "sale");
  assert.equal(getContractTransactionScope("owner_mandate_contract"), "neutral");
});

test("contract creation rejects obvious sale and rental transaction mismatches", () => {
  assert.equal(isContractCompatibleWithTransaction("rent_contract", "rent"), true);
  assert.equal(isContractCompatibleWithTransaction("rent_contract", "sale"), false);
  assert.equal(isContractCompatibleWithTransaction("buying_contract", "sale"), true);
  assert.equal(isContractCompatibleWithTransaction("buying_contract", "rent"), false);
  assert.equal(isContractCompatibleWithTransaction("owner_mandate_contract", "rent"), true);
});

test("contract mismatch message is user-safe and localized", () => {
  assert.match(
    formatContractTransactionMismatch("buying_contract", "rent", "en") || "",
    /does not match this rental listing/,
  );
  assert.match(
    formatContractTransactionMismatch("rent_contract", "sale", "sq") || "",
    /nuk perputhet/,
  );
});
