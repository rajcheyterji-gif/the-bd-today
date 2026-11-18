/**
 * Copy protection for news writing (paired with the `.no-copy` CSS class
 * in index.css).
 *
 * Rule the newsroom asked for: the text of a story — headline, excerpt,
 * body — cannot be selected or copied. Links stay copyable (long-press a
 * link still offers "copy link address"), as do form fields, so a reader
 * can still copy a link, type a comment, or use the share buttons.
 *
 * Two layers: CSS `user-select: none` stops a selection being made at all,
 * and `handleProtectedCopy` (attached to the article element) blocks the
 * copy event itself for anything that is not inside a link, input,
 * textarea, select, or contenteditable element.
 *
 * The selection check is written against a minimal node shape (nodeType,
 * tagName, parentElement, closest) instead of the real DOM types, so it
 * can be unit-tested in vitest's node environment without jsdom.
 */

const ALLOWED_COPY_SELECTOR = 'a, input, textarea, select, [contenteditable="true"]';

type NodeLike = {
  nodeType?: number;
  tagName?: string;
  parentElement?: NodeLike | null;
  closest?: (selector: string) => unknown;
  getAttribute?: (name: string) => string | null;
};

/** True when the selection anchor sits inside an element whose text may be copied. */
export function isSelectionInsideAllowedElement(
  anchorNode: NodeLike | null | undefined,
): boolean {
  let el: NodeLike | null | undefined = anchorNode;
  // A text node's selection anchor lives on the text node itself; start
  // from its parent element.
  if (el && el.nodeType === 3) el = el.parentElement;
  while (el) {
    const tag = typeof el.tagName === "string" ? el.tagName.toLowerCase() : "";
    if (tag === "a" || tag === "input" || tag === "textarea" || tag === "select") return true;
    const editable = el.getAttribute?.("contenteditable");
    if (editable === "true" || editable === "") return true;
    // Real DOM: closest() checks the element itself and its ancestors.
    if (typeof el.closest === "function") return Boolean(el.closest(ALLOWED_COPY_SELECTOR));
    el = el.parentElement;
  }
  return false;
}

/** True when a copy event for this selection should be blocked. No selection means nothing to steal, so it is allowed. */
export function shouldBlockCopy(anchorNode: NodeLike | null | undefined): boolean {
  if (!anchorNode) return false;
  return !isSelectionInsideAllowedElement(anchorNode);
}

/** React onCopy handler for protected article content. */
export function handleProtectedCopy(e: { preventDefault(): void }): void {
  const selection =
    typeof window !== "undefined" && typeof window.getSelection === "function"
      ? window.getSelection()
      : null;
  if (shouldBlockCopy(selection?.anchorNode as NodeLike | null | undefined)) {
    e.preventDefault();
  }
}
