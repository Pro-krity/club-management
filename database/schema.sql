-- BAUST Club Management System - Relational Database Schema (3NF)
-- Entities: students, clubs, club_applications, club_members, club_admins

PRAGMA foreign_keys = ON;

-- 1. STUDENT ENTITY
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  baust_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. CLUB ENTITY
CREATE TABLE IF NOT EXISTS clubs (
  club_id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Technical', 'Cultural', 'Academic', 'Media', 'Sports')),
  advisor_name TEXT NOT NULL,
  room_location TEXT NOT NULL,
  founded_year INTEGER NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  is_recruiting INTEGER NOT NULL DEFAULT 1 CHECK (is_recruiting IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. CLUB_ADMIN ENTITY (Weak/Associative Entity: Student <-> Club with Governance Permissions)
CREATE TABLE IF NOT EXISTS club_admins (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  admin_role TEXT NOT NULL,
  can_approve_apps INTEGER NOT NULL DEFAULT 1 CHECK (can_approve_apps IN (0, 1)),
  can_manage_members INTEGER NOT NULL DEFAULT 1 CHECK (can_manage_members IN (0, 1)),
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
  UNIQUE (student_id, club_id)
);

-- 4. CLUB_APPLICATION ENTITY (Transactional Entity: Student -> Club Review Workflow)
CREATE TABLE IF NOT EXISTS club_applications (
  application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  application_subject TEXT NOT NULL DEFAULT 'Applying to join as a club member',
  motivation TEXT NOT NULL,
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_admin_id INTEGER,
  review_note TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES club_admins(admin_id) ON DELETE SET NULL
);

-- Prevent duplicate pending applications from the same student to the same club
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_application
  ON club_applications(student_id, club_id)
  WHERE status = 'pending';

-- 5. CLUB_MEMBER ENTITY (Associative M:N Junction Entity: Enrolled Student <-> Club)
CREATE TABLE IF NOT EXISTS club_members (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  designation TEXT NOT NULL DEFAULT 'General Member',
  wing TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'alumni', 'suspended')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
  UNIQUE (student_id, club_id)
);

-- Performance Indexes on Foreign Keys & Frequent Filters
CREATE INDEX IF NOT EXISTS idx_applications_club_status ON club_applications(club_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_student ON club_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_members_club_status ON club_members(club_id, status);
CREATE INDEX IF NOT EXISTS idx_admins_club ON club_admins(club_id);
