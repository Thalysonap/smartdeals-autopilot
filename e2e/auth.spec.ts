import { expect, test } from "@playwright/test";

test.describe("Autentica��o", () => {
  test("cadastro libera o dashboard", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "e2e-pass-123";
    await page.goto("/register");
    await page.locator(String.raw`input[name="name"]`).fill("E2E User");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /seu agente de ofertas/i })).toBeVisible();
  });

  test("logout e login retornam ao dashboard", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "e2e-pass-123";
    await page.goto("/register");
    await page.locator(String.raw`input[name="name"]`).fill("E2E User");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: /sair/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/login");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /seu agente de ofertas/i })).toBeVisible();
  });

  test("recupera��o de senha em modo local devolve token e reset permite login", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "e2e-pass-123";

    const reg = await page.request.post("/api/auth/register", { data: { name: "E2E Reset", email, password } });
    expect(reg.status()).toBe(200);

    await page.goto("/forgot-password");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.getByRole("button", { name: /continuar/i }).click();
    await expect(page.locator("text=Token de recupera")).toBeVisible();

    const reset = await page.evaluate(async (mail: string) => {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: mail }) });
      const data = await res.json();
      return data.devToken as string;
    }, email);
    expect(reset).toBeTruthy();

    await page.goto("/reset-password");
    await page.locator(String.raw`input[name="token"]`).fill(reset);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /salvar senha/i }).click();

    await page.goto("/login");
    await page.locator(String.raw`input[name="email"]`).fill(email);
    await page.locator(String.raw`input[name="password"]`).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /seu agente de ofertas/i })).toBeVisible();
  });
});

