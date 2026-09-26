export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Home
    if (url.pathname === "/") {
      return Response.json({
        status: "online",
        project: "HO AI LAB"
      });
    }

    // Database health
    if (url.pathname === "/db-health") {
      try {
        const result = await env.DB
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
            database: "failed",
            error: error.message
          },
          { status: 500 }
        );
      }
    }

    // Create test task
    if (
      url.pathname === "/api/v1/tasks/test" &&
      request.method === "GET"
    ) {
      try {
        const taskKey = "test-" + Date.now();

        const agent = await env.DB
          .prepare(
            "SELECT id, agent_key, name FROM agents WHERE agent_key = ? LIMIT 1"
          )
          .bind("ai_balance")
          .first();

        if (!agent) {
          return Response.json(
            {
              status: "error",
              message: "ai_balance agent not found"
            },
            { status: 500 }
          );
        }

        const result = await env.DB
          .prepare(`
            INSERT INTO tasks
            (
              task_key,
              agent_id,
              task_type,
              priority,
              status,
              input_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            taskKey,
            agent.id,
            "test",
            10,
            "queued",
            JSON.stringify({
              source: "test-endpoint",
              message: "HO AI LAB test task"
            })
          )
          .run();

        return Response.json({
          status: "queued",
          task_id: result.meta.last_row_id,
          task_key: taskKey,
          agent: agent.agent_key
        });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    // List tasks
    if (
      url.pathname === "/api/v1/tasks" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.DB
          .prepare(`
            SELECT
              t.id,
              t.task_key,
              t.task_type,
              t.priority,
              t.status,
              a.agent_key,
              t.created_at
            FROM tasks t
            LEFT JOIN agents a
              ON a.id = t.agent_id
            ORDER BY t.id DESC
            LIMIT 100
          `)
          .all();

        return Response.json({
          status: "ok",
          tasks: result.results
        });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    return Response.json(
      {
        status: "not_found",
        path: url.pathname
      },
      { status: 404 }
    );
  }
};
