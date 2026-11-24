import type { ErrorRequestHandler, RequestHandler, Response } from "express";

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
    sendError(res, err.status, err.code, err.message);
    return;
  }
  // express.json() rejects bad bodies with a 4xx status, e.g. 400 for broken JSON.
  if (isBodyParserError(err)) {
    if (err.type === "entity.parse.failed") {
      sendError(res, 400, "INVALID_JSON", `Request body is not valid JSON: ${err.message}`);
    } else {
      sendError(res, err.status, "INVALID_REQUEST", err.message);
    }
    return;
  }
  console.error(err);
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong");
};

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function isBodyParserError(err: unknown): err is Error & { status: number; type: string } {
  return (
    err instanceof Error &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status >= 400 &&
    err.status < 500 &&
    "type" in err &&
    typeof err.type === "string"
  );
}
