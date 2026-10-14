import { describe, test, expect } from "vitest";
import {
  validateSiteSettings,
  validateWholeNumber,
  validateCron,
} from "../lib/site-settings-validation";

const valid = {
  maxWorkspacesPerUser: "5",
  maxMembersPerWorkspace: "5",
  backupEnabled: true,
  backupCron: "0 3 * * *",
  backupRetentionDays: "7",
};

describe("site settings validation", () => {
  test("accepts the defaults", () => {
    expect(validateSiteSettings(valid)).toEqual({});
  });

  test("an empty number is an error, not a silent 0", () => {
    expect(validateWholeNumber("maxWorkspacesPerUser", "")).toMatch(/whole number from 1 to 50/);
    expect(validateWholeNumber("maxWorkspacesPerUser", "  ")).not.toBeNull();
  });

  test("rejects fractions, text and values outside the API range", () => {
    for (const raw of ["0", "51", "2.5", "abc", "-1"]) {
      expect(validateWholeNumber("maxWorkspacesPerUser", raw)).not.toBeNull();
    }
    expect(validateWholeNumber("backupRetentionDays", "365")).toBeNull();
    expect(validateWholeNumber("backupRetentionDays", "366")).not.toBeNull();
    expect(validateWholeNumber("maxMembersPerWorkspace", "100")).toBeNull();
  });

  test("cron needs five fields", () => {
    expect(validateCron("0 3 * * *")).toBeNull();
    expect(validateCron("*/15 * * * *")).toBeNull();
    expect(validateCron("0 3 * *")).not.toBeNull();
    expect(validateCron("")).not.toBeNull();
  });

  test("backup fields are not validated while backups are off", () => {
    expect(
      validateSiteSettings({
        ...valid,
        backupEnabled: false,
        backupCron: "",
        backupRetentionDays: "",
      }),
    ).toEqual({});
    expect(
      Object.keys(validateSiteSettings({ ...valid, backupCron: "x", backupRetentionDays: "0" })),
    ).toEqual(["backupRetentionDays", "backupCron"]);
  });
});
