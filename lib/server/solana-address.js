import "server-only";
import bs58 from "bs58";

export function isSolanaAddress(address) {
  if (typeof address !== "string" || address.length < 32 || address.length > 44) {
    return false;
  }

  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}
