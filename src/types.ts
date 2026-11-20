export interface Student {
  student_id: number;
  baust_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string;
  batch: string;
  semester: string;
  created_at: string;
  active_clubs_count?: number;
  admin_roles_count?: number;
  pending_apps_count?: number;
}

export interface Club {
  club_id: number;
  code: string;
  name: string;
  category: 'Technical' | 'Cultural' | 'Academic' | 'Media' | 'Sports';
  advisor_name: string;
  room_location: string;
  founded_year: number;
  description: string;
  image_url: string | null;
  is_recruiting: number;
  created_at: string;
  member_count?: number;
  pending_count?: number;
  admin_count?: number;
}

export interface ClubApplication {
  application_id: number;
  student_id: number;
  club_id: number;
  application_subject: string;
  motivation: string;
  experience: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_admin_id: number | null;
  review_note: string | null;
  applied_at: string;
  reviewed_at: string | null;
  baust_id: string;
  student_name: string;
  student_email?: string;
  department: string;
  batch: string;
  club_code: string;
  club_name: string;
  reviewer_name?: string | null;
  reviewer_role?: string | null;
}

export interface ClubMember {
  member_id: number;
  student_id: number;
  club_id: number;
  designation: string;
  wing: string;
  status: 'active' | 'alumni' | 'suspended';
  joined_at: string;
  baust_id: string;
  student_name: string;
  student_email: string;
  department: string;
  batch: string;
  club_code: string;
  club_name: string;
  is_admin?: number;
  admin_role?: string | null;
}

export interface ClubAdmin {
  admin_id: number;
  student_id: number;
  club_id: number;
  admin_role: string;
  can_approve_apps: number;
  can_manage_members: number;
  assigned_at: string;
  baust_id: string;
  student_name: string;
  student_email: string;
  department: string;
  batch: string;
  club_code: string;
  club_name: string;
}

export interface OverviewData {
  counts: {
    students: number;
    clubs: number;
    recruitingClubs: number;
    pendingApplications: number;
    totalApplications: number;
    activeMembers: number;
    clubAdmins: number;
  };
  departmentBreakdown: Array<{ department: string; count: number }>;
  clubStats: Club[];
  recentApplications: ClubApplication[];
}

export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface TableForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
}

export interface SchemaTableDetail {
  name: string;
  rowCount: number;
  columns: TableColumnInfo[];
  foreignKeys: TableForeignKeyInfo[];
}

export interface SchemaData {
  sql: string;
  tables: SchemaTableDetail[];
}

export type ActiveTab = 'overview' | 'clubs' | 'students' | 'applications' | 'members' | 'database';
