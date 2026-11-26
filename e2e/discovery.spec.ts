import { expect, test } from "@playwright/test";

test.describe("Descoberta e varredura", () => {
  test("cadastro ? criar monitoramento ? disparar varredura", async ({ page }) => {
    const email = `e2e-scan-${Date.now()}@example.com`;
    const password = "e2e-pass-123";

    await page.goto("/register");
    await page.locator(String.raw`input[name="name"]`).fill("E2E Scan");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/$/);

    const create = await page.request.post("/api/monitored-products", { data: { name: "Produto E2E Teste", intervalMinutes: 1440 } });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.product.id).toBeTruthy();

    const scan = await page.request.post("/api/scan", { data: { monitoredId: created.product.id } });
    expect(scan.status()).toBe(202);

    const list = await page.request.get("/api/monitored-products");
    const body = await list.json();
    expect(body.products.length).toBeGreaterThan(0);
  });
});

