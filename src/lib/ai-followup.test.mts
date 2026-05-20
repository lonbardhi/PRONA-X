import assert from "node:assert/strict";
import test from "node:test";

import { generateFollowUpInsight } from "../modules/ai-followup/followup.engine.ts";
import type { LeadActivityEvent } from "../modules/ai-followup/followup.types.ts";

test("follow-up engine returns useful defaults without lead activity", () => {
  const insight = generateFollowUpInsight(
    "00000000-0000-4000-8000-000000000001",
    [],
    new Date("2026-05-20T08:00:00.000Z"),
  );

  assert.equal(insight.engagementScore, 0);
  assert.equal(insight.responseProbability, 0);
  assert.equal(insight.urgencyLevel, "Low");
  assert.equal(insight.preferredChannel, "whatsapp");
  assert.equal(insight.bestContactDay, "Tuesday");
  assert.equal(insight.bestContactWindow, "10:00–12:00");
  assert.deepEqual(insight.reasoning.weakSignals, [
    "No activity events recorded yet",
  ]);
});

test("follow-up engine detects urgent WhatsApp and viewing intent", () => {
  const leadId = "00000000-0000-4000-8000-000000000002";
  const events: LeadActivityEvent[] = [
    {
      channel: "whatsapp",
      createdAt: "2026-05-19T08:30:00.000Z",
      eventType: "whatsapp_reply_received",
      leadId,
    },
    {
      channel: "crm",
      createdAt: "2026-05-19T08:45:00.000Z",
      eventType: "viewing_requested",
      leadId,
    },
    {
      channel: "crm",
      createdAt: "2026-05-18T08:45:00.000Z",
      eventType: "property_viewed",
      leadId,
    },
    {
      channel: "crm",
      createdAt: "2026-05-18T09:10:00.000Z",
      eventType: "property_viewed",
      leadId,
    },
  ];

  const insight = generateFollowUpInsight(
    leadId,
    events,
    new Date("2026-05-20T08:00:00.000Z"),
  );

  assert.equal(insight.urgencyLevel, "High");
  assert.equal(insight.preferredChannel, "whatsapp");
  assert.equal(insight.bestContactDay, "Tuesday");
  assert.equal(insight.bestContactWindow, "10:00–12:00");
  assert.ok(insight.engagementScore > 80);
  assert.ok(insight.responseProbability > 70);
  assert.ok(insight.reasoning.strongestSignals.includes("Viewing requested"));
  assert.ok(insight.reasoning.strongestSignals.includes("Replied on WhatsApp"));
  assert.ok(
    insight.reasoning.strongestSignals.includes("Viewed properties multiple times"),
  );
});

test("follow-up engine lowers confidence for stale negative signals", () => {
  const leadId = "00000000-0000-4000-8000-000000000003";
  const insight = generateFollowUpInsight(
    leadId,
    [
      {
        channel: "phone",
        createdAt: "2026-04-01T08:00:00.000Z",
        eventType: "phone_call_missed",
        leadId,
      },
      {
        channel: "manual",
        createdAt: "2026-04-02T08:00:00.000Z",
        eventType: "no_response",
        leadId,
      },
    ],
    new Date("2026-05-20T08:00:00.000Z"),
  );

  assert.equal(insight.urgencyLevel, "Low");
  assert.equal(insight.responseProbability, 0);
  assert.ok(insight.reasoning.weakSignals.includes("No recent activity"));
  assert.ok(insight.reasoning.weakSignals.includes("Missed phone call"));
});
