import * as crypto from 'crypto';

// Store the current access token
let accessToken: string | null = null;
let tokenGeneratedAt: Date | null = null;

/**
 * Generate a new random access token
 * Token is 32 bytes (64 hex characters) - cryptographically secure
 */
export function generateToken(): string {
  accessToken = crypto.randomBytes(32).toString('hex');
  tokenGeneratedAt = new Date();
  console.log('[WebAuth] New access token generated');
  return accessToken;
}

/**
 * Get the current access token
 * Generates one if it doesn't exist
 */
export function getToken(): string {
  if (!accessToken) {
    return generateToken();
  }
  return accessToken;
}

/**
 * Validate a token against the current access token
 */
export function validateToken(token: string): boolean {
  console.log('[WebAuth] Validating token...');
  console.log('[WebAuth] Token received length:', token?.length || 0);
  console.log('[WebAuth] Expected token length:', accessToken?.length || 0);

  if (!accessToken || !token) {
    console.log('[WebAuth] Validation failed: missing token');
    return false;
  }

  // Check length first (timingSafeEqual requires same length)
  if (token.length !== accessToken.length) {
    console.log('[WebAuth] Validation failed: length mismatch');
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(accessToken)
    );
    console.log('[WebAuth] Validation result:', isValid);
    return isValid;
  } catch (error) {
    console.log('[WebAuth] Validation error:', error);
    return false;
  }
}

/**
 * Get token info (for display in UI)
 */
export function getTokenInfo(): { token: string; generatedAt: Date | null } {
  return {
    token: getToken(),
    generatedAt: tokenGeneratedAt,
  };
}

/**
 * Regenerate the access token (invalidates old token)
 */
export function regenerateToken(): string {
  console.log('[WebAuth] Regenerating access token (old token invalidated)');
  return generateToken();
}
