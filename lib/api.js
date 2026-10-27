import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { HttpError, ValidationError } from '@/lib/errors';

/**
 * Convert any thrown error into a JSON response.
 * Known HttpErrors keep their status and message; anything else is logged
 * with a request id and returned as a generic 500 (no internals leak).
 * Responses carry both `error` and `message` because existing clients read either.
 */
export function apiError(error, context = 'API') {
    if (error instanceof HttpError) {
        const headers = error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined;
        return NextResponse.json(
            { error: error.message, message: error.message, ...(error.details && { details: error.details }) },
            { status: error.status, headers },
        );
    }

    // Malformed ids and schema violations from Mongoose are client errors, not server errors
    if (error?.name === 'CastError') {
        return NextResponse.json({ error: 'Invalid id', message: 'Invalid id' }, { status: 400 });
    }
    if (error?.name === 'ValidationError') {
        return NextResponse.json({ error: 'Invalid data', message: 'Invalid data' }, { status: 400 });
    }

    const requestId = randomUUID();
    console.error(`[${context}] ${requestId}`, error);
    return NextResponse.json(
        { error: 'Internal Server Error', message: 'Internal Server Error', requestId },
        { status: 500 },
    );
}

/** Wrap a route handler so thrown errors become proper responses. */
export function withApi(handler, context) {
    return async (...args) => {
        try {
            return await handler(...args);
        } catch (error) {
            return apiError(error, context);
        }
    };
}

/** Parse a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req) {
    try {
        return await req.json();
    } catch {
        throw new ValidationError('Request body must be valid JSON');
    }
}
