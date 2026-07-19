/**
 * Shared-secret check for server-to-Convex calls. The comparison touches every
 * byte of both values so its timing does not narrow down the secret.
 */
export function verifySecret(secret: string, errorMessage: string) {
  const expected = process.env.FEEDBACK_API_SECRET;
  if (!expected || !timingSafeEqual(secret, expected)) throw new Error(errorMessage);
}

function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}
