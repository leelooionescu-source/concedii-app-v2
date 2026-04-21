const AUTH_USER = "expros";
const AUTH_PASS = "berna7#";
const AUTH_TOKEN = "concedii-pa-2026-internal-d8f3a91b6e7c4a25";
export const AUTH_COOKIE = "concedii_auth";

export function checkCredentials(user: string, pass: string): boolean {
  return user === AUTH_USER && pass === AUTH_PASS;
}

export function makeToken(): string {
  return AUTH_TOKEN;
}

export function isValidToken(token: string | undefined): boolean {
  return token === AUTH_TOKEN;
}
