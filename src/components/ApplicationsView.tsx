import { CheckCircle2, Clock, Plus, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Club, ClubAdmin, ClubApplication } from '../types';
import { Modal } from './Modal';

interface ApplicationsViewProps {
  applications: ClubApplication[];
  clubs: Club[];
  admins: ClubAdmin[];
  loading: boolean;
  isAdminMode: boolean;
  onRefresh: () => Promise<void>;
  onOpenApplyModal: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const STATUS_TABS = [
  { id: 'all', label: 'All Applications' },
  { id: 'pending', label: 'Pending Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const;

export function ApplicationsView({
  applications,
  clubs,
  admins,
  loading,
  isAdminMode,
  onRefresh,
  onOpenApplyModal,
  onNotify,
}: ApplicationsViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [reviewTarget, setReviewTarget] = useState<ClubApplication | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewAdminId, setReviewAdminId] = useState<string>('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = applications.filter((a) => {
    const okStatus = statusFilter === 'all' || a.status === statusFilter;
    const okClub = clubFilter === 'all' || String(a.club_id) === clubFilter;
    return okStatus && okClub;
  });

  function openReview(app: ClubApplication, decision: 'approved' | 'rejected') {
    const clubAdmins = admins.filter((ad) => ad.club_id === app.club_id && ad.can_approve_apps === 1);
    setReviewTarget(app);
    setReviewDecision(decision);
    setReviewAdminId(clubAdmins[0] ? String(clubAdmins[0].admin_id) : '');
    setReviewNote(
      decision === 'approved'
        ? 'Approved to join as a club member.'
        : 'Application declined for the current intake cycle.',
    );
  }

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await api.reviewApplication(reviewTarget.application_id, {
        status: reviewDecision,
        reviewed_by_admin_id: reviewAdminId ? Number(reviewAdminId) : null,
        review_note: reviewNote,
      });
      setReviewTarget(null);
      await onRefresh();
      onNotify(
        reviewDecision === 'approved'
          ? `Approved ${reviewTarget.student_name} and automatically enrolled into ${reviewTarget.club_code}.`
          : `Application from ${reviewTarget.student_name} marked as rejected.`,
        'success',
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to process review', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const eligibleAdmins = reviewTarget
    ? admins.filter((ad) => ad.club_id === reviewTarget.club_id && ad.can_approve_apps === 1)
    : [];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            aria-label="Filter applications by club"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-800 focus:outline-none"
          >
            <option value="all">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.club_id} value={String(c.club_id)}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenApplyModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Application</span>
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && applications.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No applications in this queue</p>
            <p className="mt-1 text-xs text-slate-500">
              Submit a new student application or adjust the status/club filters above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((app) => (
              <div
                key={app.application_id}
                className="p-5 sm:px-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      APP-{String(app.application_id).padStart(3, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-800">{app.club_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{app.application_subject}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{app.applied_at.slice(0, 10)}</span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{app.student_name}</h3>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {app.baust_id} · {app.department} ({app.batch} Batch)
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">{app.motivation}</p>

                  {app.experience && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Prior Experience:</span> {app.experience}
                    </p>
                  )}

                  {app.status !== 'pending' && app.review_note && (
                    <div className="pt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        Review Note{app.reviewer_name ? ` (${app.reviewer_name})` : ''}:
                      </span>{' '}
                      {app.review_note}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                  <div>
                    {app.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending Review</span>
                      </span>
                    )}
                    {app.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approved &amp; Enrolled</span>
                      </span>
                    )}
                    {app.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  {isAdminMode && app.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openReview(app, 'approved')}
                        className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Approve &amp; Enroll
                      </button>
                      <button
                        type="button"
                        onClick={() => openReview(app, 'rejected')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={reviewDecision === 'approved' ? 'Approve Application & Enroll Member' : 'Reject Club Application'}
        subtitle={
          reviewDecision === 'approved'
            ? 'Updates club_applications and atomically inserts a row into club_members.'
            : 'Marks the application as rejected with an audit note.'
        }
      >
        {reviewTarget && (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
              <div className="font-semibold text-slate-900">
                {reviewTarget.student_name} ({reviewTarget.baust_id})
              </div>
              <div className="text-slate-600">
                <strong>{reviewTarget.club_name}</strong> · {reviewTarget.application_subject}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reviewing Club Admin</label>
              <select
                value={reviewAdminId}
                onChange={(e) => setReviewAdminId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              >
                {eligibleAdmins.length === 0 ? (
                  <option value="">System / Faculty Advisor Override</option>
                ) : (
                  eligibleAdmins.map((ad) => (
                    <option key={ad.admin_id} value={String(ad.admin_id)}>
                      {ad.student_name} ({ad.admin_role})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Review Note</label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reason for decision or onboarding instructions..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer ${
                  reviewDecision === 'approved' ? 'bg-emerald-900 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                {submitting
                  ? 'Processing...'
                  : reviewDecision === 'approved'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
