import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import { ChatWindow } from "./components/ChatWindow";
import { ToolCatalog } from "./components/ToolCatalog";
import type { BootstrapPayload, Conversation, Message } from "./types";

function uuidv4() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function App() {
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadBootstrap(); }, []);

  async function loadBootstrap() {
    setBootLoading(true);
    setError(null);
    try {
      const data = await api.bootstrap(companyId);
      setBoot(data);
      setCompanyId(data.company_id);
    } catch {
      setError("Falha ao carregar o bootstrap do Jarvis.");
    } finally {
      setBootLoading(false);
    }
  }

  async function startConversation() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.conversations.create({ channel: "web", title: "Nova conversa" }, companyId);
      setConversation(response.data);
      setMessages([]);
    } catch {
      setError("Não foi possível iniciar a conversa.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!conversation || !content.trim()) return;
    const currentContent = content.trim();
    setContent("");
    const optimisticUserMessage: Message = { id: Date.now(), role: "user", content: currentContent };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setLoading(true);
    setError(null);
    try {
      const response = await api.conversations.sendMessage(conversation.id, { content: currentContent, request_uuid: uuidv4() }, companyId);
      const payload = response.data;
      const assistantMessage: Message = { id: payload.assistant_message.id, role: payload.assistant_message.role, content: payload.assistant_message.content };
      const toolMessage = payload.tool ? { id: Date.now() + 1, role: "tool" as const, content: `Resultado da tool ${payload.tool.name}`, tool_name: payload.tool.name, tool_result: payload.tool.result } : null;
      setMessages((prev) => [...prev, ...(toolMessage ? [toolMessage] : []), assistantMessage]);
    } catch {
      setError("Falha ao enviar mensagem ao Jarvis.");
    } finally {
      setLoading(false);
    }
  }

  const canSend = useMemo(() => !!conversation && !!content.trim() && !loading, [conversation, content, loading]);

  if (bootLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Carregando Jarvis...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-lg lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jarvis · Stage 1</h1>
            <p className="mt-2 text-sm text-slate-300">Módulo pronto para plugar no seu sistema com multiempresa, ACL, aprovação, auditoria e idempotência.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 px-4 py-2 text-sm">Empresa ativa: {companyId ?? "não informada"}</div>
            <button onClick={startConversation} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400" disabled={loading}>Nova conversa</button>
          </div>
        </div>
        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <ToolCatalog tools={boot?.tools ?? []} />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Usuário autenticado</h2>
              <div className="mt-3 text-sm text-slate-600">
                <div>{boot?.user?.name ?? "Sem nome"}</div>
                <div>{boot?.user?.email ?? "Sem email"}</div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <ChatWindow messages={messages} loading={loading} />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-slate-900">Mensagem</label>
              <textarea className="min-h-[120px] w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 transition focus:border-indigo-500" placeholder='Exemplos: "status do jarvis" ou "/tool system.healthcheck {}"' value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="mt-4 flex justify-end">
                <button onClick={sendMessage} disabled={!canSend} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">Enviar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
