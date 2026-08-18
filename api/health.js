import { handleHealth } from "./_lib/extractCore.js";
import { createGetHandler } from "./_lib/vercelHandler.js";

export default createGetHandler(async (query) => handleHealth(query));

export const config = {
  maxDuration: 60
};
