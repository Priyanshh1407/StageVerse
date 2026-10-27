// Typed HTTP errors. Throw these from route code and helpers;
// apiError() in lib/api.js turns them into the right status code.

export class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export class ValidationError extends HttpError {
    constructor(message = 'Invalid request', details) { super(400, message, details); }
}

export class AuthError extends HttpError {
    constructor(message = 'Unauthorized') { super(401, message); }
}

export class ForbiddenError extends HttpError {
    constructor(message = 'Forbidden') { super(403, message); }
}

export class NotFoundError extends HttpError {
    constructor(message = 'Not found') { super(404, message); }
}

export class ConflictError extends HttpError {
    constructor(message = 'Conflict') { super(409, message); }
}

export class RateLimitError extends HttpError {
    constructor(message = 'Too many requests', retryAfterSeconds) {
        super(429, message);
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
