import { handleHealth } from "./_lib/extractCore.js";
import { createGetHandler } from "./_lib/vercelHandler.js";

export default createGetHandler(async () => handleHealth());

export const config = {
  maxDuration: 10
};
