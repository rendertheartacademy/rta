import { Assignment, User } from "./types";

export const COLORS = {
  black: '#000000',
  darkGray: '#121212',
  panelGray: '#1E1E1E',
  borderGray: '#333333',
  primaryRed: '#c7023a', // Updated RTA Red
  white: '#FFFFFF',
  textMuted: '#A1A1AA'
};

// 5 Master Class, 5 Viz Class, 1 Teacher
export const MOCK_USERS: User[] = [
  // --- TEACHER ---
  { id: 't1', name: 'Master Instructor', email: 'instructor@rta.edu', password: '1234', role: 'TEACHER', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Instructor' },
  
  // --- MASTER CLASS STUDENTS ---
  { 
    id: 'm1', name: 'Liam Kyaw', email: 'liam.m@rta.edu', password: '1234', role: 'STUDENT', classType: 'MASTER_CLASS', 
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam',
    interiorRefUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop',
    exteriorRefUrl: 'https://images.unsplash.com/photo-1600596542815-27bf9095d720?q=80&w=2670&auto=format&fit=crop',
    progress: {
        INTERIOR: ['BOX_MODELING', 'SCENE_SETUP'], // Liam has unlocked scene setup
        EXTERIOR: ['BOX_MODELING']
    }
  },
  { 
    id: 'm2', name: 'Sophia Chen', email: 'sophia.m@rta.edu', password: '1234', role: 'STUDENT', classType: 'MASTER_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
    interiorRefUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000',
    exteriorRefUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000',
    progress: { INTERIOR: ['BOX_MODELING'], EXTERIOR: ['BOX_MODELING'] }
  },
  { 
    id: 'm3', name: 'Noah Kim', email: 'noah.m@rta.edu', password: '1234', role: 'STUDENT', classType: 'MASTER_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah',
    interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
    exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
    progress: { INTERIOR: ['BOX_MODELING'], EXTERIOR: ['BOX_MODELING'] }
  },
  { 
    id: 'm4', name: 'Emma Wilson', email: 'emma.m@rta.edu', password: '1234', role: 'STUDENT', classType: 'MASTER_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
    exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
    progress: { INTERIOR: ['BOX_MODELING'], EXTERIOR: ['BOX_MODELING'] }
  },
  { 
    id: 'm5', name: 'Lucas Silva', email: 'lucas.m@rta.edu', password: '1234', role: 'STUDENT', classType: 'MASTER_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
    interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
    exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
    progress: { INTERIOR: ['BOX_MODELING'], EXTERIOR: ['BOX_MODELING'] }
  },

  // --- VIZ CLASS STUDENTS ---
  { 
    id: 'v1', name: 'Thandar Htun', email: 'thandar.v@rta.edu', password: '1234', role: 'STUDENT', classType: 'VIZ_CLASS', 
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thandar',
    // New user - needs onboarding
    interiorRefUrl: undefined,
    exteriorRefUrl: undefined,
    progress: { INTERIOR: ['COLOR_RENDERING'], EXTERIOR: ['COLOR_RENDERING'] }
  },
  { 
      id: 'v2', name: 'Oliver Brown', email: 'oliver.v@rta.edu', password: '1234', role: 'STUDENT', classType: 'VIZ_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
      interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
      exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
      progress: { INTERIOR: ['COLOR_RENDERING'], EXTERIOR: ['COLOR_RENDERING'] }
  },
  { 
      id: 'v3', name: 'Ava Patel', email: 'ava.v@rta.edu', password: '1234', role: 'STUDENT', classType: 'VIZ_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
      interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
      exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
      progress: { INTERIOR: ['COLOR_RENDERING'], EXTERIOR: ['COLOR_RENDERING'] }
  },
  { 
      id: 'v4', name: 'Elijah Davis', email: 'elijah.v@rta.edu', password: '1234', role: 'STUDENT', classType: 'VIZ_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elijah',
      interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
      exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
      progress: { INTERIOR: ['COLOR_RENDERING'], EXTERIOR: ['COLOR_RENDERING'] }
  },
  { 
      id: 'v5', name: 'Mia Thompson', email: 'mia.v@rta.edu', password: '1234', role: 'STUDENT', classType: 'VIZ_CLASS', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
      interiorRefUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
      exteriorRefUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2000',
      progress: { INTERIOR: ['COLOR_RENDERING'], EXTERIOR: ['COLOR_RENDERING'] }
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  // Sophia - Master Class - Box Modeling
  {
    id: 'a1_v1',
    studentId: 'm2', // Sophia
    studentMessage: 'Initial blockout of the scene.',
    week: 1,
    category: 'BOX_MODELING',
    referenceImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000', // Sophia's Int Ref
    renderImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2666&auto=format&fit=crop',
    status: 'REJECTED',
    submissionDate: '2023-10-25',
    feedback: [
      {
        id: 'f1',
        teacherId: 't1',
        type: 'REJECT',
        message: 'Proportions on the main massing are off. Check the height relative to the human scale.',
        date: '2023-10-26'
      }
    ]
  },
  // Sophia - Master Class - Box Modeling (Fix)
  {
    id: 'a1_v2',
    studentId: 'm2', // Sophia
    studentMessage: 'Fixed proportions.',
    week: 1,
    category: 'BOX_MODELING',
    referenceImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000',
    renderImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2000&auto=format&fit=crop',
    status: 'PENDING',
    submissionDate: '2023-10-27',
  },
  // Liam - Master Class - Scene Setup
  {
    id: 'a2',
    studentId: 'm1',
    studentMessage: 'Cameras and basic lighting rig.',
    week: 1,
    category: 'SCENE_SETUP',
    referenceImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop',
    renderImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2000&auto=format&fit=crop',
    status: 'SUBMITTED',
    submissionDate: '2023-10-27',
  },
  // Oliver - Viz Class - Color Rendering
  {
    id: 'a3',
    studentId: 'v2',
    studentMessage: 'Testing color palettes.',
    week: 1,
    category: 'COLOR_RENDERING',
    referenceImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2000',
    renderImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2574&auto=format&fit=crop',
    status: 'APPROVED',
    submissionDate: '2023-10-28',
    feedback: [
        {
          id: 'f2',
          teacherId: 't1',
          type: 'APPROVE',
          message: 'Excellent warmth in the highlights.',
          date: '2023-10-29'
        }
      ]
  }
];