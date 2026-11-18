// Roman Bengali transliteration + loose Roman matching (see
// src/shared/transliterate.ts). Run with `npm test` (vitest).
import { describe, expect, it } from "vitest";
import { hasLatin, looseRoman, romanToBengali } from "../src/shared/transliterate";

describe("romanToBengali", () => {
  it.each([
    ["padma", "পদ্মা"],
    ["dhaka", "ধাকা"],
    ["Dhaka", "ঢাকা"],
    ["shikkha", "শিক্ষা"],
    ["bishwokap", "বিশ্বকাপ"],
    ["bangladesh", "বাংলাদেশ"],
    ["khela", "খেলা"],
    ["Padma Setu", "পদ্মা সেতু"],
    ["angur", "আঙুর"],
    // Loose spelling: the transliteration is only approximate here —
    // the loose slug path (looseRoman) is what catches "Bisshokap".
    ["Bisshokap", "বিস্শোকাপ"],
    ["nirbachon", "নির্বাছোন"],
  ])("transliterates %s -> %s", (input, expected) => {
    expect(romanToBengali(input)).toBe(expected);
  });

  it("leaves Bengali and punctuation untouched", () => {
    expect(romanToBengali("বিশ্বকাপ!")).toBe("বিশ্বকাপ!");
    expect(romanToBengali("")).toBe("");
  });
});

describe("looseRoman", () => {
  it("ignores doubled letters and h/w on both sides", () => {
    expect(looseRoman("Bisshokap")).toBe("bisokap");
    expect(looseRoman("bishwokap-football-final-uttejana")).toContain("bisokap");
    expect(looseRoman("Padma Setu")).toBe("padmasetu");
    expect(looseRoman("dhaka-metro-rail-notun-line")).toContain("daka");
    expect(looseRoman("bangladesh-cricket-t20-series-joy")).toContain("cricket");
  });

  it("hasLatin detects Latin letters", () => {
    expect(hasLatin("Bisshokap")).toBe(true);
    expect(hasLatin("বিশ্বকাপ")).toBe(false);
    expect(hasLatin("")).toBe(false);
  });
});
