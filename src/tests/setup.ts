import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "smartdeals.test.db");
for (const suffix of ["", "-wal", "-shm"]) {
  try { fs.unlinkSync(`${file}${suffix}`); } catch { /* arquivo inexistente */ }
}
process.env.LOCAL_DB_PATH = file;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
