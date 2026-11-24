import type { ErrorRequestHandler, RequestHandler } from "express";

/** An error that maps straight to an HTTP response. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

/** Unknown routes get a JSON 404 instead of Express's HTML page. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", "Route not found"));
};

/** Every error leaves the API in one shape: { error: { code, message } }. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
};
