import { describe, expect, it } from "vitest";
import { firstLineOfInput } from "./secretInput";

describe("firstLineOfInput", () => {
  it("takes the first line, whatever the line ending", () => {
    expect(firstLineOfInput("pass-word\n")).toBe("pass-word");
    expect(firstLineOfInput("pass-word\r\nignored")).toBe("pass-word");
    expect(firstLineOfInput("pass-word\r")).toBe("pass-word");
    expect(firstLineOfInput("pass-word")).toBe("pass-word");
  });

  it("drops the byte-order mark Windows PowerShell puts in front of piped text", () => {
    expect(firstLineOfInput(String.fromCharCode(0xfeff) + "Str0ng-Real-Pass!\r\n")).toBe("Str0ng-Real-Pass!");
  });
});
