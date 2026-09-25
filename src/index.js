export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("HO AI LAB ONLINE", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8"
        }
      });
    }

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "ho-ai-lab",
        version: "0.2.0"
      });
    }

    if (url.pathname === "/db-health") {
      try {
        const result = await env["ho-ai-lab-db"]
          .prepare("SELECT 1 AS ok")
          .first();

        return Response.json({
          status: "ok",
          database: "connected",
          result
        });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            database: "connection_failed",
            error: error.message
          },
          { status: 500 }
        );
      }
    }

    return Response.json(
      {
        error: "Not Found",
        path: url.pathname
      },
      { status: 404 }
    );
  }
};
