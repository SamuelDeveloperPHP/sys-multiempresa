import type { ToolMeta } from "../types";

type Props = { tools: ToolMeta[] };

export function ToolCatalog({ tools }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Tools disponíveis</h2>
      <div className="mt-3 space-y-3">
        {tools.map((tool) => (
          <div key={tool.name} className="rounded-xl border border-slate-200 p-3">
            <div className="font-medium text-slate-900">{tool.name}</div>
            <div className="mt-1 text-sm text-slate-600">{tool.description}</div>
            <div className="mt-2 text-xs text-slate-500">Permissão: {tool.permission}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
