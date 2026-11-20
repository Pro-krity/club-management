import { Check, Copy, KeyRound, Link2 } from 'lucide-react';
import { useState } from 'react';
import type { SchemaData } from '../types';

interface DatabaseDesignViewProps {
  schema: SchemaData | null;
  loading: boolean;
}

const ENTITY_NOTES: Record<string, { role: string; relationships: string[] }> = {
  students: {
    role: 'Master University Student Entity (3NF)',
    relationships: [
      '1:N -> club_applications (a student can apply to multiple clubs)',
      'M:N <-> clubs resolved through club_members',
      'M:N <-> clubs (governance) resolved through club_admins',
    ],
  },
  clubs: {
    role: 'Chartered BAUST Campus Organization Entity',
    relationships: [
      '1:N -> club_applications (receives student intake applications)',
      '1:N -> club_members (maintains active/alumni member roster)',
      '1:N -> club_admins (governed by assigned student executives)',
    ],
  },
  club_applications: {
    role: 'Transactional Intake & Approval Workflow Entity',
    relationships: [
      'N:1 -> students(student_id) ON DELETE CASCADE',
      'N:1 -> clubs(club_id) ON DELETE CASCADE',
      'N:1 -> club_admins(admin_id) ON DELETE SET NULL (audits reviewer)',
      'Partial UNIQUE index prevents duplicate pending apps per (student_id, club_id)',
    ],
  },
  club_members: {
    role: 'Associative Junction Entity (Student <-> Club Membership)',
    relationships: [
      'N:1 -> students(student_id) ON DELETE CASCADE',
      'N:1 -> clubs(club_id) ON DELETE CASCADE',
      'Composite UNIQUE(student_id, club_id) prevents duplicate enrollments',
    ],
  },
  club_admins: {
    role: 'Associative Governance & RBAC Entity',
    relationships: [
      'N:1 -> students(student_id) ON DELETE CASCADE',
      'N:1 -> clubs(club_id) ON DELETE CASCADE',
      'Composite UNIQUE(student_id, club_id) enforces one admin role per student per club',
    ],
  },
};

export function DatabaseDesignView({ schema, loading }: DatabaseDesignViewProps) {
  const [selectedTable, setSelectedTable] = useState<string>('students');
  const [copied, setCopied] = useState(false);

  if (loading && !schema) {
    return <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />;
  }

  if (!schema) return null;

  const activeTable = schema.tables.find((t) => t.name === selectedTable) ?? schema.tables[0];

  async function handleCopySql() {
    if (!schema) return;
    try {
      await navigator.clipboard.writeText(schema.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored if blocked in iframe
    }
  }

  return (
    <div className="space-y-8">
      {/* Interactive Entity-Relationship Diagram */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Relational Entity-Relationship Diagram (3NF)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any entity block below to inspect its live SQLite columns, keys, and foreign-key constraints.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">5 Tables · Foreign Keys Enforced</span>
        </div>

        {/* Visual Architecture Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left Master Entity: STUDENT */}
          <div className="space-y-4">
            {schema.tables
              .filter((t) => t.name === 'students')
              .map((table) => (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    selectedTable === table.name
                      ? 'border-emerald-800 bg-emerald-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{table.name}</span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">{table.rowCount} rows</span>
                  </div>
                  <div className="mt-2.5 space-y-1 font-mono text-xs text-slate-600">
                    {table.columns.slice(0, 6).map((col) => (
                      <div key={col.name} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {col.pk ? 'PK ' : ''}
                          {col.name}
                        </span>
                        <span className="text-slate-400">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
          </div>

          {/* Center Associative & Transactional Entities */}
          <div className="space-y-4">
            {['club_applications', 'club_members', 'club_admins'].map((name) => {
              const table = schema.tables.find((t) => t.name === name);
              if (!table) return null;
              return (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    selectedTable === table.name
                      ? 'border-emerald-800 bg-emerald-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{table.name}</span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">{table.rowCount} rows</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500">
                    <span>students (1:N)</span>
                    <span aria-hidden="true">·</span>
                    <span>clubs (1:N)</span>
                    {table.name === 'club_applications' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>club_admins (reviewer)</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Master Entity: CLUB */}
          <div className="space-y-4">
            {schema.tables
              .filter((t) => t.name === 'clubs')
              .map((table) => (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    selectedTable === table.name
                      ? 'border-emerald-800 bg-emerald-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{table.name}</span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">{table.rowCount} rows</span>
                  </div>
                  <div className="mt-2.5 space-y-1 font-mono text-xs text-slate-600">
                    {table.columns.slice(0, 6).map((col) => (
                      <div key={col.name} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {col.pk ? 'PK ' : ''}
                          {col.name}
                        </span>
                        <span className="text-slate-400">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* Column Inspector + DDL Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Selected Entity Details */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-mono text-base font-semibold text-slate-900">{activeTable.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{ENTITY_NOTES[activeTable.name]?.role}</p>
            </div>
            <span className="font-mono text-xs font-medium text-emerald-800 tabular-nums">
              {activeTable.rowCount} live records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Column</th>
                  <th className="py-2.5 px-5">Type</th>
                  <th className="py-2.5 px-5">Constraints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                {activeTable.columns.map((col) => {
                  const fk = activeTable.foreignKeys.find((f) => f.from === col.name);
                  return (
                    <tr key={col.name}>
                      <td className="py-2.5 px-5 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          {col.pk === 1 && <KeyRound className="h-3 w-3 text-amber-600" />}
                          {fk && <Link2 className="h-3 w-3 text-emerald-700" />}
                          <span>{col.name}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-5 text-slate-600">{col.type}</td>
                      <td className="py-2.5 px-5 text-slate-500">
                        {[
                          col.pk === 1 ? 'PRIMARY KEY' : '',
                          col.notnull === 1 ? 'NOT NULL' : '',
                          fk ? `FK -> ${fk.table}(${fk.to})` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'NULLABLE'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4 space-y-1.5">
            <div className="text-xs font-semibold text-slate-700">Integrity &amp; Cardinality Rules</div>
            <ul className="space-y-1 text-xs text-slate-600">
              {(ENTITY_NOTES[activeTable.name]?.relationships ?? []).map((rel) => (
                <li key={rel} className="font-mono text-[11px]">
                  {rel}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SQL DDL Viewer */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">SQLite Schema DDL</h3>
              <p className="text-xs text-slate-500 mt-0.5">Normalized relational table definitions</p>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-5 text-xs font-mono text-slate-700 bg-slate-50 overflow-x-auto max-h-[480px] leading-relaxed flex-1">
            {schema.sql}
          </pre>
        </div>
      </section>
    </div>
  );
}
