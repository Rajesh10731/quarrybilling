import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const DEV_JWT_SECRET = "quarry_billing_super_secret_jwt_key_2026";

/** Key that signs login tokens. Production must set its own JWT_SECRET; the built-in one is for local use only. */
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not set on the server");
  }
  return DEV_JWT_SECRET;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, jwtSecret()) as UserSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
