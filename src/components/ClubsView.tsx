import { Plus, Search, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Club } from '../types';
import { ClubImage } from './ClubImage';
import { Modal } from './Modal';

interface ClubsViewProps {
  clubs: Club[];
  loading: boolean;
  isAdminMode: boolean;
  onRefresh: () => Promise<void>;
  onOpenApplyModal: (clubId: number) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const CATEGORIES = ['All', 'Technical', 'Academic', 'Cultural', 'Media', 'Sports'] as const;

export function ClubsView({
  clubs,
  loading,
  isAdminMode,
  onRefresh,
  onOpenApplyModal,
  onNotify,
}: ClubsViewProps) {
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'Technical',
    advisor_name: '',
    room_location: '',
    founded_year: '2026',
    description: '',
    is_recruiting: true,
  });

  const filtered = clubs.filter((club) => {
    const okCat = category === 'All' || club.category === category;
    const q = search.trim().toLowerCase();
    const okSearch =
      !q ||
      club.name.toLowerCase().includes(q) ||
      club.code.toLowerCase().includes(q) ||
      club.advisor_name.toLowerCase().includes(q);
    return okCat && okSearch;
  });

  async function handleToggleRecruiting(club: Club) {
    try {
      await api.updateClub(club.club_id, { is_recruiting: !club.is_recruiting });
      await onRefresh();
      onNotify(
        `${club.code} intake ${club.is_recruiting ? 'closed' : 'opened'} for student applications.`,
        'success',
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update club intake status', 'error');
    }
  }

  async function handleCreateClub(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createClub({
        ...form,
        founded_year: Number(form.founded_year) || 2026,
      });
      setCreateOpen(false);
      setForm({
        code: '',
        name: '',
        category: 'Technical',
        advisor_name: '',
        room_location: '',
        founded_year: '2026',
        description: '',
        is_recruiting: true,
      });
      await onRefresh();
      onNotify('New BAUST club chartered and persisted to database.', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not create club', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
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
              placeholder="Search clubs or advisors..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-800 focus:outline-none"
            />
          </div>

          {isAdminMode && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Charter Club</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      {loading && clubs.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-900">No clubs match your filter</p>
          <p className="mt-1 text-xs text-slate-500">Adjust your search query or select All categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((club) => (
            <article
              key={club.club_id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/10] w-full overflow-hidden border-b border-slate-100">
                  <ClubImage
                    src={club.image_url}
                    alt={`${club.name} campus activity`}
                    code={club.code}
                    className="w-full h-full"
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono font-semibold text-slate-700">{club.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{club.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Est. {club.founded_year}</span>
                    </div>
                    <span
                      className={`shrink-0 font-medium ${
                        club.is_recruiting ? 'text-emerald-800' : 'text-slate-400'
                      }`}
                    >
                      {club.is_recruiting ? 'Recruiting' : 'Intake Closed'}
                    </span>
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-slate-900 leading-snug">{club.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">{club.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between gap-2">
                      <span>Faculty Advisor</span>
                      <span className="font-medium text-slate-700 text-right">{club.advisor_name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Location</span>
                      <span className="text-slate-700 text-right">{club.room_location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                  <span>
                    <strong className="font-mono text-slate-900">{club.member_count ?? 0}</strong> members
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-slate-900">{club.admin_count ?? 0}</strong> admins
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isAdminMode && (
                    <button
                      type="button"
                      onClick={() => handleToggleRecruiting(club)}
                      title="Toggle recruitment status"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{club.is_recruiting ? 'Close' : 'Open'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!club.is_recruiting}
                    onClick={() => onOpenApplyModal(club.club_id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      club.is_recruiting
                        ? 'bg-emerald-900 text-white hover:bg-emerald-800 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Charter New BAUST Club"
        subtitle="Inserts a new record into the clubs table."
      >
        <form onSubmit={handleCreateClub} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Club Code</label>
              <input
                required
                maxLength={10}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. BAEC"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Official Club Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. BAUST Aerospace & Rocketry Club"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              >
                <option value="Technical">Technical</option>
                <option value="Academic">Academic</option>
                <option value="Cultural">Cultural</option>
                <option value="Media">Media</option>
                <option value="Sports">Sports</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Founded Year</label>
              <input
                type="number"
                required
                min={2015}
                max={2030}
                value={form.founded_year}
                onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Faculty Advisor</label>
              <input
                required
                value={form.advisor_name}
                onChange={(e) => setForm({ ...form, advisor_name: e.target.value })}
                placeholder="e.g. Dr. Anisur Rahman"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Room / Lab Location</label>
              <input
                required
                value={form.room_location}
                onChange={(e) => setForm({ ...form, room_location: e.target.value })}
                placeholder="e.g. Academic Building 2, 401"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Charter Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Summarize the club's mission, workshops, and student activities..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_recruiting}
              onChange={(e) => setForm({ ...form, is_recruiting: e.target.checked })}
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
            />
            <span>Open for student applications immediately</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Create Club'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
