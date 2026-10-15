import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PLAY_COOKIE } from "@/lib/exams";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  const staff =
    !!user && (user.role === "SUPER_ADMIN" || user.role === "QUESTION_UPLOADER");

  if (!staff) {
    // a candidate may only hear words in their own open attempt
    const jar = await cookies();
    const token = jar.get(PLAY_COOKIE)?.value;
    if (!token) return new Response("Not allowed", { status: 403 });

    const a = await db.attempt.findUnique({
      where: { token },
      select: { questionIds: true, submittedAt: true, endsAt: true },
    });
    const ids = Array.isArray(a?.questionIds) ? (a!.questionIds as unknown[]) : [];
    if (!a || a.submittedAt || a.endsAt.getTime() < Date.now() || !ids.includes(id)) {
      return new Response("Not allowed", { status: 403 });
    }
  }

  const w = await db.spellingWord.findUnique({
    where: { id },
    select: { audio: true, audioMime: true },
  });
  if (!w?.audio) return new Response("No audio", { status: 404 });

  return new Response(Buffer.from(w.audio), {
    headers: {
      "Content-Type": w.audioMime ?? "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(w.audio.length),
    },
  });
}
