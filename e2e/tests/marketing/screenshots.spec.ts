/**
 * Marketing Screenshot Generator
 *
 * Generates screenshots for the landing page using Playwright.
 * Seeds demo data via API, navigates key pages, captures at 1440×900.
 *
 * Usage (from e2e/):
 *   npm run screenshots
 */

import { test } from "@playwright/test";
import path from "path";
import heroElements from "../../fixtures/demo-elements.json";
import demoDiagrams from "../../fixtures/demo-diagrams.json";
import { ADMIN_USER, PRIMARY_AUTH_FILE, loginApi } from "../../fixtures/test";
import { createDiagram, createFolder, createWorkspace } from "../../fixtures/api";

const VIEWPORT = { width: 1440, height: 900 };
const OUTPUT_DIR = path.resolve(__dirname, "../../../apps/frontend/public/screenshots");

/** Disable animations, tooltips, blinking cursor */
async function stabilizePage(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      [class*="blur"] { display: none !important; }
    `,
  });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.waitForTimeout(500);
}

/** Hide Excalidraw UI noise for clean board screenshots */
async function hideExcalidrawNoise(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      .HintViewer, .excalidraw-tooltip, [class*="HintViewer"],
      [class*="welcome-screen"], .Toast { display: none !important; }
    `,
  });
}

/** Wait for board canvas to be ready */
async function waitForBoard(page: import("@playwright/test").Page) {
  await page.waitForSelector(".excalidraw canvas", { timeout: 30_000 });
  await page.waitForTimeout(3000);
}

/** Inject fake collaboration cursors */
function addFakeCursors(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const cursors = [
      { name: "Maya C.", color: "#e74c3c", x: 520, y: 340 },
      { name: "Rafa A.", color: "#3498db", x: 820, y: 460 },
    ];
    cursors.forEach((c) => {
      const el = document.createElement("div");
      el.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="${c.color}">
          <path d="M0 0 L0 16 L4 12 L8 16 L10 14 L6 10 L12 10 Z"/>
        </svg>
        <span style="background:${c.color};color:white;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:4px;font-family:system-ui;white-space:nowrap">${c.name}</span>
      `;
      el.style.cssText = `position:fixed;left:${c.x}px;top:${c.y}px;z-index:9999;pointer-events:none;display:flex;align-items:center`;
      document.body.appendChild(el);
    });
  });
}

/** Hide the "Saved/Unsaved" badge */
async function hideSaveBadge(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      const text = el.textContent?.trim() ?? "";
      if ((text === "Unsaved" || text.startsWith("Saved")) && el.children.length === 0) {
        const badge = el.closest("div[class*='rounded']") ?? el;
        (badge as HTMLElement).style.display = "none";
      }
    });
  });
}

test.describe("Marketing Screenshots", () => {
  test.setTimeout(180_000);
  test.describe.configure({ mode: "serial" });

  let mainDiagramId: string;
  const allDiagramIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    const workspace = await createWorkspace(request, "Design Team");

    const main = await createDiagram(request, {
      title: "System Architecture",
      elements: heroElements.elements,
      workspaceId: workspace.id,
    });
    mainDiagramId = main.id;
    allDiagramIds.push(main.id);

    for (const diag of demoDiagrams.diagrams) {
      const created = await createDiagram(request, {
        title: diag.title,
        elements: diag.elements,
        workspaceId: workspace.id,
      });
      allDiagramIds.push(created.id);
    }

    for (const name of ["Backend", "Product"]) {
      await createFolder(request, workspace.id, name);
    }

    const comments = [
      { elementId: "api-box", body: "Should we add a load balancer in front of the API Gateway?" },
      { elementId: "cache-box", body: "Redis cache TTL should be configurable per endpoint" },
      {
        elementId: "ws-box",
        body: "Looks great! The WebSocket connection should be bidirectional",
      },
    ];
    for (const c of comments) {
      const res = await request.post(`/api/diagrams/${mainDiagramId}/comments`, { data: c });
      if (!res.ok()) throw new Error(`create comment failed with ${res.status()}`);
    }

    for (const name of ["Auth Flow", "DB Schema", "Deploy Pipeline"]) {
      const res = await request.post(`/api/diagrams/${mainDiagramId}/scenes`, {
        data: { title: name },
      });
      if (!res.ok()) throw new Error(`create scene failed with ${res.status()}`);
    }
  });

  // ─── Warm-up: generate thumbnails ───
  test("warm-up — generate thumbnails", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORT);
    for (const id of allDiagramIds) {
      await page.goto(`/board/${id}`);
      await waitForBoard(page);
      await page.mouse.click(400, 400);
      await page.waitForTimeout(1500);
    }
  });

  // ─── 1. Hero Editor ───
  test("hero-editor", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    await page.mouse.click(700, 450);
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+Shift+Digit1");
    await page.waitForTimeout(1000);

    await hideExcalidrawNoise(page);
    await hideSaveBadge(page);
    await stabilizePage(page);
    await addFakeCursors(page);
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "hero-editor.png") });
  });

  // ─── 2. Collaboration (comments + cursors) ───
  test("screenshot-collab", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    await page.mouse.click(700, 450);
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+Shift+Digit1");
    await page.waitForTimeout(2000);

    const shareBtn = page.locator('button[title="Share & Collaborate"]');
    await shareBtn.waitFor({ state: "visible", timeout: 8_000 });
    await shareBtn.click();
    await page.waitForTimeout(1500);

    await hideExcalidrawNoise(page);
    await hideSaveBadge(page);
    await stabilizePage(page);
    await addFakeCursors(page);
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-collab.png") });
  });

  // ─── 3. Code Import ───
  test("screenshot-code-import", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    const codeBtn = page.locator('button[title="Import from Code"]');
    await codeBtn.waitFor({ state: "visible", timeout: 8_000 });
    await codeBtn.click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox");
    await textarea.fill(
      `graph TD
    A[User Request] --> B{Auth Check}
    B -->|Valid| C[API Gateway]
    B -->|Invalid| D[Login Page]
    C --> E[Service Layer]
    E --> F[(Database)]
    E --> G[Cache]`,
    );
    await page.waitForTimeout(2000);
    await hideSaveBadge(page);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-code-import.png") });
  });

  // ─── 4. Share Panel ───
  test("screenshot-share", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    const shareBtn = page.locator('button[title="Share & Collaborate"]');
    await shareBtn.waitFor({ state: "visible", timeout: 8_000 });
    await shareBtn.click();
    await page.waitForTimeout(1000);
    await hideSaveBadge(page);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-share.png") });
  });

  // ─── 5. Export Panel ───
  test("screenshot-export", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    const exportBtn = page.locator('button[title="Export"]');
    await exportBtn.waitFor({ state: "visible", timeout: 8_000 });
    await exportBtn.click();
    await page.waitForTimeout(1000);
    await hideSaveBadge(page);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-export.png") });
  });

  // ─── 6. Scenes (multi-scene tab bar) ───
  test("screenshot-scenes", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    await page.mouse.click(700, 450);
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+Shift+Digit1");
    await page.waitForTimeout(1000);

    await hideExcalidrawNoise(page);
    await hideSaveBadge(page);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-scenes.png") });
  });

  // ─── 7. Dashboard ───
  test("screenshot-dashboard", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-dashboard.png") });
  });

  // ─── 8. Templates ───
  test("screenshot-templates", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: PRIMARY_AUTH_FILE, viewport: VIEWPORT });
    const page = await ctx.newPage();

    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const personalLink = page.locator("nav a, nav button").filter({ hasText: "Personal" }).first();
    await personalLink.click();
    await page.waitForTimeout(2000);

    const newBtn = page
      .locator("button")
      .filter({ hasText: /new diagram/i })
      .first();
    await newBtn.waitFor({ state: "visible", timeout: 8_000 });
    await newBtn.click();
    await page.waitForTimeout(1500);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-templates.png") });
    await ctx.close();
  });

  // ─── 9. Workspace Settings ───
  test("screenshot-workspace-settings", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: PRIMARY_AUTH_FILE, viewport: VIEWPORT });
    const page = await ctx.newPage();

    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const group = page.locator("nav .group").filter({ hasText: "Design Team" }).first();
    await group.hover();
    await group.locator('button[title="Workspace settings"]').click();
    await page.waitForTimeout(1500);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-workspace-settings.png") });
    await ctx.close();
  });

  // ─── 10. Admin Overview ───
  test("screenshot-admin", async ({ browser }) => {
    const admin = await loginApi(ADMIN_USER.email, ADMIN_USER.password);
    const adminContext = await browser.newContext({
      storageState: await admin.storageState(),
      viewport: VIEWPORT,
    });
    await admin.dispose();
    const page = await adminContext.newPage();

    await page.goto("/settings?tab=admin-overview");
    await page.getByText("Admin Dashboard").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await stabilizePage(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-admin.png") });
    await adminContext.close();
  });
});
