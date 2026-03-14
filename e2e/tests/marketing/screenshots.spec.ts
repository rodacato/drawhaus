/**
 * Marketing Screenshot Generator
 *
 * Generates screenshots for the landing page using Playwright.
 * Seeds demo data via API, navigates key pages, captures at 1440×900.
 *
 * Usage (from e2e/):
 *   npx playwright test tests/marketing/screenshots.spec.ts
 */

import { test } from "@playwright/test";
import path from "path";
import heroElements from "../../fixtures/demo-elements.json";
import demoDiagrams from "../../fixtures/demo-diagrams.json";

const VIEWPORT = { width: 1440, height: 900 };
const OUTPUT_DIR = path.resolve(__dirname, "../../../frontend/public/screenshots");

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
  // Wait for Excalidraw canvas to render
  await page.waitForSelector(".excalidraw canvas, canvas", { timeout: 15_000 }).catch(() => {});
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

/** Hide comment element references like "ON ELEMENT #API-" */
async function hideCommentElementRefs(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      if (el.textContent?.match(/ON ELEMENT #[A-Z]/i) && el.children.length <= 2) {
        (el as HTMLElement).style.display = "none";
      }
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
  let workspaceId: string;

  test.beforeAll(async ({ request }) => {
    // Get or create a non-personal workspace
    const wsRes = await request.get("/api/workspaces");
    if (wsRes.ok()) {
      const body = await wsRes.json();
      const workspaces = body.workspaces ?? body;
      const ws = workspaces.find((w: any) => !w.isPersonal);
      if (ws) {
        workspaceId = ws.id;
      } else {
        // Create a team workspace for screenshots
        const createRes = await request.post("/api/workspaces", {
          data: { name: "Design Team" },
        });
        if (createRes.ok()) {
          const created = await createRes.json();
          workspaceId = created.workspace?.id ?? created.id;
        } else {
          // Fallback to first workspace
          if (workspaces[0]) workspaceId = workspaces[0].id;
        }
      }
    }

    // Create main diagram with rich elements
    const mainRes = await request.post("/api/diagrams", {
      data: {
        title: "System Architecture",
        elements: heroElements.elements,
        appState: heroElements.appState,
        workspaceId: workspaceId || undefined,
      },
    });
    if (mainRes.ok()) {
      const body = await mainRes.json();
      mainDiagramId = body.diagram?.id ?? body.id;
      allDiagramIds.push(mainDiagramId);
    }

    // Create additional diagrams
    for (const diag of demoDiagrams.diagrams) {
      const res = await request.post("/api/diagrams", {
        data: {
          title: diag.title,
          elements: diag.elements,
          appState: { viewBackgroundColor: "#ffffff", gridSize: null, zoom: { value: 1 } },
          workspaceId: workspaceId || undefined,
        },
      });
      if (res.ok()) {
        const body = await res.json();
        allDiagramIds.push(body.diagram?.id ?? body.id);
      }
    }

    // Create folders
    if (workspaceId) {
      for (const name of ["Backend", "Product"]) {
        await request.post("/api/folders", { data: { name, workspaceId } }).catch(() => {});
      }
    }

    // Create comments on main diagram
    if (mainDiagramId) {
      const comments = [
        { elementId: "api-box", body: "Should we add a load balancer in front of the API Gateway?" },
        { elementId: "cache-box", body: "Redis cache TTL should be configurable per endpoint" },
        { elementId: "ws-box", body: "Looks great! The WebSocket connection should be bidirectional" },
      ];
      for (const c of comments) {
        await request.post(`/api/diagrams/${mainDiagramId}/comments`, {
          data: { elementId: c.elementId, body: c.body },
        }).catch(() => {});
      }
    }

    // Create extra scenes
    if (mainDiagramId) {
      for (const name of ["Auth Flow", "DB Schema", "Deploy Pipeline"]) {
        await request.post(`/api/diagrams/${mainDiagramId}/scenes`, {
          data: { title: name },
        }).catch(() => {});
      }
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
    test.skip(!mainDiagramId, "No diagram created");
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    // Zoom to fit
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
    test.skip(!mainDiagramId, "No diagram created");
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/board/${mainDiagramId}`);
    await waitForBoard(page);

    // Zoom to fit so diagram is centered
    await page.mouse.click(700, 450);
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+Shift+Digit1");
    await page.waitForTimeout(2000);

    // Open share panel to show collaboration UI
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
    test.skip(!mainDiagramId, "No diagram created");
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
    E --> G[Cache]`
    );
    await page.waitForTimeout(2000);
    await hideSaveBadge(page);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-code-import.png") });
  });

  // ─── 4. Share Panel ───
  test("screenshot-share", async ({ page }) => {
    test.skip(!mainDiagramId, "No diagram created");
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
    test.skip(!mainDiagramId, "No diagram created");
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
    test.skip(!mainDiagramId, "No diagram created");
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
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-dashboard.png") });
  });

  // ─── 8. Templates ───
  test("screenshot-templates", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: "tests/.auth/user.json",
      viewport: VIEWPORT,
    });
    const page = await ctx.newPage();

    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Navigate to workspace to get "New Diagram" button
    const personalLink = page.locator("nav a, nav button").filter({ hasText: "Personal" }).first();
    if (await personalLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await personalLink.click();
      await page.waitForTimeout(2000);
    }

    const newBtn = page.locator("button").filter({ hasText: /new diagram/i }).first();
    await newBtn.waitFor({ state: "visible", timeout: 8_000 });
    await newBtn.click();
    await page.waitForTimeout(1500);
    await stabilizePage(page);

    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-templates.png") });
    await ctx.close();
  });

  // ─── 9. Workspace Settings ───
  test("screenshot-workspace-settings", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: "tests/.auth/user.json",
      viewport: VIEWPORT,
    });
    const page = await ctx.newPage();

    await page.goto("/dashboard");
    await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Hover over non-personal workspace to reveal gear icon
    const wsGroup = page.locator("nav .group").filter({ hasNotText: /personal/i });
    const wsCount = await wsGroup.count();

    let opened = false;
    for (let i = 0; i < wsCount && !opened; i++) {
      const group = wsGroup.nth(i);
      if (await group.isVisible().catch(() => false)) {
        await group.hover();
        await page.waitForTimeout(500);
        const gear = group.locator('button[title="Workspace settings"]');
        if (await gear.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await gear.click();
          await page.waitForTimeout(1500);
          opened = true;
        }
      }
    }

    if (opened) {
      await stabilizePage(page);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-workspace-settings.png") });
    await ctx.close();
  });

  // ─── 10. Admin Overview ───
  test("screenshot-admin", async ({ browser }) => {
    const adminContext = await browser.newContext({
      storageState: "tests/.auth/admin.json",
      viewport: VIEWPORT,
    });
    const page = await adminContext.newPage();

    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    await page.goto("/settings?tab=admin-overview");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const heading = page.locator("text=Admin Dashboard");
    if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await stabilizePage(page);
      await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot-admin.png") });
    }
    await adminContext.close();
  });
});
