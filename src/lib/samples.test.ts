import { describe, expect, it } from "vitest";
import { analyzeParsedChat } from "./metrics";
import { parseWhatsAppChat } from "./parser";
import { GROUP_SAMPLE, INDIVIDUAL_SAMPLE } from "./samples";

describe("preloaded chat samples (RF-02)", () => {
  it("parses and analyzes INDIVIDUAL_SAMPLE as a valid individual chat", () => {
    const parsed = parseWhatsAppChat(INDIVIDUAL_SAMPLE.rawText);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.kind).toBe("individual");
    expect(parsed.data.hasInsufficientSample).toBe(false);
    expect(parsed.data.audioOmittedCount).toBe(1);

    const report = analyzeParsedChat(parsed.data);
    expect(report.insufficientSampleNotice).toBeNull();
    expect(report.mandatory.fillerPercentage.formattedValue).toMatch(/^\d+,\d{2}$/);
  });

  it("parses and analyzes GROUP_SAMPLE as a valid group chat", () => {
    const parsed = parseWhatsAppChat(GROUP_SAMPLE.rawText);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.kind).toBe("group");
    expect(parsed.data.participants.length).toBeGreaterThanOrEqual(3);
    expect(parsed.data.hasInsufficientSample).toBe(false);

    const report = analyzeParsedChat(parsed.data);
    expect(report.insufficientSampleNotice).toBeNull();
    expect(report.mandatory.dramaLevel.value).toBeGreaterThan(0);
  });
});

