import { z } from "zod";
import type { ToolRegistry } from "../../application/tool-registry.js";
import { MAX_TOOL_STRING_CHARS } from "../../domain/demo-tool.js";
import {
  telco_check_service_status,
  telco_get_bill_status,
  telco_get_customer_usage,
  TELCO_TOOL_TIMEOUT_MS,
  type TelcoDirectory,
} from "../../domain/telco-tools.js";
import { cannedTelcoDirectory } from "../telco/canned-telco-directory.js";

const emptyInput = z.object({}).strict();
const usageOutput = z
  .object({
    phoneNumber: z.string().max(MAX_TOOL_STRING_CHARS),
    dataPlanGb: z.number(),
    dataUsedGb: z.number(),
    dataRemainingGb: z.number(),
    billingCycleEnds: z.string().max(MAX_TOOL_STRING_CHARS),
  })
  .strict();
const billOutput = z
  .object({
    amount: z.number(),
    currency: z.string().max(MAX_TOOL_STRING_CHARS),
    dueDate: z.string().max(MAX_TOOL_STRING_CHARS),
    status: z.string().max(MAX_TOOL_STRING_CHARS),
  })
  .strict();
const serviceOutput = z
  .object({
    service: z.string().max(MAX_TOOL_STRING_CHARS),
    status: z.string().max(MAX_TOOL_STRING_CHARS),
    incident: z.string().max(MAX_TOOL_STRING_CHARS).nullable(),
  })
  .strict();

export function registerTelcoTools(registry: ToolRegistry, directory: TelcoDirectory = cannedTelcoDirectory): void {
  registry.register({
    name: telco_get_customer_usage,
    riskClass: "read",
    source: "native",
    status: "active",
    timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    inputSchema: emptyInput,
    outputSchema: usageOutput,
    execute: () => directory.getCustomerUsage(),
  });
  registry.register({
    name: telco_get_bill_status,
    riskClass: "read",
    source: "native",
    status: "active",
    timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    inputSchema: emptyInput,
    outputSchema: billOutput,
    execute: () => directory.getBillStatus(),
  });
  registry.register({
    name: telco_check_service_status,
    riskClass: "read",
    source: "native",
    status: "active",
    timeoutMs: TELCO_TOOL_TIMEOUT_MS,
    inputSchema: emptyInput,
    outputSchema: serviceOutput,
    execute: () => directory.checkServiceStatus(),
  });
}
