import { describe, expect, it } from "vitest";
import { parseOrigins } from "./env";

describe("parseOrigins", () => {
  it("defaults to both localhost and 127.0.0.1, so either address works out of the box", () => {
    expect(parseOrigins(undefined)).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
  });

  it("splits a comma list, trims spaces and trailing slashes", () => {
    expect(parseOrigins(" https://a.example/ , https://b.example ")).toEqual(["https://a.example", "https://b.example"]);
  });
});
