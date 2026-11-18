import { describe, expect, it, vi } from "vitest";
import {
  handleProtectedCopy,
  isSelectionInsideAllowedElement,
  shouldBlockCopy,
} from "../src/client/lib/copyGuard";

// Minimal fake DOM nodes: only the shape copyGuard reads (nodeType,
// tagName, parentElement). No jsdom needed — vitest runs in node.
type FakeNode = {
  nodeType: number;
  tagName?: string;
  parentElement: FakeNode | null;
};
function el(tag: string, parent: FakeNode | null = null): FakeNode {
  return { nodeType: 1, tagName: tag.toUpperCase(), parentElement: parent };
}
function text(parent: FakeNode): FakeNode {
  return { nodeType: 3, parentElement: parent };
}

describe("copyGuard", () => {
  it("blocks copying plain article text", () => {
    const anchor = text(el("p", el("div", el("article"))));
    expect(isSelectionInsideAllowedElement(anchor)).toBe(false);
    expect(shouldBlockCopy(anchor)).toBe(true);
  });

  it("allows copying from a link (link text or copy link address)", () => {
    const linkText = text(el("a", el("p")));
    expect(isSelectionInsideAllowedElement(linkText)).toBe(true);
    expect(shouldBlockCopy(linkText)).toBe(false);
    // Anchor node is the link element itself.
    expect(shouldBlockCopy(el("a", el("p")))).toBe(false);
  });

  it("allows copying the reader's own input (comment form)", () => {
    expect(shouldBlockCopy(el("textarea"))).toBe(false);
    expect(shouldBlockCopy(el("input"))).toBe(false);
    expect(shouldBlockCopy(el("select"))).toBe(false);
  });

  it("allows copying with no selection", () => {
    expect(shouldBlockCopy(null)).toBe(false);
    expect(shouldBlockCopy(undefined)).toBe(false);
  });

  it("handleProtectedCopy does nothing without a window (node env) and never throws", () => {
    const preventDefault = vi.fn();
    handleProtectedCopy({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
