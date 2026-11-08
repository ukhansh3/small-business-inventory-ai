import { handleMembers } from "../../server/handlers/members";
export const GET = (req: Request) => handleMembers(req);
export const POST = GET;
export const PATCH = GET;
export const PUT = GET;
export const DELETE = GET;
