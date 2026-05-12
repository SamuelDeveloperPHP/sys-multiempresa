export type ToolMeta = {
  name: string;
  description: string;
  permission: string;
  schema: Record<string, unknown>;
};

export type Conversation = {
  id: number;
  uuid: string;
  company_id: number | null;
  user_id: number;
  channel: string;
  status: string;
  title: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export type Message = {
  id: number;
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_name?: string | null;
  tool_result?: Record<string, unknown> | null;
};

export type BootstrapPayload = {
  user: { id: number | null; name?: string | null; email?: string | null };
  company_id: number | null;
  tools: ToolMeta[];
};
