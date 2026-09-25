export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("HO AI LAB ONLINE", {
        status: 200,
        headers: { "content-type": "text/plain; charset=UTF-8" }
      });
    }

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "ho-ai-lab",
        version: "0.1.0"
      });
    }

    return Response.json(
      { error: "Not Found", path: url.pathname },
      { status: 404 }
    );
  }
};
