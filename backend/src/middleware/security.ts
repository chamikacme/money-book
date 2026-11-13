import { secureHeaders } from "hono/secure-headers";

export const securityHeaders = secureHeaders({
  crossOriginResourcePolicy: "same-origin",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
});
