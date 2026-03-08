import { hash, compare } from "bcryptjs";
import type { Hasher } from "../../domain/ports/hasher";

export class BcryptHasher implements Hasher {
  async hash(password: string): Promise<string> {
    return hash(password, 12);
  }

  async verify(password: string, hashed: string): Promise<boolean> {
    return compare(password, hashed);
  }
}
