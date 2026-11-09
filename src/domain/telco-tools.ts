import { DEMO_TOOL_TIMEOUT_MS } from "./demo-tool.js";

export const TELCO_SERVICE_AGENT_ID = "telco-service-agent";

export const telco_get_customer_usage = "telco.get_customer_usage";
export const telco_get_bill_status = "telco.get_bill_status";
export const telco_check_service_status = "telco.check_service_status";

export const TELCO_SERVICE_ALLOWLIST = [
  telco_get_customer_usage,
  telco_get_bill_status,
  telco_check_service_status,
] as const;

export const TELCO_TOOL_TIMEOUT_MS = DEMO_TOOL_TIMEOUT_MS;

/** Reserved all-zero test MSISDN. Not a real subscriber and not an identity input. */
export const CANNED_TELCO_TEST_MSISDN = "15550000000";

export const CANNED_TELCO_USAGE = {
  phoneNumber: CANNED_TELCO_TEST_MSISDN,
  dataPlanGb: 40,
  dataUsedGb: 21.6,
  dataRemainingGb: 18.4,
  billingCycleEnds: "2026-09-20",
} as const;

export const CANNED_TELCO_BILL = {
  amount: 24990,
  currency: "CLP",
  dueDate: "2026-09-15",
  status: "pending",
} as const;

export const CANNED_TELCO_SERVICE = {
  service: "mobile-data",
  status: "operational",
  incident: null,
} as const;

export type TelcoUsage = {
  phoneNumber: string;
  dataPlanGb: number;
  dataUsedGb: number;
  dataRemainingGb: number;
  billingCycleEnds: string;
};

export type TelcoBill = {
  amount: number;
  currency: string;
  dueDate: string;
  status: string;
};

export type TelcoServiceStatus = {
  service: string;
  status: string;
  incident: string | null;
};

export type TelcoDirectory = {
  getCustomerUsage(): TelcoUsage;
  getBillStatus(): TelcoBill;
  checkServiceStatus(): TelcoServiceStatus;
};
