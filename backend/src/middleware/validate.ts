import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { ZodType } from "zod";

const invalidRequest = (
  result: { error?: { issues?: unknown[] } },
  c: Context,
) =>
  c.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request is invalid",
        issues: result.error?.issues ?? [],
      },
    },
    400,
  );

export const validateJson = <Schema extends ZodType>(schema: Schema) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return invalidRequest(result, c);
    }
  });

export const validateQuery = <Schema extends ZodType>(schema: Schema) =>
  zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return invalidRequest(result, c);
    }
  });

export const validateParam = <Schema extends ZodType>(schema: Schema) =>
  zValidator("param", schema, (result, c) => {
    if (!result.success) {
      return invalidRequest(result, c);
    }
  });
