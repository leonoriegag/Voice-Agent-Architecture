import {
  CANNED_TELCO_BILL,
  CANNED_TELCO_SERVICE,
  CANNED_TELCO_USAGE,
  type TelcoBill,
  type TelcoDirectory,
  type TelcoServiceStatus,
  type TelcoUsage,
} from "../../domain/telco-tools.js";

export const cannedTelcoDirectory: TelcoDirectory = {
  getCustomerUsage(): TelcoUsage {
    return { ...CANNED_TELCO_USAGE };
  },
  getBillStatus(): TelcoBill {
    return { ...CANNED_TELCO_BILL };
  },
  checkServiceStatus(): TelcoServiceStatus {
    return { ...CANNED_TELCO_SERVICE };
  },
};

export function failingTelcoDirectory(message = "simulated WOM directory failure"): TelcoDirectory {
  const fail = (): never => {
    throw new Error(message);
  };
  return {
    getCustomerUsage: fail,
    getBillStatus: fail,
    checkServiceStatus: fail,
  };
}
