// Roman Bengali search — readers type Bengali in Latin letters
// ("Bisshokap", "Padma Setu", "cricket") and must still find the Bengali
// stories. Exercises the real GET /api/v1/search route against FakeD1
// seeded with the live articles' slugs and Bengali titles.
// Run with `npm test` (vitest).
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/index";
import { cannedArticle, createFakeEnv, type FakeArticleRow } from "./fake-d1";

const app = createApp();

function article(overrides: Partial<FakeArticleRow>): FakeArticleRow {
  return { ...cannedArticle(), ...overrides };
}

const seed: FakeArticleRow[] = [
  article({
    id: 1,
    slug: "padma-setu-dokkhinanchol-orthoniti",
    title: "পদ্মা সেতু ঘিরে দক্ষিণাঞ্চলে অর্থনৈতিক জাগরণ, বদলে যাচ্ছে জীবনযাত্রা",
    excerpt: "পদ্মা সেতু ঘিরে অর্থনৈতিক জাগরণ।",
    content: "<p>পদ্মা সেতু।</p>",
    category_id: 1,
    category_slug: "bangladesh",
    category_name_bn: "বাংলাদেশ",
    category_name_en: "Bangladesh",
  }),
  article({
    id: 9,
    slug: "bishwokap-football-final-uttejana",
    title: "বিশ্বকাপ ফুটবলের উত্তেজনা: ফাইনালের টিকিট নিয়ে হাহাকার",
    excerpt: "ফাইনালের টিকিট নিয়ে হাহাকার।",
    content: "<p>বিশ্বকাপ ফুটবলের ফাইনাল।</p>",
    category_id: 2,
    category_slug: "sports",
    category_name_bn: "খেলাধুলা",
    category_name_en: "Sports",
  }),
  article({
    id: 3,
    slug: "bangladesh-cricket-t20-series-joy",
    title: "টি-টোয়েন্টি সিরিজে বাংলাদেশের দাপুটে জয়",
    excerpt: "সিরিজে দাপুটে জয়।",
    content: "<p>টি-টোয়েন্টি সিরিজ।</p>",
    category_id: 2,
    category_slug: "sports",
    category_name_bn: "খেলাধুলা",
    category_name_en: "Sports",
  }),
];

async function search(q: string) {
  const res = await app.request(`/api/v1/search?q=${encodeURIComponent(q)}`, { method: "GET" }, createFakeEnv({ articles: seed }));
  const body = (await res.json()) as {
    success: boolean;
    data: { slug: string }[];
    pagination: { total: number };
  };
  return { status: res.status, body };
}

describe("GET /api/v1/search with Roman Bengali queries", () => {
  it("finds বিশ্বকাপ for the loose Roman spelling 'Bisshokap'", async () => {
    const { status, body } = await search("Bisshokap");
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].slug).toBe("bishwokap-football-final-uttejana");
  });

  it("finds পদ্মা সেতু for 'Padma Setu' (transliteration path)", async () => {
    const { body } = await search("Padma Setu");
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].slug).toBe("padma-setu-dokkhinanchol-orthoniti");
  });

  it("finds the cricket story for 'cricket' (slug path)", async () => {
    const { body } = await search("cricket");
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].slug).toBe("bangladesh-cricket-t20-series-joy");
  });

  it("still finds বিশ্বকাপ for Bengali 'বিশ্বকাপ'", async () => {
    const { body } = await search("বিশ্বকাপ");
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].slug).toBe("bishwokap-football-final-uttejana");
  });

  it("returns nothing for a query that matches nothing", async () => {
    const { body } = await search("zxqv");
    expect(body.pagination.total).toBe(0);
    expect(body.data).toHaveLength(0);
  });
});
