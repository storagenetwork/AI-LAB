export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.json({
        service: "HO AI LAB",
        status: "online"
      });
    }

    if (url.pathname === "/db-health") {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first();

      return Response.json({
        status: "ok",
        database: "connected",
        result
      });
    }

    if (url.pathname === "/api/v1/router/select") {
      const rows = await env.DB.prepare(`
        SELECT
          p.id AS provider_id,
          p.name AS provider,
          p.type AS provider_type,
          p.base_url,
          m.id AS model_id,
          m.name AS model,
          q.status AS quota_status,
          q.remaining_value,
          p.priority AS provider_priority,
          m.priority AS model_priority
        FROM providers p
        JOIN models m
          ON m.provider_id = p.id
        LEFT JOIN quotas q
          ON q.provider_id = p.id
         AND q.model_id = m.id
        WHERE p.enabled = 1
          AND m.enabled = 1
          AND p.free_only = 1
          AND m.free_only = 1
          AND p.billing_allowed = 0
        ORDER BY p.priority, m.priority
      `).all();

      const candidates = rows.results || [];

      if (candidates.length === 0) {
        return Response.json({
          status: "paused",
          reason: "no_free_provider_available",
          billing_used: false
        }, { status: 503 });
      }

      return Response.json({
        status: "candidate_selected",
        billing_used: false,
        candidate: candidates[0],
        candidates
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
