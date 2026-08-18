import { handleExchangeRates } from "./_lib/extractCore.js";
import { createGetHandler } from "./_lib/vercelHandler.js";

export default createGetHandler(handleExchangeRates);

export const config = {
  maxDuration: 15
};
