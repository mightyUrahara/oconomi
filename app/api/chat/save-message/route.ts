import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user";
const DEMO_INTERNAL_KEY = process.env.DEMO_INTERNAL_KEY || "";

const VALID_ROLES = ['user', 'assistant'];
const MAX_CONTENT_LENGTH = 50000;

export async function POST(req: Request) {
  try {
    if (DEMO_INTERNAL_KEY && req.headers.get("x-demo-key") !== DEMO_INTERNAL_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = DEMO_USER_ID;

    const { content, role } = await req.json();

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "Content too long" }, { status: 400 });
    }

    const message = await prisma.chat_messages.create({
      data: {
        user_id: userId,
        content: content.trim(),
        role,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, messageId: message.id });

  } catch (error) {
    console.error("[demo/chat/save-message] Error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}