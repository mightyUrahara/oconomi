import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user";
const DEMO_INTERNAL_KEY = process.env.DEMO_INTERNAL_KEY || "";

export async function POST(req: Request) {
  try {
    if (DEMO_INTERNAL_KEY && req.headers.get("x-demo-key") !== DEMO_INTERNAL_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = DEMO_USER_ID;

    const totalMessages = await prisma.chat_messages.count({
      where: { user_id: userId },
    });

    if (totalMessages <= 50) {
      return NextResponse.json({ message: "No cleanup needed", count: 0 });
    }

    const keepMessages = await prisma.chat_messages.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 50,
      select: { id: true },
    });

    const keepIds = keepMessages.map((m: { id: string }) => m.id);

    const deleted = await prisma.chat_messages.deleteMany({
      where: {
        user_id: userId,
        id: { notIn: keepIds },
      },
    });

    return NextResponse.json({ success: true, deleted: deleted.count });

  } catch (error) {
    console.error("[demo/chat/cleanup] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}