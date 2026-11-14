import { describe, expect, it } from "vitest";
import { LATEST_RELEASE, RELEASES, unseenReleases } from "@/lib/changelog";

describe("Quoi de neuf", () => {
  it("les nouveautés sont rangées de la plus récente à la plus ancienne", () => {
    const ids = RELEASES.map((r) => r.id);
    expect([...ids].sort().reverse()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rien à montrer quand la dernière a été vue", () => {
    expect(unseenReleases(LATEST_RELEASE)).toEqual([]);
  });

  it("montre tout ce qui est plus récent que la dernière vue", () => {
    expect(unseenReleases(RELEASES[1].id).map((r) => r.id)).toEqual([RELEASES[0].id]);
  });

  it("quelqu'un qui n'a jamais rien vu voit tout l'historique", () => {
    expect(unseenReleases(null)).toEqual(RELEASES);
  });
});
