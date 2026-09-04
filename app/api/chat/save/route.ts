import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import rateLimit from "@/app/lib/rateLimit";
import { sanitizeForAI } from "@/app/lib/validation";

export const maxDuration = 120;

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_v2 || "";

// ── DEMO MODE ────────────────────────────────────────────────────────────
// No login/session. Every request is treated as this fixed demo account.
// A matching row must exist in `user` with this id (or swap this for your
// own lightweight check — see DEMO_INTERNAL_KEY below).
const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user";

// Optional: require a shared secret header so this route isn't wide open
// on a public deployment. Leave DEMO_INTERNAL_KEY unset to disable.
const DEMO_INTERNAL_KEY = process.env.DEMO_INTERNAL_KEY || "";

const limiterOneMinute     = rateLimit({ interval:  1 * 60 * 1000, uniqueTokenPerInterval: 500 });
const limiterThirtyMinutes = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 });
const limiterOneHour       = rateLimit({ interval: 30 * 60 * 1000, uniqueTokenPerInterval: 500 });

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: Request) {
  try {
    // ── Auth removed for demo — optional shared-secret check instead ──────
    if (DEMO_INTERNAL_KEY && req.headers.get("x-demo-key") !== DEMO_INTERNAL_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = DEMO_USER_ID;

    // 1. Rate limits (per demo user — effectively global since there's one account)
    const limit1 = limiterOneMinute.check(15, userId);
    const limit2 = limiterThirtyMinutes.check(50, userId);
    const limit3 = limiterOneHour.check(100, userId);

    if (limit1.isRateLimited || limit2.isRateLimited || limit3.isRateLimited) {
      const hit = limit1.isRateLimited ? limit1 : limit2.isRateLimited ? limit2 : limit3;
      const mins = Math.ceil(hit.retryAfterSeconds / 60);
      const timeStr = hit.retryAfterSeconds < 60
        ? `${hit.retryAfterSeconds}s`
        : `${mins} minute${mins !== 1 ? 's' : ''}`;
      const errorMsg = limit1.isRateLimited
        ? `Too many messages. Try again in ${timeStr}.`
        : limit2.isRateLimited
          ? `30-minute limit reached. Try again in ${timeStr}.`
          : `Hourly limit reached. Try again in ${timeStr}.`;
      return NextResponse.json(
        { message: errorMsg, error: "RateLimit", retryAfter: hit.retryAfterSeconds },
        { status: 429 }
      );
    }

    // 2. Subscription check — removed for demo (no paywall)

    // 3. Parse and validate request
    const body = await req.json();
    const { message: content, image, audio, pdf } = body;

    if (content && typeof content !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    if (content && content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    if (!content?.trim() && !image && !audio && !pdf) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    // 4. Sanitize text before DB and n8n
    const sanitizedContent = content?.trim() ? sanitizeForAI(content) : null;

    // 5. Save user message to DB
    let dbContent = sanitizedContent;
    if (!dbContent) {
      if (image)      dbContent = "📸 Image Upload";
      else if (audio) dbContent = "🎤 Voice Note";
      else if (pdf)   dbContent = "📄 PDF Document";
      else            dbContent = "Message";
    }

    await prisma.chat_messages.create({
      data: {
        user_id  : userId,
        content  : dbContent,
        role     : "user",
        image_url: image || audio || pdf || null,
      },
    });

    // 6. Prepare n8n payload
    const n8nPayload = {
      userId : userId,
      message: sanitizedContent || "",
      image  : image || null,
      audio  : audio || null,
      pdf    : pdf   || null,
    };

    // 7. Send to n8n
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 110_000);

    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-n8n-secret": process.env.N8N_SECRET!,
        },
        body  : JSON.stringify(n8nPayload),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          error  : "Timeout",
          content: "⏳ This is taking longer than usual — your message was received. Please wait a moment and refresh."
        }, { status: 504 });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!n8nResponse.ok) {
      throw new Error(`n8n Error: ${n8nResponse.status}`);
    }

    // 8. Handle response
    const aiData = await n8nResponse.json();

    if (aiData.status === 'success' && aiData.data) {
      const resData = aiData.data;
      if (resData.transactions && Array.isArray(resData.transactions)) {
        return NextResponse.json({
          success          : true,
          message_type     : 'batch_form',
          transactions     : resData.transactions,
          transaction_count: resData.transaction_count,
        });
      }
      return NextResponse.json({
        success                : true,
        message_type           : 'form',
        form_data              : resData.form_data,
        is_duplicate           : resData.is_duplicate,
        duplicate_match_details: resData.duplicate_match_details || null,
      });
    }

    if (aiData.status === 'error' && aiData.message_type === 'alert') {
      const aiMessage = await prisma.chat_messages.create({
        data: { user_id: userId, content: aiData.output, role: 'assistant' },
      });
      return NextResponse.json({
        success     : true,
        message_type: 'alert',
        content     : aiData.output,
        messageId   : aiMessage.id,
      });
    }

    const aiText =
      aiData.text_response ||
      aiData.output        ||
      aiData.response      ||
      aiData.message       ||
      'Processed successfully.';

    const aiMessage = await prisma.chat_messages.create({
      data: { user_id: userId, content: aiText, role: 'assistant' },
    });

    return NextResponse.json({
      success     : true,
      message_type: 'text',
      content     : aiText,
      messageId   : aiMessage.id,
    });

  } catch (error) {
    console.error("[demo/chat/save] Error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({
      error  : "Server Error",
      content: "⚠️ Server is busy, please try again later."
    }, { status: 500 });
  }
}