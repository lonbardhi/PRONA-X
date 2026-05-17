import assert from "node:assert/strict";
import test from "node:test";

import {
  canRequestMatchProperty,
  canRequestCreateListing,
  formatCrmRequestBadge,
  formatCrmRequestMatchStatus,
  formatRequestBudget,
  formDataToCrmRequestInput,
  getRequestModulePath,
  isBuyerRequest,
  isTenantRequest,
  type CrmRequestRecord,
} from "./crm-requests.ts";

function createBaseFormData() {
  const formData = new FormData();
  formData.set("customer_name", "Arta Hoxha");
  formData.set("phone", "+355 69 123 4567");
  formData.set("request_type", "buyer");
  formData.set("source", "whatsapp");
  formData.set("status", "new");
  return formData;
}

test("buyer and tenant requests route to matching modules without becoming listings", () => {
  assert.equal(getRequestModulePath("buyer"), "/sales");
  assert.equal(getRequestModulePath("investor"), "/sales");
  assert.equal(getRequestModulePath("tenant"), "/rentals");
  assert.equal(getRequestModulePath("owner"), "/requests");
  assert.equal(isBuyerRequest("buyer"), true);
  assert.equal(isTenantRequest("tenant"), true);
});

test("tenant request requires rent period", () => {
  const formData = createBaseFormData();
  formData.set("request_type", "tenant");

  assert.throws(
    () => formDataToCrmRequestInput(formData),
    /periudhën e qirasë/,
  );
});

test("request budgets validate order and keep request language separate", () => {
  const invalid = createBaseFormData();
  invalid.set("min_budget_eur", "200000");
  invalid.set("max_budget_eur", "100000");

  assert.throws(() => formDataToCrmRequestInput(invalid), /Buxheti maksimal/);

  const request = {
    max_budget_eur: 150000,
    min_budget_eur: 100000,
    request_type: "buyer",
  } as CrmRequestRecord;
  assert.match(formatRequestBudget(request, "sq"), /^Buxheti:/);
});

test("request badges make buyer and tenant cards explicit", () => {
  assert.equal(formatCrmRequestBadge("buyer", "sq"), "KËRKESË BLERËSI");
  assert.equal(formatCrmRequestBadge("tenant", "sq"), "KËRKESË QIRAMARRËSI");
  assert.equal(formatCrmRequestBadge("buyer", "en"), "BUYER REQUEST");
});
test("request matches are scoped to the correct transaction module", () => {
  assert.equal(canRequestMatchProperty("buyer", "sale"), true);
  assert.equal(canRequestMatchProperty("buyer", "rent"), false);
  assert.equal(canRequestMatchProperty("tenant", "rent"), true);
  assert.equal(canRequestMatchProperty("tenant", "sale"), false);
  assert.equal(canRequestMatchProperty("owner", "sale"), false);
  assert.equal(formatCrmRequestMatchStatus("sent", "en"), "Sent");
});

test("only owner requests can create sale or rental listing drafts", () => {
  assert.equal(canRequestCreateListing("owner"), true);
  assert.equal(canRequestCreateListing("buyer"), false);
  assert.equal(canRequestCreateListing("tenant"), false);
  assert.equal(canRequestCreateListing("investor"), false);
});
