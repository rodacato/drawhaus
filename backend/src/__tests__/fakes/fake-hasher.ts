import type { Hasher } from "../../domain/ports/hasher";

export class FakeHasher implements Hasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async verify(password: string, hashed: string): Promise<boolean> {
    return hashed === `hashed_${password}`;
  }
}
