// thumbUrl: request a narrower Wikimedia render for thumbnails so phones
// don't download the full 1280px file for a 120px slot.
import { describe, expect, it } from "vitest";
import { thumbUrl } from "../src/shared/utils";

const WIKI =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/1280px-Photo.jpg";

describe("thumbUrl", () => {
  it("rewrites the Wikimedia width segment to the requested standard width", () => {
    expect(thumbUrl(WIKI, 250)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/250px-Photo.jpg",
    );
    expect(thumbUrl(WIKI, 960)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/960px-Photo.jpg",
    );
    expect(thumbUrl(WIKI, 1280)).toBe(WIKI);
  });

  it("snaps non-standard widths UP to the nearest standard step (Wikimedia 400s anything else)", () => {
    // 320/640/800 are not on Wikimedia's whitelist (20, 40, 60, 120,
    // 250, 330, 500, 960, 1280, 1920, 3840) — requesting them returns
    // HTTP 400, so every width must be snapped.
    expect(thumbUrl(WIKI, 320)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/330px-Photo.jpg",
    );
    expect(thumbUrl(WIKI, 640)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/960px-Photo.jpg",
    );
    expect(thumbUrl(WIKI, 800)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/960px-Photo.jpg",
    );
    expect(thumbUrl(WIKI, 100)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/120px-Photo.jpg",
    );
  });

  it("handles URL-encoded filenames", () => {
    const encoded =
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/%E0%A6%AA%E0%A6%A6%E0%A7%8D%E0%A6%AE%E0%A6%BE.jpg/1280px-%E0%A6%AA%E0%A6%A6%E0%A7%8D%E0%A6%AE%E0%A6%BE.jpg";
    expect(thumbUrl(encoded, 320)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/%E0%A6%AA%E0%A6%A6%E0%A7%8D%E0%A6%AE%E0%A6%BE.jpg/330px-%E0%A6%AA%E0%A6%A6%E0%A7%8D%E0%A6%AE%E0%A6%BE.jpg",
    );
  });

  it("passes through non-Wikimedia URLs unchanged", () => {
    expect(thumbUrl("https://www.thebdtoday.online/api/v1/media-file/abc.jpg", 320)).toBe(
      "https://www.thebdtoday.online/api/v1/media-file/abc.jpg",
    );
    expect(thumbUrl("https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg", 320)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg",
    );
    expect(thumbUrl("https://example.com/photo-1280px-x.jpg", 320)).toBe(
      "https://example.com/photo-1280px-x.jpg",
    );
  });

  it("returns undefined for missing URLs", () => {
    expect(thumbUrl(undefined, 320)).toBeUndefined();
    expect(thumbUrl(null, 320)).toBeUndefined();
    expect(thumbUrl("", 320)).toBeUndefined();
  });
});
