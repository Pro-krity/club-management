import { ArrowRight, CheckCircle2, Clock, Database, UserPlus, XCircle } from 'lucide-react';
import type { ActiveTab, OverviewData } from '../types';
import { ClubImage } from './ClubImage';

interface OverviewViewProps {
  data: OverviewData | null;
  loading: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onOpenApplyModal: (clubId?: number) => void;
}

export function OverviewView({ data, loading, onNavigate, onOpenApplyModal }: OverviewViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { counts, clubStats, recentApplications, departmentBreakdown } = data;

  return (
    <div className="space-y-8">
      {/* Hero Split Section (2-column items-stretch) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-7 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-800">
              Bangladesh Army University of Science and Technology · Saidpur
            </p>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Centralized Campus Club Registry &amp; Membership Portal
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-2xl">
              Manage student club applications, executive committee appointments, and active wing memberships across
              BAUST technical, academic, cultural, and sports societies from one relational database.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenApplyModal()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Apply to a Club</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Review Applications</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('database')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="h-4 w-4" />
              <span>Inspect Schema &amp; ERD</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden min-h-[220px]">
          <ClubImage
            src="/assets/aistudio/image_09278975.png"
            alt="BAUST Saidpur Academic Building"
            code="BAUST"
            className="w-full h-full lg:h-full max-h-[300px] lg:max-h-none"
          />
        </div>
      </section>

      {/* Full-width 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Registered Students</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">{counts.students}</span>
            <span className="text-xs text-slate-500">{departmentBreakdown.length} departments</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Chartered Clubs</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">{counts.clubs}</span>
            <span className="text-xs text-emerald-800 font-medium tabular-nums">
              {counts.recruitingClubs} recruiting
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Pending Applications</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {counts.pendingApplications}
            </span>
            <span className="text-xs text-amber-700 font-medium tabular-nums">
              {counts.totalApplications} total submitted
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Active Memberships</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {counts.activeMembers}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">{counts.clubAdmins} club admins</span>
          </div>
        </div>
      </section>

      {/* Main Two-Column Operational Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Club Roster Summary */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Active Campus Clubs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Membership distribution and intake status</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('clubs')}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Directory
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {clubStats.map((club) => (
              <div key={club.club_id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">{club.code}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-sm font-medium text-slate-900 truncate">{club.name}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    <span>{club.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Advisor: {club.advisor_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {club.member_count ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500">members</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-amber-700 tabular-nums">
                      {club.pending_count ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500">pending</div>
                  </div>
                  {club.is_recruiting ? (
                    <button
                      type="button"
                      onClick={() => onOpenApplyModal(club.club_id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Apply
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 whitespace-nowrap w-[58px] text-center">Closed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Applications Queue */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Application Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest student intake requests</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Manage Queue
            </button>
          </div>

          {recentApplications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No applications recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentApplications.map((app) => (
                <div key={app.application_id} className="px-6 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{app.student_name}</div>
                    <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono tabular-nums">{app.baust_id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.department}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{app.club_code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.application_subject}</span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {app.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending</span>
                      </span>
                    )}
                    {app.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approved</span>
                      </span>
                    )}
                    {app.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
