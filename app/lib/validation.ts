// Strip prompt-injection patterns before sending user text to the AI/n8n.
// Kept in sync with the client-side version in ChatDemo.tsx.
export function sanitizeForAI(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/\0/g, "")
    .replace(/ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|context)/gi, "[removed]")
    .replace(/you\s+are\s+now\s+(a\s+)?(different|new|another)/gi, "[removed]")
    .replace(/forget\s+(everything|all|previous|prior)/gi, "[removed]")
    .replace(/system\s*:\s*/gi, "[removed]")
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, "[removed]")
    .replace(/###\s*(instruction|system|prompt)/gi, "[removed]")
    .replace(/act\s+as\s+(if\s+you\s+are\s+)?/gi, "[removed]")
    .replace(/[<>{}[\]\\]{3,}/g, "")
    .replace(/(.)\1{50,}/g, "$1$1$1");
}

// General-purpose text sanitizer for values written straight to the DB
// (merchant names, categories, cities, etc. in /api/sync).
export function sanitizeInput(input: string): string {
  return String(input)
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/\0/g, "");
}