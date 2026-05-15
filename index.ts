// Minimal stub — satisfies TypeScript entry-point requirement.
// This file is not executed by Mend SCA; it exists only to make the
// project a valid TypeScript project that bun install can process.
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("bun-overrides-1.1-scoped-probe: OK"));

export default app;
