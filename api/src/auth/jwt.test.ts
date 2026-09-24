import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../config/env";
import { signToken, verifyToken } from "./jwt";

const claims = { sub: "1", username: "board", role: "BOARD" as const };

describe("jwt", () => {
  it("round-trips a token it signed", () => {
    expect(verifyToken(signToken(claims))).toMatchObject(claims);
  });

  it("rejects a token signed with a different HMAC algorithm", () => {
    const hs512 = jwt.sign(claims, env.jwtSecret, { algorithm: "HS512" });
    expect(() => verifyToken(hs512)).toThrow();
  });

  it("rejects an unsigned (alg=none) token", () => {
    const none = jwt.sign(claims, "", { algorithm: "none" });
    expect(() => verifyToken(none)).toThrow();
  });

  it("rejects a token signed with the wrong secret", () => {
    const forged = jwt.sign(claims, "not-the-secret", { algorithm: "HS256" });
    expect(() => verifyToken(forged)).toThrow();
  });
});
