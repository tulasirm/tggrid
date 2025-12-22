/**
 * Two-Factor Authentication (2FA) with TOTP
 * Using speakeasy for TOTP generation and validation
 */

import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Generate a new 2FA secret and QR code for user
 */
export async function generate2FASecret(
  userEmail: string
): Promise<TwoFactorSecret> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `UFBrowsers (${userEmail})`,
    issuer: "UFBrowsers",
    length: 32,
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Generate backup codes (one-time use codes)
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substr(2, 8).toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP token
 */
export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before and after
  });
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(
  usedCodes: string[],
  availableCodes: string[],
  code: string
): { valid: boolean; updatedUsedCodes?: string[] } {
  const upperCode = code.toUpperCase();

  // Check if code was already used
  if (usedCodes.includes(upperCode)) {
    return { valid: false };
  }

  // Check if code is valid
  if (!availableCodes.includes(upperCode)) {
    return { valid: false };
  }

  // Mark code as used
  return {
    valid: true,
    updatedUsedCodes: [...usedCodes, upperCode],
  };
}

/**
 * Generate new backup codes (when user runs out or requests new ones)
 */
export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).substr(2, 8).toUpperCase()
  );
}
