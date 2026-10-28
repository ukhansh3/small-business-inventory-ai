import {
  endpoint,
  json,
  rpc,
  readJson,
  parseDatabase,
} from "@/lib/server/vendor-api";
import {
  revisionSchema,
  workspaceSchema,
  saveDraftSchema,
} from "@/lib/contracts/vendors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(request, async ({ db }) =>
    json(parseDatabase(workspaceSchema, await rpc(db, "get_vendor_workspace"))),
  );
}
export async function POST(request: Request) {
  return endpoint(request, async ({ db }) => {
    const input = saveDraftSchema.parse(await readJson(request));
    const revision = await rpc(db, "save_vendor_draft", {
      p_data: input.draft,
      p_creation_key: input.creation_key,
      p_revision_id: input.revision_id,
      p_expected_version: input.expected_version,
    });
    return json(parseDatabase(revisionSchema, revision));
  });
}
