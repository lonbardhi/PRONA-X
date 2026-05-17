import assert from "node:assert/strict";
import test from "node:test";

import {
  getAppointmentWorkflowBadge,
  getAppointmentWorkflowType,
} from "./appointments.ts";

test("appointment workflow context follows linked property transaction type", () => {
  assert.equal(getAppointmentWorkflowType({ transaction_type: "sale" }), "sales");
  assert.equal(getAppointmentWorkflowType({ transaction_type: "rent" }), "rentals");
  assert.equal(getAppointmentWorkflowType({ transaction_type: "rent_to_own" }), "rentals");
  assert.equal(getAppointmentWorkflowType({ transaction_type: null }), null);
});

test("appointment workflow badges are localized for calendar UI", () => {
  assert.equal(getAppointmentWorkflowBadge({ transaction_type: "sale" }, "sq"), "Shitje");
  assert.equal(getAppointmentWorkflowBadge({ transaction_type: "rent" }, "sq"), "Qira");
  assert.equal(getAppointmentWorkflowBadge({ transaction_type: "sale" }, "en"), "Sale");
  assert.equal(getAppointmentWorkflowBadge({ transaction_type: "rent" }, "en"), "Rental");
});
