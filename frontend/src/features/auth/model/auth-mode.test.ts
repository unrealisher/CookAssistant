import { describe, expect, it } from "vitest";

import { shouldShowLoginAfterSetupConflict } from "./auth-mode";

describe("shouldShowLoginAfterSetupConflict", () => {
  it("switches a setup form to login after the owner was created elsewhere", () => {
    expect(shouldShowLoginAfterSetupConflict(true, 409)).toBe(true);
  });

  it("keeps setup mode for other failures and login mode for conflicts", () => {
    expect(shouldShowLoginAfterSetupConflict(true, 401)).toBe(false);
    expect(shouldShowLoginAfterSetupConflict(false, 409)).toBe(false);
  });
});
