import { describe, expect, it } from "vitest";
import { ADMIN_HOME, BARE_ADMIN_ROUTES, isBareAdminRoute, safeAdminNext } from "./admin-routes";

describe("isBareAdminRoute", () => {
  it("matches the four auth routes exactly or as a parent", () => {
    for (const route of BARE_ADMIN_ROUTES) {
      expect(isBareAdminRoute(route)).toBe(true);
      expect(isBareAdminRoute(`${route}/x`)).toBe(true);
    }
  });

  it("does not match a loose prefix or a real admin page", () => {
    expect(isBareAdminRoute("/admin/login-anything")).toBe(false);
    expect(isBareAdminRoute("/admin")).toBe(false);
    expect(isBareAdminRoute("/admin/projects")).toBe(false);
  });
});

describe("safeAdminNext", () => {
  it("honours a path inside the admin app, query string included", () => {
    expect(safeAdminNext("/admin")).toBe("/admin");
    expect(safeAdminNext("/admin/projects")).toBe("/admin/projects");
    expect(safeAdminNext("/admin/projects/abc/prospects?status=started")).toBe("/admin/projects/abc/prospects?status=started");
  });

  it("falls back to /admin for anything that could leave the app", () => {
    for (const bad of [
      "https://evil.example/admin/x",
      "//evil.example/admin",
      "/admin//evil.example",
      "/adminx",
      "/study/slug",
      "/",
      "javascript:alert(1)",
      "/admin/\\evil",
      "/admin/x\r\nSet-Cookie: a=b",
      "",
      null,
      undefined,
    ]) {
      expect(safeAdminNext(bad)).toBe(ADMIN_HOME);
    }
  });

  it("never bounces someone back onto an auth screen", () => {
    expect(safeAdminNext("/admin/login")).toBe(ADMIN_HOME);
    expect(safeAdminNext("/admin/signup?x=1")).toBe(ADMIN_HOME);
    expect(safeAdminNext("/admin/reset-password")).toBe(ADMIN_HOME);
  });
});
