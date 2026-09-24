import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/pool", () => ({ queryOne: vi.fn() }));

import { queryOne } from "../db/pool";
import { login } from "./authService";

afterEach(() => vi.restoreAllMocks());

describe("login", () => {
  it("still runs a bcrypt comparison when the username does not exist (no timing oracle)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const compare = vi.spyOn(bcrypt, "compare");
    expect(await login("nobody", "whatever")).toBeNull();
    expect(compare).toHaveBeenCalledOnce();
  });

  it("returns a token for the right password and null for the wrong one", async () => {
    const hash = bcrypt.hashSync("correct-horse", 4);
    const row = { id: "1", username: "u", password: hash, role: "BOARD" as const };
    vi.mocked(queryOne).mockResolvedValue(row);
    expect(await login("u", "correct-horse")).toEqual(expect.any(String));
    expect(await login("u", "wrong")).toBeNull();
  });
});
