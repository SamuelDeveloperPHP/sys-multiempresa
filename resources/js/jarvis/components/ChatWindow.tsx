import type { Message } from "../types";

type Props = { messages: Message[]; loading?: boolean };

export function ChatWindow({ messages, loading = false }: Props) {
  return (
    <div className="flex h-[540px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Conversa</h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Nenhuma mensagem ainda. Use o healthcheck ou peça por ferramentas disponíveis.
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={[
            "max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm",
            message.role === "user" ? "ml-auto bg-indigo-600 text-white" : message.role === "assistant" ? "bg-slate-100 text-slate-900" : "border border-amber-200 bg-amber-50 text-slate-900",
          ].join(" ")}>
            <div className="mb-1 text-[11px] uppercase tracking-wide opacity-70">{message.role}</div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            {message.tool_name && (
              <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-slate-700">
                <div className="font-semibold">Tool: {message.tool_name}</div>
                {message.tool_result && <pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(message.tool_result, null, 2)}</pre>}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="max-w-[90%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 shadow-sm">Jarvis está processando...</div>}
      </div>
    </div>
  );
}
