import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AGENT_ERROR_CODES } from "../../domain/agent.js";
import {
  CANNED_TELCO_BILL,
  CANNED_TELCO_SERVICE,
  CANNED_TELCO_TEST_MSISDN,
  CANNED_TELCO_USAGE,
  telco_check_service_status,
  TELCO_SERVICE_ALLOWLIST,
  telco_get_bill_status,
  telco_get_customer_usage,
  TELCO_TOOL_TIMEOUT_MS,
} from "../../domain/telco-tools.js";
import { ToolRegistry } from "../../application/tool-registry.js";
import { DEMO_NORMALIZE_TEXT, RUNTIME_DEMO_ALLOWLIST } from "../../domain/demo-tool.js";
import { failingTelcoDirectory } from "../telco/canned-telco-directory.js";
import { NativeToolPort, createSessionOwnerToolPort, listRegisteredRiskClasses } from "./native-tool-port.js";
import { createProductToolRegistry } from "./create-default-registry.js";
import { registerTelcoTools } from "./register-telco-tools.js";

describe("wom native tools", () => {
  const tools = new NativeToolPort({ registry: createProductToolRegistry() });

  it("should_return_canned_payloads_for_empty_object_input", async () => {
    const usage = await tools.authorizeAndExecute({
      toolName: telco_get_customer_usage,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    const bill = await tools.authorizeAndExecute({
      toolName: telco_get_bill_status,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    const service = await tools.authorizeAndExecute({
      toolName: telco_check_service_status,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });

    expect(usage).toMatchObject({ ok: true, payload: { ...CANNED_TELCO_USAGE, phoneNumber: CANNED_TELCO_TEST_MSISDN } });
    expect(bill).toMatchObject({ ok: true, payload: CANNED_TELCO_BILL });
    expect(service).toMatchObject({ ok: true, payload: CANNED_TELCO_SERVICE });
  });

  it("should_reject_extra_properties_without_running_the_directory", async () => {
    let ran = 0;
    const registry = new ToolRegistry();
    registerTelcoTools(registry, {
      getCustomerUsage: () => {
        ran += 1;
        return { ...CANNED_TELCO_USAGE };
      },
      getBillStatus: () => {
        ran += 1;
        return { ...CANNED_TELCO_BILL };
      },
      checkServiceStatus: () => {
        ran += 1;
        return { ...CANNED_TELCO_SERVICE };
      },
    });
    const port = new NativeToolPort({ registry });
    const usage = await port.authorizeAndExecute({
      toolName: telco_get_customer_usage,
      arguments: { phoneNumber: "15550000000" },
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    const bill = await port.authorizeAndExecute({
      toolName: telco_get_bill_status,
      arguments: { extra: true },
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });

    expect(ran).toBe(0);
    expect(usage).toMatchObject({ ok: false, code: AGENT_ERROR_CODES.TOOL_INVALID_ARGS });
    expect(bill).toMatchObject({ ok: false, code: AGENT_ERROR_CODES.TOOL_INVALID_ARGS });
  });

  it("should_map_injected_directory_failure_to_tool_failed_without_success_payload", async () => {
    const registry = new ToolRegistry();
    registerTelcoTools(registry, failingTelcoDirectory("directory boom"));
    const port = new NativeToolPort({ registry });
    const result = await port.authorizeAndExecute({
      toolName: telco_get_bill_status,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(AGENT_ERROR_CODES.TOOL_FAILED);
      expect(result.message).not.toContain("directory boom");
    }
    expect(JSON.stringify(result)).not.toContain(String(CANNED_TELCO_BILL.amount));
    expect(JSON.stringify(result)).not.toContain(CANNED_TELCO_BILL.dueDate);
  });

  it("should_deny_wom_tools_on_the_runtime_demo_allowlist", async () => {
    const port = new NativeToolPort({
      registry: createProductToolRegistry(),
      allowedTools: RUNTIME_DEMO_ALLOWLIST,
    });
    const result = await port.authorizeAndExecute({
      toolName: telco_get_customer_usage,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    expect(result).toMatchObject({ ok: false, code: AGENT_ERROR_CODES.TOOL_DENIED });
  });

  it("should_deny_cross_owner_tools_on_bound_session_owner_ports_without_handleAgentTurn", async () => {
    const demoPort = createSessionOwnerToolPort(RUNTIME_DEMO_ALLOWLIST);
    const womPort = createSessionOwnerToolPort(TELCO_SERVICE_ALLOWLIST);
    const womOnDemo = await demoPort.authorizeAndExecute({
      toolName: telco_get_customer_usage,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    const normalizeOnWom = await womPort.authorizeAndExecute({
      toolName: DEMO_NORMALIZE_TEXT,
      arguments: { text: "hola" },
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });
    const usageOnWom = await womPort.authorizeAndExecute({
      toolName: telco_get_customer_usage,
      arguments: {},
      timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    });

    expect(womOnDemo).toMatchObject({ ok: false, code: AGENT_ERROR_CODES.TOOL_DENIED });
    expect(normalizeOnWom).toMatchObject({ ok: false, code: AGENT_ERROR_CODES.TOOL_DENIED });
    expect(usageOnWom).toMatchObject({ ok: true, payload: CANNED_TELCO_USAGE });
  });

  it("should_register_wom_tools_on_the_product_catalog_as_native_read", () => {
    const product = createProductToolRegistry();
    expect(product.resolve(telco_get_customer_usage)).toMatchObject({
      riskClass: "read",
      source: "native",
      status: "active",
    });
    expect(product.resolve(telco_get_bill_status)?.timeoutMs).toBeLessThanOrEqual(500);
    expect(product.resolve(DEMO_NORMALIZE_TEXT)?.source).toBe("native");
    expect(new Set(listRegisteredRiskClasses(product))).toEqual(new Set(["read"]));
  });

  it("should_keep_the_canned_directory_offline", () => {
    const source = readFileSync(fileURLToPath(new URL("../telco/canned-telco-directory.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/\bfetch\b/);
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/\bhttp\b/);
    expect(source).not.toMatch(/wom\.cl/i);
  });
});
