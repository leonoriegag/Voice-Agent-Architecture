import { describe, expect, it } from "vitest";
import {
  telco_check_service_status,
  telco_get_bill_status,
  telco_get_customer_usage,
} from "../../domain/telco-tools.js";
import { mapVapiToolCallsBody, mapVapiToolNameToRuntime } from "./map-vapi-tools.js";

describe("mapVapiToolNameToRuntime", () => {
  it("should_map_vapi_underscore_names_to_dotted_runtime_names", () => {
    expect(mapVapiToolNameToRuntime("telco_get_customer_usage")).toBe(telco_get_customer_usage);
    expect(mapVapiToolNameToRuntime("telco_get_bill_status")).toBe(telco_get_bill_status);
    expect(mapVapiToolNameToRuntime("telco_check_service_status")).toBe(telco_check_service_status);
  });

  it("should_pass_through_dotted_runtime_names", () => {
    expect(mapVapiToolNameToRuntime(telco_get_customer_usage)).toBe(telco_get_customer_usage);
  });

  it("should_pass_through_unknown_names_for_allowlist_deny", () => {
    expect(mapVapiToolNameToRuntime("demo.normalize_text")).toBe("demo.normalize_text");
    expect(mapVapiToolNameToRuntime("wom_unknown")).toBe("wom_unknown");
  });
});

describe("mapVapiToolCallsBody", () => {
  it("should_alias_vapi_names_in_tool_call_list", () => {
    const mapped = mapVapiToolCallsBody({
      message: {
        type: "tool-calls",
        toolCallList: [{ id: "call-1", name: "telco_get_bill_status", parameters: {} }],
        call: { id: "vapi-call-1" },
      },
    });
    expect(mapped.calls[0]?.toolName).toBe(telco_get_bill_status);
    expect(mapped.externalChannelId).toBe("vapi-call-1");
  });
});
