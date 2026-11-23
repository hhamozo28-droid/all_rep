/**
 * Limits shared by the admin UI (client) and the server routes.
 *
 * Verified empirically against this platform: requests to serverless
 * functions above ~4.5 MB are rejected by the platform (413
 * FUNCTION_PAYLOAD_TOO_LARGE) before the route code runs, while ~4.2 MB
 * works end-to-end (Vercel + GitHub). So:
 *  - up to MAX_DIRECT_UPLOAD → direct upload in one request;
 *  - above it → chunked upload: small staging parts in Neon, then
 *    `POST /api/admin/guides/upload/complete` reassembles and uploads to
 *    GitHub with a server-side call (no HTTP size limit).
 */
export const MAX_DIRECT_UPLOAD = 4_200_000;
export const CHUNK_SIZE = 3_900_000;
export const MAX_GUIDE_FILE_BYTES = 15 * 1024 * 1024;
