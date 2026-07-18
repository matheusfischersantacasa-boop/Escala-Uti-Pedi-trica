import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Pencil, ClipboardList, Table2, CalendarDays, Check, X, Loader2 } from "lucide-react";

const ROLES = [
  { key: "diarismo", label: "Diarismo", horas: 4 },
  { key: "manha", label: "Manhã", horas: 6 },
  { key: "tarde", label: "Tarde", horas: 6 },
  { key: "noite", label: "Noite", horas: 12 },
];

const PEOPLE_OPTIONS = ["Kgb", "Matheus", "Wagna", "Mulan", "Bianca", "Bianca Zago", "Nati", "Marcus", "Intensiped"];

const WEEKDAY_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

function dateInfo(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const isWeekend = dow === 0 || dow === 6;
  return { dow, dowName: WEEKDAY_PT[dow], isWeekend, display: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}` };
}

function rowHours(row) {
  const direct = parseFloat(String(row.horas).replace(",", "."));
  if (!isNaN(direct)) return direct;
  const fromTurno = String(row.turno || "").trim();
  if (/^\d+([.,]\d+)?$/.test(fromTurno)) {
    return parseFloat(fromTurno.replace(",", "."));
  }
  return NaN;
}

function emptyForm(date) {
  return { date, diarismo: "", manha: "", tarde: "", noite: "", utiA: [] };
}

function emptyFormKeepShape(f) {
  return { date: f.date, diarismo: "", manha: "", tarde: "", noite: "", utiA: [] };
}

function fmtMoney(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: "monospace", fontSize: 13, color: "#b91c1c", background: "#fff1f2" }}>
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>Erro ao carregar esta aba:</div>
          <div>{String(this.state.error && this.state.error.message)}</div>
          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 11, color: "#7f1d1d" }}>
            {this.state.error && this.state.error.stack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function firstDayOfMonth(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return toISODate(d);
}

function lastDayOfMonth(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return toISODate(d);
}

export default function EscalaUtiBApp() {
  const [tab, setTab] = useState("novo");
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm(yesterday()));
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [rateWeekday, setRateWeekday] = useState(125);
  const [rateWeekend, setRateWeekend] = useState(141.67);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [ioMsg, setIoMsg] = useState("");
  const [periodStart, setPeriodStart] = useState(firstDayOfMonth(0));
  const [periodEnd, setPeriodEnd] = useState(lastDayOfMonth(0));

  const loadAll = useCallback(() => {
    setLoading(true);
    try {
      const loaded = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("escala:")) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              loaded[parsed.date] = parsed;
            }
          } catch (e) {}
        }
      }
      setEntries(loaded);
    } catch (e) {
      setEntries({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      const existing = entries[form.date];
      if (existing) setForm(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const existing = entries[form.date];
    if (existing) setForm(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date]);

  function updateRole(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addUtiARow() {
    setForm((f) => ({
      ...f,
      utiA: [...f.utiA, { id: Date.now() + Math.random(), pessoa: "", turno: "", horas: "" }],
    }));
  }

  function updateUtiARow(id, field, value) {
    setForm((f) => ({ ...f, utiA: f.utiA.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
  }

  function removeUtiARow(id) {
    setForm((f) => ({ ...f, utiA: f.utiA.filter((r) => r.id !== id) }));
  }

  function handleSave() {
    setSaving(true);
    setSaveMsg("");
    const cleaned = { ...form, utiA: form.utiA.filter((r) => r.pessoa.trim() !== "") };
    try {
      localStorage.setItem(`escala:${form.date}`, JSON.stringify(cleaned));
      setEntries((e) => ({ ...e, [form.date]: cleaned }));
      setSaveMsg("Salvo.");
    } catch (e) {
      setSaveMsg("Não foi possível salvar neste dispositivo. Tente liberar espaço de armazenamento do navegador.");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  function handleDelete(date) {
    setEntries((e) => {
      const next = { ...e };
      delete next[date];
      return next;
    });
    try {
      localStorage.removeItem(`escala:${date}`);
    } catch (e) {}
  }

  async function handleCopyDay() {
    const cleaned = { ...form, utiA: form.utiA.filter((r) => r.pessoa.trim() !== "") };
    const text = JSON.stringify(cleaned, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setSaveMsg("Dados copiados. Cole em uma nota até o salvamento voltar a funcionar.");
    } catch (e) {
      setSaveMsg("Não foi possível copiar automaticamente.");
    }
    setTimeout(() => setSaveMsg(""), 6000);
  }

  async function handleExportAll() {
    const text = JSON.stringify(entries, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setIoMsg("Backup copiado! Cole em um app de notas para guardar.");
    } catch (e) {
      setIoMsg("Não copiou automaticamente — selecione e copie o texto abaixo manualmente.");
    }
    setShowExport(true);
    setShowImport(false);
    setTimeout(() => setIoMsg(""), 6000);
  }

  function handleImportAll() {
    try {
      const parsed = JSON.parse(importText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("formato inválido");
      }
      setEntries((e) => ({ ...e, ...parsed }));
      setIoMsg(`Importado! ${Object.keys(parsed).length} dia(s) adicionado(s)/atualizado(s).`);
      setImportText("");
      setShowImport(false);
    } catch (e) {
      setIoMsg("Não consegui ler esse texto. Confira se colou o backup completo e correto.");
    }
    setTimeout(() => setIoMsg(""), 6000);
  }

  function loadForEdit(date) {
    const existing = entries[date] || emptyForm(date);
    setForm(existing);
    setTab("novo");
  }

  const filteredEntries = {};
  Object.entries(entries).forEach(([date, entry]) => {
    if (periodStart && date < periodStart) return;
    if (periodEnd && date > periodEnd) return;
    filteredEntries[date] = entry;
  });

  const sortedDates = Object.keys(filteredEntries).sort((a, b) => (a < b ? 1 : -1));

  const summary = {};
  function addToSummary(pessoa, horas, isWeekend) {
    if (!pessoa || !pessoa.trim()) return;
    const key = pessoa.trim();
    if (!summary[key]) summary[key] = { semana: 0, fds: 0 };
    if (isWeekend) summary[key].fds += horas;
    else summary[key].semana += horas;
  }
  Object.values(filteredEntries).forEach((entry) => {
    const { isWeekend } = dateInfo(entry.date);
    ROLES.forEach((r) => addToSummary(entry[r.key], r.horas, isWeekend));
    (entry.utiA || []).forEach((row) => {
      const h = rowHours(row);
      if (!isNaN(h)) addToSummary(row.pessoa, h, isWeekend);
    });
  });
  const summaryRows = Object.entries(summary)
    .map(([pessoa, v]) => ({
      pessoa,
      semana: v.semana,
      fds: v.fds,
      total: v.semana + v.fds,
      valor: v.semana * rateWeekday + v.fds * rateWeekend,
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = summaryRows.reduce(
    (acc, r) => ({ horas: acc.horas + r.total, valor: acc.valor + r.valor }),
    { horas: 0, valor: 0 }
  );

  const formInfo = dateInfo(form.date);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <div className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-teal-700 flex items-center justify-center shrink-0">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="text-xs tracking-widest uppercase text-teal-300 font-semibold">Santa Casa de São Paulo</div>
            <div className="text-lg font-bold leading-tight">Escala UTI B</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
          {[
            { id: "novo", label: "Lançar dia", icon: CalendarDays },
            { id: "historico", label: "Histórico", icon: Table2 },
            { id: "resumo", label: "Resumo", icon: ClipboardList },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <ErrorBoundary key={tab}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500 py-16">
              <Loader2 className="animate-spin" size={18} /> Carregando…
            </div>
          ) : tab === "novo" ? (
            <NovoLancamento
              form={form}
              setForm={setForm}
              formInfo={formInfo}
              updateRole={updateRole}
              addUtiARow={addUtiARow}
              updateUtiARow={updateUtiARow}
              removeUtiARow={removeUtiARow}
              handleSave={handleSave}
              handleCopyDay={handleCopyDay}
              saving={saving}
              saveMsg={saveMsg}
              hasExisting={!!entries[form.date]}
            />
          ) : tab === "historico" ? (
            <>
              <PeriodFilter
                periodStart={periodStart}
                periodEnd={periodEnd}
                setPeriodStart={setPeriodStart}
                setPeriodEnd={setPeriodEnd}
              />
              <Historico
                sortedDates={sortedDates}
                entries={filteredEntries}
                onEdit={loadForEdit}
                onDelete={handleDelete}
                onExport={handleExportAll}
                onImport={() => {
                  setShowImport(true);
                  setShowExport(false);
                }}
                showExport={showExport}
                showImport={showImport}
                importText={importText}
                setImportText={setImportText}
                handleImportAll={handleImportAll}
                ioMsg={ioMsg}
                exportText={JSON.stringify(entries, null, 2)}
              />
            </>
          ) : (
            <>
              <PeriodFilter
                periodStart={periodStart}
                periodEnd={periodEnd}
                setPeriodStart={setPeriodStart}
                setPeriodEnd={setPeriodEnd}
              />
              <Resumo
                summaryRows={summaryRows}
                grandTotal={grandTotal}
                rateWeekday={rateWeekday}
                rateWeekend={rateWeekend}
                setRateWeekday={setRateWeekday}
                setRateWeekend={setRateWeekend}
              />
            </>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function PeriodFilter({ periodStart, periodEnd, setPeriodStart, setPeriodEnd }) {
  function applyMonth(offset) {
    setPeriodStart(firstDayOfMonth(offset));
    setPeriodEnd(lastDayOfMonth(offset));
  }
  function clearPeriod() {
    setPeriodStart("");
    setPeriodEnd("");
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3">
      <div className="text-xs tracking-wider uppercase text-teal-700 font-bold mb-2">Período</div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="text-xs text-slate-400">De</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full mt-0.5 border border-slate-200 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-400">Até</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full mt-0.5 border border-slate-200 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => applyMonth(-1)}
          className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md"
        >
          Mês anterior
        </button>
        <button
          type="button"
          onClick={() => applyMonth(0)}
          className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md"
        >
          Mês atual
        </button>
        <button
          type="button"
          onClick={clearPeriod}
          className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md"
        >
          Tudo
        </button>
      </div>
    </div>
  );
}

function PersonPicker({ value, onChange, inputBg }) {
  const isPreset = PEOPLE_OPTIONS.includes(value);
  const [forceCustom, setForceCustom] = useState(value !== "" && !isPreset);

  useEffect(() => {
    if (PEOPLE_OPTIONS.includes(value) || value === "") setForceCustom(false);
    else setForceCustom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selectValue = forceCustom ? "outro" : value || "";

  function handleSelect(e) {
    const v = e.target.value;
    if (v === "outro") {
      setForceCustom(true);
      onChange("");
    } else {
      setForceCustom(false);
      onChange(v);
    }
  }

  const bg = inputBg || "bg-slate-50";

  return (
    <div className="space-y-1.5">
      <select
        value={selectValue}
        onChange={handleSelect}
        className={`w-full ${bg} border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent`}
      >
        <option value="">Selecionar…</option>
        {PEOPLE_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value="outro">Outro (digitar nome)</option>
      </select>
      {forceCustom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome do plantonista"
          autoFocus
          className={`w-full ${bg} border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent`}
        />
      )}
    </div>
  );
}

function PersonSelect({ label, horas, value, onChange }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <div className="w-20 shrink-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-400 tabular-nums">{horas}h</div>
      </div>
      <div className="flex-1 min-w-0">
        <PersonPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function NovoLancamento({ form, setForm, formInfo, updateRole, addUtiARow, updateUtiARow, removeUtiARow, handleSave, handleCopyDay, saving, saveMsg, hasExisting }) {
  const isError = saveMsg.startsWith("Erro") || saveMsg.startsWith("Não foi");
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <label className="text-xs tracking-wide uppercase text-slate-400 font-semibold">Data do plantão</label>
        <div className="flex items-center gap-3 mt-1.5">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...emptyFormKeepShape(f), date: e.target.value }))}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              formInfo.isWeekend ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {formInfo.dowName}
          </span>
        </div>
        {hasExisting && (
          <div className="mt-2 text-xs text-amber-700 bg-amber-100 rounded-md px-2.5 py-1.5 inline-block">
            Já existe lançamento para este dia — editando.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="text-xs tracking-wider uppercase text-teal-700 font-bold mb-1">UTI B — dia completo (24h)</div>
        {ROLES.map((r) => (
          <PersonSelect key={r.key} label={r.label} horas={r.horas} value={form[r.key]} onChange={(v) => updateRole(r.key, v)} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs tracking-wider uppercase text-teal-700 font-bold">UTI A — coberturas eventuais</div>
          <button
            type="button"
            onClick={addUtiARow}
            className="flex items-center gap-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {form.utiA.length === 0 ? (
          <div className="text-sm text-slate-400 py-3 text-center">Nenhuma cobertura lançada.</div>
        ) : (
          <div className="space-y-3">
            {form.utiA.map((row) => (
              <div key={row.id} className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Cobertura</span>
                  <button type="button" onClick={() => removeUtiARow(row.id)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-slate-400">Nome</label>
                    <div className="mt-0.5">
                      <PersonPicker value={row.pessoa} onChange={(v) => updateUtiARow(row.id, "pessoa", v)} inputBg="bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-teal-700">Horas *</label>
                    <input
                      value={row.horas}
                      onChange={(e) => updateUtiARow(row.id, "horas", e.target.value.replace(/[^0-9.,]/g, ""))}
                      placeholder="Ex: 12"
                      inputMode="decimal"
                      className="w-full mt-0.5 bg-white border-2 border-teal-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Descrição do turno (opcional)</label>
                  <input
                    value={row.turno}
                    onChange={(e) => updateUtiARow(row.id, "turno", e.target.value)}
                    placeholder="Ex: 24h, 07:30-15:30, horário Dra Regina…"
                    className="w-full mt-0.5 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-sm transition-colors"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        Salvar dia
      </button>
      {saveMsg && (
        <div
          className={`flex items-center justify-center gap-1.5 text-sm font-medium text-center ${
            isError ? "text-rose-600" : "text-emerald-700"
          }`}
        >
          {isError ? <X size={14} /> : <Check size={14} />} {saveMsg}
        </div>
      )}
      {isError && (
        <button
          type="button"
          onClick={handleCopyDay}
          className="w-full text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl"
        >
          Copiar dados deste dia (backup)
        </button>
      )}
    </div>
  );
}

function Historico({ sortedDates, entries, onEdit, onDelete, onExport, onImport, showExport, showImport, importText, setImportText, handleImportAll, ioMsg, exportText }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="text-xs tracking-wider uppercase text-teal-700 font-bold mb-2">Backup manual</div>
        <p className="text-xs text-slate-500 mb-3">
          Os dias ficam salvos neste navegador automaticamente. Use o backup para levar o histórico para outro
          aparelho, ou para guardar uma cópia de segurança.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExport}
            className="flex-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 py-2 rounded-md"
          >
            Exportar backup
          </button>
          <button
            type="button"
            onClick={onImport}
            className="flex-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 py-2 rounded-md"
          >
            Importar backup
          </button>
        </div>
        {ioMsg && <div className="mt-2 text-xs font-medium text-teal-700">{ioMsg}</div>}
        {showExport && (
          <textarea
            readOnly
            value={exportText}
            onFocus={(e) => e.target.select()}
            className="w-full mt-3 h-32 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md p-2"
          />
        )}
        {showImport && (
          <div className="mt-3 space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole aqui o texto do backup exportado anteriormente"
              className="w-full h-32 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md p-2"
            />
            <button
              type="button"
              onClick={handleImportAll}
              className="w-full text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 py-2 rounded-md"
            >
              Importar
            </button>
          </div>
        )}
      </div>

      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          Nenhum dia lançado neste período.
        </div>
      ) : (
        sortedDates.map((date) => {
        const entry = entries[date];
        const info = dateInfo(date);
        const filledRoles = ROLES.filter((r) => entry[r.key] && entry[r.key].trim());
        return (
          <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{info.display}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    info.isWeekend ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {info.dowName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onEdit(date)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded">
                  <Pencil size={14} />
                </button>
                {confirmDelete === date ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(date);
                        setConfirmDelete(null);
                      }}
                      className="text-xs font-semibold text-white bg-rose-600 px-2 py-1 rounded"
                    >
                      Excluir
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="p-1 text-slate-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(date)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 text-sm space-y-1.5">
              {filledRoles.length === 0 && (!entry.utiA || entry.utiA.length === 0) ? (
                <div className="text-slate-300 italic text-xs">Sem lançamentos.</div>
              ) : (
                <>
                  {filledRoles.map((r) => (
                    <div key={r.key} className="flex justify-between">
                      <span className="text-slate-500">
                        {r.label} <span className="text-slate-300">({r.horas}h)</span>
                      </span>
                      <span className="font-medium text-slate-800">{entry[r.key]}</span>
                    </div>
                  ))}
                  {(entry.utiA || []).length > 0 && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                      <div className="text-xs tracking-wide uppercase text-slate-400 font-semibold mb-1">UTI A</div>
                      {entry.utiA.map((row) => (
                        <div key={row.id} className="flex justify-between">
                          <span className="text-slate-500">
                            {row.turno || "—"} {!isNaN(rowHours(row)) ? <span className="text-slate-300">({rowHours(row)}h)</span> : null}
                          </span>
                          <span className="font-medium text-slate-800">{row.pessoa}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
        })
      )}
    </div>
  );
}

function Resumo({ summaryRows, grandTotal, rateWeekday, rateWeekend, setRateWeekday, setRateWeekend }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="text-xs tracking-wider uppercase text-teal-700 font-bold mb-3">Valor por hora (estimativa)</div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400">Semana (R$/h)</label>
            <input
              type="number"
              value={rateWeekday}
              onChange={(e) => setRateWeekday(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400">Fim de semana (R$/h)</label>
            <input
              type="number"
              value={rateWeekend}
              onChange={(e) => setRateWeekend(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-teal-700 rounded-xl shadow-sm p-4 text-white">
        <div className="text-xs tracking-wider uppercase text-teal-200 font-bold mb-1">Total geral do período</div>
        <div className="flex items-end justify-between">
          <span className="text-sm text-teal-100">{grandTotal.horas}h no total</span>
          <span className="text-2xl font-bold tabular-nums">{fmtMoney(grandTotal.valor)}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs tracking-wider uppercase text-teal-700 font-bold">
          Total por pessoa
        </div>
        {summaryRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Sem dados lançados neste período.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summaryRows.map((row) => (
              <div key={row.pessoa} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{row.pessoa}</span>
                  <span className="font-bold text-slate-800 tabular-nums">{fmtMoney(row.valor)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
                  <span>Semana: {row.semana}h</span>
                  <span>·</span>
                  <span>Fim de semana: {row.fds}h</span>
                  <span>·</span>
                  <span className="font-medium text-slate-500">Total: {row.total}h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 px-1">
        Cálculo simples: sábado e domingo = fim de semana. Feriados e regras especiais (ex: sexta à noite, taxas fixas) não são
        aplicados automaticamente aqui — ajuste as taxas acima se precisar de uma estimativa rápida.
      </p>
    </div>
  );
}
