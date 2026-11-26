import { describe, expect, it } from "vitest";
import { randomToken, s256, safeNext, sha256hex, validVerifier } from "./oauth";

describe("OAuth do MCP", () => {
  it("PKCE S256 = base64url(sha256(verifier)) (valor conferido com Python hashlib)", () => {
    expect(s256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWjOEjXk")).toBe("VYFANLqdx_HDV6BqEhluZJ63rtrIPROSSFdB3P6G83I");
    expect(validVerifier("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWjOEjXk")).toBe(true);
    expect(validVerifier("curto")).toBe(false);
  });
  it("tokens aleatórios e hash estável", () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("volta só para caminho interno", () => {
    expect(safeNext("/oauth/authorize?client_id=x&state=y")).toBe("/oauth/authorize?client_id=x&state=y");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});

describe("volta após login", () => {
  it("aceita parâmetros do OAuth e recusa saída para outro site", () => {
    expect(safeNext("/oauth/authorize?redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&state=a+b:c")).toBe("/oauth/authorize?redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&state=a+b:c");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("/a b")).toBe("/");
  });
});
