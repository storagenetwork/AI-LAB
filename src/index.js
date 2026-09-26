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

    // FREE-ONLY MODEL ROUTER
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

    // AGENT MANAGER
    if (url.pathname === "/api/v1/agents") {
      const result = await env.DB.prepare(`
        SELECT
          id,
          agent_key,
          name,
          description,
          agent_type,
          enabled,
          autonomous,
          default_model_id,
          config_json
        FROM agents
        WHERE enabled = 1
        ORDER BY id
      `).all();

      return Response.json({
        status: "ok",
        agents: result.results || []
      });
    }
    // TASK QUEUE — CREATE
if (url.pathname === "/api/v1/tasks" && request.method === "POST") {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({
      status: "error",
      error: "invalid_json"
    }, { status: 400 });
  }

  if (!body.task_key || !body.task_type) {
    return Response.json({
      status: "error",
      error: "task_key_and_task_type_required"
    }, { status: 400 });
  }

  const agent = body.agent_key
    ? await env.DB.prepare(`
        SELECT id, agent_key, name
        FROM agents
        WHERE agent_key = ?
          AND enabled = 1
        LIMIT 1
      `).bind(body.agent_key).first()
    : null;

  if (body.agent_key && !agent) {
    return Response.json({
      status: "error",
      error: "agent_not_found_or_disabled"
    }, { status: 404 });
  }

  const existing = await env.DB.prepare(`
    SELECT id, task_key, status
    FROM tasks
    WHERE task_key = ?
    LIMIT 1
  `).bind(body.task_key).first();

  if (existing) {
    return Response.json({
      status: "existing",
      task: existing
    });
  }

  const result = await env.DB.prepare(`
    INSERT INTO tasks (
      task_key,
      agent_id,
      task_type,
      priority,
      status,
      input_json,
      max_attempts
    )
    VALUES (?, ?, ?, ?, 'queued', ?, ?)
  `).bind(
    body.task_key,
    agent ? agent.id : null,
    body.task_type,
    Number.isInteger(body.priority) ? body.priority : 100,
    JSON.stringify(body.input || {}),
    Number.isInteger(body.max_attempts) ? body.max_attempts : 3
  ).run();

  return Response.json({
    status: "queued",
    task_id: result.meta.last_row_id,
    task_key: body.task_key,
    agent: agent || null
  }, { status: 201 });
}

    return new Response("Not Found", { status: 404 });
  }
};
