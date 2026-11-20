import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// HTTP driver: one stateless request per query, no pooled sockets held open by the Worker.
let _db: ReturnType<typeof create> | undefined;
function create() {
  return drizzle(neon(process.env.DATABASE_URL!), { schema });
}
export function db() {
  return (_db ??= create());
}
export { schema };
