import worker from "../../worker";

const makeEnv = ({ shell = "<html>shell</html>", notFound = "<html>branded 404</html>" } = {}) => ({
  ASSETS: {
    fetch: jest.fn(async (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/index.html") {
        return new Response(shell, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.pathname === "/404.html") {
        return new Response(notFound, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("", { status: 404 });
    }),
  },
});

const request = (pathname) => new Request(`https://typinger.in${pathname}`);

describe("Cloudflare Worker routing", () => {
  it("returns the branded 404 page with HTTP 404 for unknown paths", async () => {
    const response = await worker.fetch(request("/does-not-exist"), makeEnv());

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("branded 404");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("keeps /404 and /404.html as real 404 responses", async () => {
    for (const pathname of ["/404", "/404.html"]) {
      const response = await worker.fetch(request(pathname), makeEnv());
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("branded 404");
    }
  });

  it("serves the SPA shell for a valid client-side route", async () => {
    const response = await worker.fetch(request("/blog/how-to-type-faster/"), makeEnv());

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("shell");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("adds noindex headers to private and thin app routes", async () => {
    const admin = await worker.fetch(request("/admin/users/1"), makeEnv());
    expect(admin.headers.get("x-robots-tag")).toBe("noindex, nofollow");

    const game = await worker.fetch(request("/games/speed-test/"), makeEnv());
    expect(game.headers.get("x-robots-tag")).toBe("noindex, follow");
  });

  it("redirects legacy and non-canonical URLs while preserving the query", async () => {
    const response = await worker.fetch(request("/typing-test?utm=1"), makeEnv());

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://typinger.in/typing-test/?utm=1");
  });

  it("does not answer API paths with the SPA shell", async () => {
    const response = await worker.fetch(request("/api/leaderboard"), makeEnv());

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("branded 404");
  });

  it("uses a nonempty fallback when the 404 asset is unavailable", async () => {
    const env = {
      ASSETS: {
        fetch: jest.fn(async () => new Response("", { status: 404 })),
      },
    };
    const response = await worker.fetch(request("/missing"), env);

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("That page took a wrong turn");
    expect(body.length).toBeGreaterThan(100);
  });

  it("rejects non-GET/HEAD methods", async () => {
    const response = await worker.fetch(
      new Request("https://typinger.in/blog/", { method: "POST" }),
      makeEnv(),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});
