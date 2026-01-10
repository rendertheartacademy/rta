export type UserRole = 'STUDENT' | 'TEACHER';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl: string;
  classType?: 'MASTER_CLASS' | 'VIZ_CLASS';
  // Permanent References
  interiorRefUrl?: string;
  exteriorRefUrl?: string;
  // Manual Progress Tracking (List of unlocked categories per project)
  progress?: {
    INTERIOR: AssignmentCategory[];
    EXTERIOR: AssignmentCategory[];
  }
}

export type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// Updated Categories based on Class Type
export type AssignmentCategory = 
  | 'BOX_MODELING' 
  | 'SCENE_SETUP' 
  | 'COLOR_RENDERING' 
  | 'SHADERS' 
  | 'POSTPRODUCTION'
  | 'INTERIOR' // Legacy fallback
  | 'EXTERIOR'; // Legacy fallback

export interface Feedback {
  id: string;
  teacherId: string;
  message: string;
  date: string;
  type: 'REJECT' | 'APPROVE' | 'COMMENT';
}

export interface Assignment {
  id: string;
  studentId: string;
  // Removed title, replaced with message
  studentMessage: string; 
  week: number;
  category: AssignmentCategory;
  referenceImage: string;
  renderImage: string;
  status: AssignmentStatus;
  feedback?: Feedback[];
  submissionDate: string;
}

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}