import { Plus, Search, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Student } from '../types';
import { Modal } from './Modal';

interface StudentsViewProps {
  students: Student[];
  loading: boolean;
  isAdminMode: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const DEPARTMENTS = ['ALL', 'CSE', 'EEE', 'ME', 'CE', 'IPE', 'BBA', 'English'] as const;

export function StudentsView({ students, loading, isAdminMode, onRefresh, onNotify }: StudentsViewProps) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('ALL');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const [form, setForm] = useState({
    baust_id: '',
    full_name: '',
    email: '',
    phone: '',
    department: 'CSE',
    batch: '18th',
    semester: '1st Semester',
  });

  const filtered = students.filter((s) => {
    const okDept = department === 'ALL' || s.department === department;
    const q = search.trim().toLowerCase();
    const okSearch =
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.baust_id.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);
    return okDept && okSearch;
  });

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createStudent(form);
      setRegisterOpen(false);
      setForm({
        baust_id: '',
        full_name: '',
        email: '',
        phone: '',
        department: 'CSE',
        batch: '18th',
        semester: '1st Semester',
      });
      await onRefresh();
      onNotify('Student registered in the BAUST registry.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to register student', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteStudent(deleteTarget.student_id);
      setDeleteTarget(null);
      await onRefresh();
      onNotify(`Removed ${deleteTarget.full_name} and cascaded linked club records.`, 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to delete student', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setDepartment(dept)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                department === dept ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {dept === 'ALL' ? 'All Depts' : dept}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, or email..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-800 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 px-5 whitespace-nowrap">BAUST ID</th>
                <th className="py-3 px-5 whitespace-nowrap">Student Name</th>
                <th className="py-3 px-5 whitespace-nowrap">Department &amp; Batch</th>
                <th className="py-3 px-5 whitespace-nowrap">Contact</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">Clubs</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">Admin Roles</th>
                {isAdminMode && <th className="py-3 px-5 text-right whitespace-nowrap">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Loading student registry...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {s.baust_id}
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-900 whitespace-nowrap">{s.full_name}</td>
                    <td className="py-3 px-5 text-xs text-slate-600 whitespace-nowrap">
                      <span>{s.department}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span className="tabular-nums">{s.batch} Batch</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span>{s.semester}</span>
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-600 whitespace-nowrap">
                      <div>{s.email}</div>
                      {s.phone && <div className="font-mono text-[11px] text-slate-400 tabular-nums">{s.phone}</div>}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {s.active_clubs_count ?? 0}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {s.admin_roles_count ?? 0}
                    </td>
                    {isAdminMode && (
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          aria-label={`Remove ${s.full_name}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Student Modal */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register BAUST Student"
        subtitle="Creates a primary student entity record."
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">BAUST Student ID</label>
              <input
                required
                value={form.baust_id}
                onChange={(e) => setForm({ ...form, baust_id: e.target.value })}
                placeholder="e.g. 240101088"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Arifur Rahman"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">University Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name.dept@baust.edu.bd"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone (Optional)</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="017XX-XXXXXX"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              >
                <option value="CSE">CSE</option>
                <option value="EEE">EEE</option>
                <option value="ME">ME</option>
                <option value="CE">CE</option>
                <option value="IPE">IPE</option>
                <option value="BBA">BBA</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Batch</label>
              <input
                required
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                placeholder="e.g. 18th"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
              <input
                required
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                placeholder="e.g. 1st Semester"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Student Removal"
        subtitle="ON DELETE CASCADE will remove linked applications, club memberships, and admin roles."
        maxWidthClass="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900">{deleteTarget.full_name}</strong> (
              <span className="font-mono">{deleteTarget.baust_id}</span>) from the student registry?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 cursor-pointer"
              >
                Remove Student
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
