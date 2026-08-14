import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InviteManager } from "./InviteManager.js";

describe("InviteManager", () => {
  let manager: InviteManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new InviteManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cria um convite e o retorna via getById", () => {
    const invite = manager.create("a", "Ana", "b", vi.fn());
    expect(invite.fromId).toBe("a");
    expect(invite.toId).toBe("b");
    expect(manager.getById(invite.id)).toBeDefined();
  });

  it("resolve o convite como aceito e remove do mapa", () => {
    const invite = manager.create("a", "Ana", "b", vi.fn());
    const result = manager.resolve(invite.id, true);
    expect(result?.accepted).toBe(true);
    expect(manager.getById(invite.id)).toBeUndefined();
  });

  it("resolve o convite como recusado", () => {
    const invite = manager.create("a", "Ana", "b", vi.fn());
    const result = manager.resolve(invite.id, false);
    expect(result?.accepted).toBe(false);
  });

  it("chama onExpire após 30 segundos e remove o convite", () => {
    const onExpire = vi.fn();
    const invite = manager.create("a", "Ana", "b", onExpire);
    vi.advanceTimersByTime(30_000);
    expect(onExpire).toHaveBeenCalledWith(invite.id);
    expect(manager.getById(invite.id)).toBeUndefined();
  });

  it("não chama onExpire se o convite for resolvido antes", () => {
    const onExpire = vi.fn();
    const invite = manager.create("a", "Ana", "b", onExpire);
    manager.resolve(invite.id, true);
    vi.advanceTimersByTime(30_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("cancelAll remove todos os convites do jogador", () => {
    const i1 = manager.create("a", "Ana", "b", vi.fn());
    const i2 = manager.create("c", "Carlos", "a", vi.fn());
    manager.cancelAll("a");
    expect(manager.getById(i1.id)).toBeUndefined();
    expect(manager.getById(i2.id)).toBeUndefined();
  });
});
