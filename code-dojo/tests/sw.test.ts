import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The service worker (public/sw.js) is a plain script for the browser. Here
 * it runs with a fake Cache Storage and a fake network, so "the network is
 * down" is one line in a test.
 */

const SOURCE = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const ORIGIN = "http://localhost:3000";

type Handler = (event: FakeEvent) => void;

interface FakeEvent {
  request: { url: string; method: string; mode: string; destination: string };
  respondWith(response: Promise<Response>): void;
  waitUntil(work: Promise<unknown>): void;
}

class FakeCache {
  entries = new Map<string, Response>();

  private key(request: string | { url: string }): string {
    const url = new URL(typeof request === "string" ? request : request.url, ORIGIN);
    // Like the real cache, the part after "#" is not part of the key.
    url.hash = "";
    return url.href;
  }
  async match(request: string | { url: string }): Promise<Response | undefined> {
    const hit = this.entries.get(this.key(request));
    if (!hit) return undefined;
    // A real saved copy remembers the address it came from.
    const copy = hit.clone();
    Object.defineProperty(copy, "url", { value: hit.url });
    return copy;
  }
  async put(request: string | { url: string }, response: Response): Promise<void> {
    this.entries.set(this.key(request), response);
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    let cache = this.stores.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.stores.set(name, cache);
    }
    return cache;
  }
  async keys(): Promise<string[]> {
    return Array.from(this.stores.keys());
  }
  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }
}

interface Worker {
  caches: FakeCaches;
  /** What the network answers. Throw to be offline for that address. */
  network: (url: string) => Response | Promise<Response>;
  fetched: string[];
  claimed: boolean;
  skippedWaiting: boolean;
  install(): Promise<void>;
  activate(): Promise<void>;
  /** Sends a request through the worker. Null when the worker leaves it to the browser. */
  request(
    url: string,
    options?: { method?: string; mode?: string; destination?: string },
  ): Promise<Response | null>;
}

function startWorker(query: string): Worker {
  const handlers = new Map<string, Handler>();
  const caches = new FakeCaches();
  const worker = {
    caches,
    network: (url: string) => new Response("net:" + url),
    fetched: [] as string[],
    claimed: false,
    skippedWaiting: false,
  } as Worker;

  const self = {
    location: { href: ORIGIN + "/sw.js" + query, origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: () => {
      worker.skippedWaiting = true;
    },
    clients: {
      claim: async () => {
        worker.claimed = true;
      },
    },
  };
  const fetch = async (input: string | { url: string }) => {
    const url = new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
    worker.fetched.push(url);
    return worker.network(url);
  };

  new Function("self", "caches", "fetch", SOURCE)(self, caches, fetch);

  /** Fires a lifecycle event and waits for the work it started. */
  const lifecycle = async (type: string) => {
    const pending: Promise<unknown>[] = [];
    const event = {
      waitUntil: (work: Promise<unknown>) => {
        pending.push(work);
      },
    };
    handlers.get(type)!(event as unknown as FakeEvent);
    await Promise.all(pending);
  };
  worker.install = () => lifecycle("install");
  worker.activate = () => lifecycle("activate");

  worker.request = async (url, options = {}) => {
    let answer: Promise<Response> | null = null;
    const pending: Promise<unknown>[] = [];
    handlers.get("fetch")!({
      request: {
        url: new URL(url, ORIGIN).href,
        method: options.method ?? "GET",
        mode: options.mode ?? "cors",
        destination: options.destination ?? "",
      },
      respondWith: (response) => {
        answer = response;
      },
      waitUntil: (work) => pending.push(work),
    });
    if (answer === null) return null;
    const response = await (answer as Promise<Response>);
    await Promise.all(pending);
    return response;
  };

  return worker;
}

const offline = () => {
  throw new TypeError("Failed to fetch");
};

const REACT_DOM = "https://prod-packager-packages.codesandbox.io/v2/packages/react-dom/19.3.1.json";
const JSX_RUNTIME = "https://cdn.jsdelivr.net/npm/react@19.3.1/jsx-runtime.js";
const BABEL_HELPER = "https://cdn.jsdelivr.net/npm/@babel/runtime@7.29.14/helpers/interopRequireDefault.js";
const NEWEST_REACT = "https://data.jsdelivr.com/v1/package/npm/react";
const NEWEST_BABEL = "https://data.jsdelivr.com/v1/package/npm/@babel/core";

describe("service worker: the React packages of the live preview", () => {
  for (const mode of ["?dev=1", "?v=build1&t=tools1"]) {
    describe(mode === "?dev=1" ? "in npm run dev" : "in a production build", () => {
      it("downloads a package with an exact version once, then uses the saved copy", async () => {
        const worker = startWorker(mode);
        for (const url of [REACT_DOM, JSX_RUNTIME, BABEL_HELPER]) {
          expect(await (await worker.request(url))!.text()).toBe("net:" + url);
          worker.network = offline;
          expect(await (await worker.request(url))!.text()).toBe("net:" + url);
          worker.network = (address) => new Response("net:" + address);
        }
        expect(worker.fetched).toEqual([REACT_DOM, JSX_RUNTIME, BABEL_HELPER]);
      });

      it("asks the network which version is newest, and remembers the answer for offline", async () => {
        const worker = startWorker(mode);
        worker.network = () => new Response("19.3.1");
        expect(await (await worker.request(NEWEST_REACT))!.text()).toBe("19.3.1");
        // Online again later: the fresh answer wins.
        worker.network = () => new Response("19.4.0");
        expect(await (await worker.request(NEWEST_REACT))!.text()).toBe("19.4.0");
        // Offline: the last answer.
        worker.network = offline;
        expect(await (await worker.request(NEWEST_REACT))!.text()).toBe("19.4.0");
        expect(await (await worker.request(NEWEST_BABEL).catch(() => new Response("failed")))!.text()).toBe("failed");
      });

      it("does not save an error answer", async () => {
        const worker = startWorker(mode);
        worker.network = () => new Response("gone", { status: 404 });
        expect((await worker.request(REACT_DOM))!.status).toBe(404);
        worker.network = (url) => new Response("net:" + url);
        expect(await (await worker.request(REACT_DOM))!.text()).toBe("net:" + REACT_DOM);
      });

      it("leaves other sites alone", async () => {
        const worker = startWorker(mode);
        expect(await worker.request("https://example.com/data.json")).toBeNull();
        expect(await worker.request("https://fonts.googleapis.com/css")).toBeNull();
      });
    });
  }
});

describe("service worker in npm run dev", () => {
  it("leaves every request of the app to the dev server", async () => {
    const worker = startWorker("?dev=1");
    await worker.install();
    await worker.activate();
    expect(worker.fetched).toEqual([]);
    expect(await worker.request("/", { mode: "navigate" })).toBeNull();
    expect(await worker.request("/problem/debounce", { mode: "navigate" })).toBeNull();
    expect(await worker.request("/_next/static/chunks/app.js")).toBeNull();
    expect(await worker.request("/monaco/vs/loader.js")).toBeNull();
    expect(await worker.request("/sandpack/index.html", { mode: "navigate" })).toBeNull();
    expect(await worker.request("/static/js/sandbox.js")).toBeNull();
  });
});

describe("service worker in a production build", () => {
  const MANIFEST = {
    version: "build1",
    tools: "tools1",
    urls: ["/", "/drill", "/problem/debounce", "/_next/static/chunks/app.js", "/monaco/vs/loader.js", "/sandpack/index.html"],
  };

  function online(worker: Worker) {
    worker.network = (url) => {
      const path = new URL(url).pathname;
      if (path === "/precache.json") return new Response(JSON.stringify(MANIFEST));
      return new Response("net:" + path);
    };
  }

  async function installed(): Promise<Worker> {
    const worker = startWorker("?v=build1&t=tools1");
    online(worker);
    await worker.install();
    await worker.activate();
    worker.fetched.length = 0;
    return worker;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves every page and file of the list when it installs", async () => {
    const worker = await installed();
    expect(worker.skippedWaiting).toBe(true);
    expect(worker.claimed).toBe(true);
    const app = worker.caches.stores.get("dojo-app-build1")!;
    const tools = worker.caches.stores.get("dojo-tools-tools1")!;
    expect(Array.from(app.entries.keys()).sort()).toEqual(
      ["/", "/_next/static/chunks/app.js", "/drill", "/problem/debounce"].map((path) => ORIGIN + path),
    );
    expect(Array.from(tools.entries.keys()).sort()).toEqual(
      ["/monaco/vs/loader.js", "/sandpack/index.html"].map((path) => ORIGIN + path),
    );
  });

  it("keeps going when one file of the list cannot be downloaded", async () => {
    const worker = startWorker("?v=build1&t=tools1");
    worker.network = (url) => {
      const path = new URL(url).pathname;
      if (path === "/precache.json") return new Response(JSON.stringify(MANIFEST));
      if (path === "/drill") throw new TypeError("Failed to fetch");
      if (path === "/problem/debounce") return new Response("no", { status: 500 });
      return new Response("net:" + path);
    };
    await worker.install();
    const app = worker.caches.stores.get("dojo-app-build1")!;
    expect(Array.from(app.entries.keys()).sort()).toEqual([ORIGIN + "/", ORIGIN + "/_next/static/chunks/app.js"]);
  });

  it("installs even when the list itself cannot be read", async () => {
    const worker = startWorker("?v=build1&t=tools1");
    worker.network = offline;
    await worker.install();
    await worker.activate();
    expect(worker.claimed).toBe(true);
  });

  it("does not download again what is already saved", async () => {
    const worker = await installed();
    await worker.install();
    expect(worker.fetched).toEqual([ORIGIN + "/precache.json"]);
  });

  it("shows a page from the network when online, and keeps the newest copy", async () => {
    const worker = await installed();
    worker.network = () => new Response("fresh page");
    expect(await (await worker.request("/problem/debounce", { mode: "navigate" }))!.text()).toBe("fresh page");
    worker.network = offline;
    expect(await (await worker.request("/problem/debounce", { mode: "navigate" }))!.text()).toBe("fresh page");
  });

  it("shows every saved page with no connection", async () => {
    const worker = await installed();
    worker.network = offline;
    expect(await (await worker.request("/", { mode: "navigate" }))!.text()).toBe("net:/");
    expect(await (await worker.request("/drill", { mode: "navigate" }))!.text()).toBe("net:/drill");
    // The address may carry a query. The page is the same.
    expect(await (await worker.request("/problem/debounce?x=1", { mode: "navigate" }))!.text()).toBe(
      "net:/problem/debounce",
    );
  });

  it("uses the saved page when the network is too slow", async () => {
    const worker = await installed();
    worker.network = () => new Promise<Response>(() => {});
    const answer = worker.request("/drill", { mode: "navigate" });
    await vi.advanceTimersByTimeAsync(4000);
    expect(await (await answer)!.text()).toBe("net:/drill");
  });

  it("says so in Arabic when a page was never saved and there is no connection", async () => {
    const worker = await installed();
    worker.network = offline;
    const response = (await worker.request("/problem/unknown", { mode: "navigate" }))!;
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("مفيش نت");
  });

  it("does not save a page that answered with an error", async () => {
    const worker = await installed();
    worker.network = () => new Response("broken", { status: 500 });
    expect((await worker.request("/drill", { mode: "navigate" }))!.status).toBe(500);
    worker.network = offline;
    expect(await (await worker.request("/drill", { mode: "navigate" }))!.text()).toBe("net:/drill");
  });

  it("serves the app's files, the editor and the bundler from the saved copy", async () => {
    const worker = await installed();
    worker.network = offline;
    expect(await (await worker.request("/_next/static/chunks/app.js"))!.text()).toBe("net:/_next/static/chunks/app.js");
    expect(await (await worker.request("/monaco/vs/loader.js"))!.text()).toBe("net:/monaco/vs/loader.js");
    expect(await (await worker.request("/sandpack/index.html", { mode: "navigate" }))!.text()).toBe(
      "net:/sandpack/index.html",
    );
    expect(worker.fetched).toEqual([]);
  });

  it("saves a bundler file the first time a preview asks for it", async () => {
    const worker = await installed();
    for (const path of ["/static/js/sandbox.8a7d01a44.js", "/babel-transpiler.dc3397b1.worker.js"]) {
      expect(await (await worker.request(path))!.text()).toBe("net:" + path);
    }
    worker.network = offline;
    for (const path of ["/static/js/sandbox.8a7d01a44.js", "/babel-transpiler.dc3397b1.worker.js"]) {
      expect(await (await worker.request(path))!.text()).toBe("net:" + path);
    }
  });

  it("gives a worker script a copy with no address of its own, so the worker keeps its #settings", async () => {
    const worker = startWorker("?v=build1&t=tools1");
    // A real answer knows the address it came from.
    worker.network = (url) => {
      const path = new URL(url).pathname;
      if (path === "/precache.json") return new Response(JSON.stringify(MANIFEST));
      const response = new Response("net:" + path);
      Object.defineProperty(response, "url", { value: url });
      return response;
    };
    await worker.install();
    worker.network = offline;

    const asScript = (await worker.request("/_next/static/chunks/app.js#params=1", { destination: "script" }))!;
    expect(asScript.url).toBe(ORIGIN + "/_next/static/chunks/app.js");

    const asWorker = (await worker.request("/_next/static/chunks/app.js#params=1", { destination: "worker" }))!;
    expect(asWorker.url).toBe("");
    expect(await asWorker.text()).toBe("net:/_next/static/chunks/app.js");
  });

  it("leaves data requests and anything that is not a GET to the browser", async () => {
    const worker = await installed();
    expect(await worker.request("/problem/debounce?_rsc=abc")).toBeNull();
    expect(await worker.request("/precache.json")).toBeNull();
    expect(await worker.request("/", { mode: "navigate", method: "POST" })).toBeNull();
  });

  it("removes the caches of older builds, and nothing else", async () => {
    const worker = startWorker("?v=build2&t=tools1");
    online(worker);
    for (const name of ["dojo-app-build1", "dojo-tools-tools0", "dojo-tools-tools1", "dojo-packages-v1", "someone-else"]) {
      await worker.caches.open(name);
    }
    await worker.install();
    await worker.activate();
    expect((await worker.caches.keys()).sort()).toEqual([
      "dojo-app-build2",
      "dojo-packages-v1",
      "dojo-tools-tools1",
      "someone-else",
    ]);
  });
});
