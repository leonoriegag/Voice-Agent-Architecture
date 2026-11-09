import { describe, expect, it } from "vitest";
import { DEMO_ECHO_TOKEN, DEMO_NORMALIZE_TEXT, RUNTIME_DEMO_ALLOWLIST } from "./demo-tool.js";
import {
  telco_check_service_status,
  TELCO_SERVICE_ALLOWLIST,
  telco_get_bill_status,
  telco_get_customer_usage,
} from "./telco-tools.js";

describe("wom customer-service tool policy", () => {
  it("should_allowlist_exactly_three_wom_tools", () => {
    expect([...TELCO_SERVICE_ALLOWLIST]).toEqual([
      telco_get_customer_usage,
      telco_get_bill_status,
      telco_check_service_status,
    ]);
    expect(TELCO_SERVICE_ALLOWLIST).not.toContain(DEMO_NORMALIZE_TEXT);
    expect(TELCO_SERVICE_ALLOWLIST).not.toContain(DEMO_ECHO_TOKEN);
  });

  it("should_keep_runtime_demo_allowlist_exclusive_of_wom_tools", () => {
    expect([...RUNTIME_DEMO_ALLOWLIST]).toEqual([DEMO_NORMALIZE_TEXT]);
    expect(RUNTIME_DEMO_ALLOWLIST).not.toContain(telco_get_customer_usage);
    expect(RUNTIME_DEMO_ALLOWLIST).not.toContain(telco_get_bill_status);
    expect(RUNTIME_DEMO_ALLOWLIST).not.toContain(telco_check_service_status);
  });
});
