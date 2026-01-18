/**
 * Extract error message from unknown error type
 * Used internally for logging - includes full details
 */
export const getErrorMessage = (error: unknown, maxLength: number = 500): string => {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String((error as { message: unknown }).message);
  } else {
    message = "An unknown error occurred";
  }

  if (message.length > maxLength) {
    return message.substring(0, maxLength) + '...';
  }

  return message;
};

/**
 * Patterns that indicate a database/internal error that should be sanitized
 */
const SENSITIVE_PATTERNS = [
  /failed query:/i,
  /insert into/i,
  /select .* from/i,
  /update .* set/i,
  /delete from/i,
  /params:/i,
  /postgresql/i,
  /pg_/i,
  /connection refused/i,
  /econnrefused/i,
];

/**
 * Get a user-safe error message that doesn't expose internal details
 * Use this for API responses to clients
 */
export const getSafeErrorMessage = (error: unknown): string => {
  const message = getErrorMessage(error);

  // Check if the message contains sensitive information
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return "An internal error occurred. Please try again later.";
    }
  }

  return message;
};
