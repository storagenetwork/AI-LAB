export default {
  async fetch(request, env) {
    return Response.json({
      worker: "online",
      db: !!env.DB,
      keys: Object.keys(env)
    });
  }
};
