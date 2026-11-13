import { HTTPException } from "hono/http-exception";
import type { ErrorHandler, NotFoundHandler } from "hono";

export const onError: ErrorHandler = (error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error("Unhandled API error", error);

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
};

export const onNotFound: NotFoundHandler = (c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found",
      },
    },
    404,
  );
