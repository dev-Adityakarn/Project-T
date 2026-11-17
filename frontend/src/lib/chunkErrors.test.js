import { isChunkLoadError, shouldRetryChunkLoad } from "@/lib/chunkErrors";

describe("chunk load errors", () => {
  beforeEach(() => sessionStorage.clear());

  it("recognizes webpack and browser dynamic-import failures", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Loading chunk 215 failed. (error: https://typinger.in/static/js/215.abc.chunk.js)",
        ),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://typinger.in/static/js/215.abc.chunk.js",
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError" })).toBe(true);
    expect(isChunkLoadError(new Error("Network request failed"))).toBe(false);
  });

  it("allows one retry per short window", () => {
    expect(shouldRetryChunkLoad(1_000)).toBe(true);
    expect(shouldRetryChunkLoad(2_000)).toBe(false);
    expect(shouldRetryChunkLoad(20_000)).toBe(true);
  });
});
