import { HTTPException } from "hono/http-exception";

export const cents = (amount: number) => Math.round(amount * 100);

export function fail(status: 400 | 404 | 409, message: string): never {
  throw new HTTPException(status, {
    message,
    res: Response.json({
      error: {
        code: status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BAD_REQUEST",
        message,
      },
    }, { status }),
  });
}

export function pageMeta(page: number, pageSize: number, totalCount: number) {
  return { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
