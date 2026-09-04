import ChatDemo from "./ChatDemo";

// DEMO NOTE: no auth/session — plug in a real user id from your Supabase
// session or a fixed demo account id here. No chat history is loaded
// (MVP scope), so we always start from an empty conversation.
const DEMO_USER_ID = "demo-user";

export default function ChatPage() {
  return <ChatDemo userId={DEMO_USER_ID} />;
}