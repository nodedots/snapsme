import { handleExtractReceipt } from "./_lib/extractCore.js";
import { createPostHandler } from "./_lib/vercelHandler.js";

export default createPostHandler(handleExtractReceipt);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb"
    }
  },
  maxDuration: 30
};
