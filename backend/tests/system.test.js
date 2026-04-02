const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../app");

test("GET /health returns ok", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, "ok");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("GET / returns service metadata", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "Campus-GrubHub API");
    assert.equal(typeof body.uptimeSeconds, "number");
    assert.equal(typeof body.timestamp, "string");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
