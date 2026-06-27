import fs from "fs";
import path from "path";

// Read the static landing page once at module load instead of on every request.
const html = fs.readFileSync(path.join(process.cwd(), "index (1).html"), "utf8");

export async function GET() {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
