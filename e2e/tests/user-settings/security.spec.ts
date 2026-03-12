import { test, expect } from "@playwright/test";

test.describe("User Security Settings", () => {
  test("POST /api/auth/change-password succeeds with same password", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/change-password", {
      data: {
        currentPassword: "Test1234!pass",
        newPassword: "Test1234!pass",
      },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("POST /api/auth/change-password fails with wrong current password", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/change-password", {
      data: {
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
      },
    });
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /api/auth/account fails with wrong password", async ({
    request,
  }) => {
    const response = await request.delete("/api/auth/account", {
      data: {
        password: "WrongPassword123!",
      },
    });
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
