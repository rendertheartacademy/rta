import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LogOut, 
  Upload, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  GraduationCap, 
  Armchair, 
  Building2, 
  AlertCircle, 
  Globe, 
  Lock, 
  Edit2, 
  ArrowRight, 
  LogIn, 
  X, 
  Unlock, 
  PlusCircle,
  Camera,
  Layers,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import ComparisonViewer from './components/ComparisonViewer';
import { Assignment, AssignmentStatus, AssignmentCategory, Feedback, User } from './types';
import { supabase } from './supabaseClient';

// --- SUB-COMPONENTS ---

const NavIcon = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick} 
    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all mb-3 group relative
      ${active ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'}`}
  >
    <Icon size={18} />
    {/* Tooltip */}
    <span className="absolute left-14 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-medium tracking-wide">
        {label}
    </span>
  </button>
);

const StepIndicator = ({ step, current, label }: { step: number, current: number, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${current >= step ? 'bg-[#c7023a] text-white shadow-[0_0_10px_#c7023a]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>{current > step ? <CheckCircle size={12} /> : step}</div>
    <span className={`text-xs font-medium tracking-wide ${current >= step ? 'text-white' : 'text-zinc-600'}`}>{label}</span>
  </div>
);

const StatusBadge = ({ status }: { status: AssignmentStatus }) => {
  const styles = { 
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
      SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/20', 
      APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 
      REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20' 
  };
  return <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${styles[status]}`}>{status}</span>;
};

// --- CURRICULUM DEFINITIONS ---
const CURRICULUM = {
    MASTER_CLASS: ['BOX_MODELING', 'SCENE_SETUP'] as AssignmentCategory[],
    VIZ_CLASS: ['COLOR_RENDERING', 'SHADERS', 'POSTPRODUCTION'] as AssignmentCategory[]
};

function App() {
  // --- Global State ---
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [assignments, setAssignments] = useState<Assignment[]>([]); 
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SUBMIT' | 'COMMUNITY' | 'PROFILE'>('DASHBOARD');
  
  // --- Auth State ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Workflow State ---
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [communityTab, setCommunityTab] = useState<'MASTER' | 'VIZ'>('MASTER');
  
  // --- Teacher State ---
  const [teacherTab, setTeacherTab] = useState<'MASTER' | 'VIZ'>('MASTER');
  const [teacherSelectedStudentId, setTeacherSelectedStudentId] = useState<string | null>(null);

  // --- Student View State ---
  const [studentProjectView, setStudentProjectView] = useState<'INTERIOR' | 'EXTERIOR'>('INTERIOR');

  // --- UI State ---
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [viewingGroupParams, setViewingGroupParams] = useState<{ studentId: string, category: AssignmentCategory, referenceImage: string } | null>(null);
  const [viewingVersionIndex, setViewingVersionIndex] = useState(0);

  // --- Submission Form State ---
  const [selectedProjectForSubmit, setSelectedProjectForSubmit] = useState<'INTERIOR' | 'EXTERIOR' | null>(null);
  const [detectedStep, setDetectedStep] = useState<AssignmentCategory | null>(null);
  
  // CHANGED: Support multiple uploads
  const [uploadRenders, setUploadRenders] = useState<string[]>([]);
  
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submitStep, setSubmitStep] = useState<'SELECT_PROJECT' | 'UPLOAD_RENDER' | 'VERIFY'>('SELECT_PROJECT');

  // --- Profile/Settings State ---
  const [newInteriorRef, setNewInteriorRef] = useState<string | null>(null);
  const [newExteriorRef, setNewExteriorRef] = useState<string | null>(null);
  const [isEditingRefs, setIsEditingRefs] = useState(false);

  // --- Comparison Tool State ---
  const [compMode, setCompMode] = useState<'SLIDE' | 'SPLIT_H' | 'SPLIT_V' | 'BLEND' | 'FULL'>('SLIDE');
  const [fullViewSource, setFullViewSource] = useState<'REF' | 'RENDER'>('RENDER');
  const [teacherFeedback, setTeacherFeedback] = useState('');

  // --- DERIVED STATE ---
  const studentViewAssignmentGroup = useMemo(() => {
    if (!viewingGroupParams) return null;
    return assignments.filter(a => 
        a.studentId === viewingGroupParams.studentId && 
        a.category === viewingGroupParams.category && 
        a.referenceImage === viewingGroupParams.referenceImage
    ).sort((a,b) => {
        // Stable sort: Submission Date -> ID
        const dA = new Date(a.submissionDate).getTime();
        const dB = new Date(b.submissionDate).getTime();
        return dA === dB ? a.id.localeCompare(b.id) : dA - dB;
    });
  }, [assignments, viewingGroupParams]);

  // Derived state for resubmission
  const isResubmission = currentUser && detectedStep && selectedProjectForSubmit ? assignments.some(a => 
    a.studentId === currentUser.id && 
    a.category === detectedStep && 
    a.referenceImage === (selectedProjectForSubmit === 'INTERIOR' ? currentUser.interiorRefUrl : currentUser.exteriorRefUrl)
  ) : false;

  // --- NAVIGATION HELPERS ---
  const filteredCommunityGroups = useMemo(() => {
      return getCommunityGroupedAssignments(assignments.filter(a => {
          const student = allUsers.find(u => u.id === a.studentId);
          if (!student || student.role !== 'STUDENT') return false;
          
          if (communityTab === 'MASTER' && student.classType !== 'MASTER_CLASS') return false;
          if (communityTab === 'VIZ' && student.classType !== 'VIZ_CLASS') return false;
          
          return true;
      }));
  }, [assignments, allUsers, communityTab]);

  const currentGroupIdx = useMemo(() => {
      if (!studentViewAssignmentGroup || studentViewAssignmentGroup.length === 0) return -1;
      const current = studentViewAssignmentGroup[0];
      
      return filteredCommunityGroups.findIndex(g => 
          g.length > 0 && 
          g[0].studentId === current.studentId && 
          g[0].category === current.category && 
          g[0].referenceImage === current.referenceImage
      );
  }, [studentViewAssignmentGroup, filteredCommunityGroups]);

  const navigateGroup = useCallback((dir: 'prev' | 'next') => {
      if (currentGroupIdx === -1) return;
      const newIdx = dir === 'prev' ? currentGroupIdx - 1 : currentGroupIdx + 1;
      
      if (newIdx >= 0 && newIdx < filteredCommunityGroups.length) {
          const newGroup = filteredCommunityGroups[newIdx];
          const latest = newGroup[newGroup.length - 1];
          setViewingGroupParams({
              studentId: latest.studentId,
              category: latest.category,
              referenceImage: latest.referenceImage
          });
          setViewingVersionIndex(newGroup.length - 1);
          if(currentUser?.role === 'TEACHER') setSelectedAssignmentId(null);
      }
  }, [currentGroupIdx, filteredCommunityGroups, currentUser]);

  // --- DATE HELPER ---
  const formatDateTime = (isoString: string) => {
      if (!isoString) return '';
      return new Date(isoString).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
  };


  // --- EFFECTS ---
  
  // KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!viewingGroupParams) return; // Only if modal is open

        if (e.key === 'ArrowLeft') {
            navigateGroup('prev');
        } else if (e.key === 'ArrowRight') {
            navigateGroup('next');
        } else if (e.key === 'Escape') {
             setViewingGroupParams(null);
             if(currentUser?.role === 'TEACHER') setSelectedAssignmentId(null);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingGroupParams, navigateGroup, currentUser]);

  // FIX: Black Screen Issue & Default Tab
  // Automatically switch to SUBMIT tab if student logs in
  useEffect(() => {
    if (currentUser?.role === 'STUDENT') {
       if (activeTab === 'DASHBOARD') {
           setActiveTab('SUBMIT');
       }
       if (currentUser.classType === 'VIZ_CLASS') {
           setCommunityTab('VIZ');
       } else {
           setCommunityTab('MASTER');
       }
    }
  }, [currentUser]);

  // UPDATED: Onboarding & Auto-Unlock Check (Robust Self-Healing)
  useEffect(() => {
     if (currentUser && currentUser.role === 'STUDENT') {
         // 1. Onboarding Check
         const hasRefs = currentUser.interiorRefUrl && currentUser.exteriorRefUrl;
         if (!hasRefs) {
             setIsOnboarding(true);
         } else {
             setIsOnboarding(false);
             
             // 2. Auto-Unlock Logic (Self-Healing for existing users)
             const firstStep = currentUser.classType === 'MASTER_CLASS' ? 'BOX_MODELING' : 'COLOR_RENDERING';
             const currentProgress = currentUser.progress || { INTERIOR: [], EXTERIOR: [] };
             let changed = false;
             
             // Ensure arrays exist
             const newInterior = [...(currentProgress.INTERIOR || [])];
             const newExterior = [...(currentProgress.EXTERIOR || [])];

             if (!newInterior.includes(firstStep)) {
                 newInterior.push(firstStep);
                 changed = true;
             }
             if (!newExterior.includes(firstStep)) {
                 newExterior.push(firstStep);
                 changed = true;
             }

             if (changed) {
                 const newProgress = { INTERIOR: newInterior, EXTERIOR: newExterior };
                 
                 // Optimistic Update to reflect immediately
                 setCurrentUser(prev => prev ? ({ ...prev, progress: newProgress }) : null);
                 
                 // Silent DB Update
                 supabase.from('profiles').update({ progress: newProgress }).eq('id', currentUser.id).then(({ error }) => {
                     if(error) console.error("Auto-unlock error:", error);
                 });
             }
         }
     }
  }, [currentUser]);

  // --- SUPABASE INITIALIZATION & FETCHING ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setAllUsers([]);
        setAssignments([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const user: User = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatar_url,
        classType: data.class_type,
        interiorRefUrl: data.interior_ref_url,
        exteriorRefUrl: data.exterior_ref_url,
        progress: data.progress
      };

      setCurrentUser(user);
      fetchApplicationData();
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchApplicationData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
      if (profilesError) throw profilesError;

      const mappedUsers: User[] = profiles.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: p.role,
        avatarUrl: p.avatar_url,
        classType: p.class_type,
        interiorRefUrl: p.interior_ref_url,
        exteriorRefUrl: p.exterior_ref_url,
        progress: p.progress || { INTERIOR: [], EXTERIOR: [] }
      }));
      setAllUsers(mappedUsers);

      const { data: assigns, error: assignError } = await supabase
        .from('assignments')
        .select(`*, feedback (*)`);
      if (assignError) throw assignError;

      const mappedAssignments: Assignment[] = assigns.map((a: any) => ({
        id: a.id,
        studentId: a.student_id,
        studentMessage: a.student_message,
        week: a.week,
        category: a.category,
        referenceImage: a.reference_image,
        renderImage: a.render_image,
        status: a.status,
        submissionDate: a.submission_date,
        feedback: a.feedback.map((f: any) => ({
           id: f.id,
           teacherId: f.teacher_id,
           message: f.message,
           type: f.type,
           date: f.created_at
        }))
      }));

      setAssignments(mappedAssignments);
    } catch (err) {
      console.error('Error fetching application data:', err);
    } finally {
      setLoading(false);
    }
  };


  // --- Helpers ---
  const getClassDisplayInfo = (type?: string) => {
    if (type === 'MASTER_CLASS') return { title: 'MASTER CLASS', subtitle: 'Architecture Modeling' };
    if (type === 'VIZ_CLASS') return { title: 'VIZ CLASS', subtitle: 'Architectural Visualization' };
    return { title: 'RTA ACADEMY', subtitle: 'Student Portal' };
  };

  const getAssignmentDisplayName = (cat: AssignmentCategory) => {
    switch (cat) {
        case 'BOX_MODELING': return 'Box Modeling';
        case 'SCENE_SETUP': return 'Scene Setup';
        case 'COLOR_RENDERING': return 'Color Rendering';
        case 'SHADERS': return 'Shaders';
        case 'POSTPRODUCTION': return 'Postproduction';
        default: return cat;
    }
  };

  const getProjectProgress = (studentId: string, projectType: 'INTERIOR' | 'EXTERIOR') => {
      const student = allUsers.find(u => u.id === studentId);
      if (!student || !student.classType) return [];

      const curriculum = CURRICULUM[student.classType];
      const targetRefUrl = projectType === 'INTERIOR' ? student.interiorRefUrl : student.exteriorRefUrl;
      const unlockedSteps = student.progress ? student.progress[projectType] : [];

      const projectAssignments = assignments.filter(a => 
          a.studentId === studentId && 
          a.referenceImage === targetRefUrl
      );

      const stepStatus = curriculum.map((step) => {
          const stepAssignments = projectAssignments
            .filter(a => a.category === step)
            .sort((a,b) => {
                const dA = new Date(a.submissionDate).getTime();
                const dB = new Date(b.submissionDate).getTime();
                return dA === dB ? a.id.localeCompare(b.id) : dA - dB;
            });
            
          const latest = stepAssignments.length > 0 ? stepAssignments[stepAssignments.length - 1] : null;
          
          let status: 'LOCKED' | 'AVAILABLE' | AssignmentStatus = 'LOCKED';
          
          if (unlockedSteps.includes(step)) {
              if (latest) {
                  status = latest.status; 
              } else {
                  status = 'AVAILABLE';
              }
          } else {
              status = 'LOCKED';
          }

          return {
              step,
              status,
              assignments: stepAssignments,
              latest
          };
      });

      return stepStatus;
  };

  // UPDATED: Sort by Newest First (b - a)
  function getCommunityGroupedAssignments(filteredAssignments: Assignment[]) {
      const grouped: Record<string, Assignment[]> = {};
      filteredAssignments.forEach(a => {
          const key = `${a.studentId}-${a.category}-${a.referenceImage}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(a);
      });
      return Object.values(grouped).map(group => {
          // Sort versions within group
          return group.sort((a,b) => {
            const dA = new Date(a.submissionDate).getTime();
            const dB = new Date(b.submissionDate).getTime();
            return dA - dB;
          });
      }).sort((groupA, groupB) => {
          // Sort groups by latest submission date (Newest First)
          const latestA = groupA[groupA.length - 1];
          const latestB = groupB[groupB.length - 1];
          return new Date(latestB.submissionDate).getTime() - new Date(latestA.submissionDate).getTime();
      });
  };

  // --- Handlers ---

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
    });

    if (error) {
        setLoginError(error.message);
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetForms();
    setIsOnboarding(false);
    setViewingGroupParams(null);
    setTeacherSelectedStudentId(null);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: (val: any) => void, 
    bucket: 'avatars' | 'references' | 'renders',
    nextStep?: () => void
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // CHANGED: Handle multiple files
    const newUrls: string[] = [];
    const files = Array.from(e.target.files);

    try {
        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${currentUser?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            
            newUrls.push(publicUrl);
        }

        if (bucket === 'renders') {
            setter(newUrls); // Sets array
        } else {
            setter(newUrls[0]); // Single for avatar/ref
        }
        
        if (nextStep) nextStep();

    } catch (error) {
        console.error(`Error uploading to ${bucket}:`, error);
        alert('Upload failed. Please try again.');
    }
  };

  const handleSaveProfileRefs = async () => {
    if (!currentUser) return;
    
    // UPDATED: Logic to Auto-Unlock First Assignment
    const firstStep = currentUser.classType === 'MASTER_CLASS' ? 'BOX_MODELING' : 'COLOR_RENDERING';
    const currentProgress = currentUser.progress || { INTERIOR: [], EXTERIOR: [] };
    
    // Explicitly add first step if missing
    if (!currentProgress.INTERIOR.includes(firstStep)) currentProgress.INTERIOR.push(firstStep);
    if (!currentProgress.EXTERIOR.includes(firstStep)) currentProgress.EXTERIOR.push(firstStep);

    const updates = {
        interior_ref_url: newInteriorRef || currentUser.interiorRefUrl,
        exterior_ref_url: newExteriorRef || currentUser.exteriorRefUrl,
        progress: currentProgress // Use the updated progress object
    };

    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);

        if (error) throw error;

        await fetchProfile(currentUser.id);
        setIsOnboarding(false);
        setIsEditingRefs(false);
        setActiveTab('PROFILE');

    } catch (err) {
        console.error('Error updating profile refs:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      await handleFileUpload(e, async (url) => {
          if (!currentUser || !url) return;
          try {
             const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUser.id);
             if (error) throw error;
             setCurrentUser({ ...currentUser, avatarUrl: url });
             setAllUsers(allUsers.map(u => u.id === currentUser.id ? { ...u, avatarUrl: url } : u));
          } catch(err) {
              console.error(err);
          }
      }, 'avatars');
  };

  const resetForms = () => {
    setUploadRenders([]);
    setSelectedProjectForSubmit(null);
    setDetectedStep(null);
    setSubmissionMessage('');
    setSubmitStep('SELECT_PROJECT');
    setNewInteriorRef(null);
    setNewExteriorRef(null);
    setSelectedAssignmentId(null);
    setViewingStudentId(null);
  };

  const handleProjectSelectForSubmit = (projectType: 'INTERIOR' | 'EXTERIOR') => {
      if (!currentUser) return;
      
      const progress = getProjectProgress(currentUser.id, projectType);
      
      let stepToSubmit = null;
      for (let i = progress.length - 1; i >= 0; i--) {
          if (progress[i].status !== 'LOCKED') {
              stepToSubmit = progress[i].step;
              break;
          }
      }

      if (stepToSubmit) {
          setSelectedProjectForSubmit(projectType);
          setDetectedStep(stepToSubmit);
          setSubmitStep('UPLOAD_RENDER');
      }
  };

  const handleSubmitAssignment = async () => {
    if (!currentUser || uploadRenders.length === 0 || !detectedStep || !selectedProjectForSubmit) return;
    
    const refImage = selectedProjectForSubmit === 'INTERIOR' ? currentUser.interiorRefUrl : currentUser.exteriorRefUrl;
    if (!refImage) return;

    try {
        // CHANGED: Loop through all uploaded renders and create assignments
        const existing = assignments.filter(a => a.studentId === currentUser.id && a.category === detectedStep && a.referenceImage === refImage);
        let currentWeek = existing.length + 1;

        for (const renderUrl of uploadRenders) {
            const { error } = await supabase.from('assignments').insert({
                student_id: currentUser.id,
                student_message: submissionMessage,
                week: currentWeek,
                category: detectedStep,
                reference_image: refImage,
                render_image: renderUrl,
                status: 'PENDING',
                submission_date: new Date().toISOString()
            });

            if (error) throw error;
            currentWeek++;
        }

        await fetchApplicationData(); 
        setActiveTab('PROFILE');
        resetForms();

    } catch (err) {
        console.error('Submission failed:', err);
        alert('Failed to submit assignment.');
    }
  };

  // UPDATED: Handle Auto-Unlock on Approve
  const handleTeacherAction = async (targetAssignmentId: string, action: 'APPROVE' | 'REJECT') => {
    if (!currentUser) return;

    try {
        // 1. Insert Feedback
        const { error: feedbackError } = await supabase.from('feedback').insert({
            assignment_id: targetAssignmentId,
            teacher_id: currentUser.id,
            type: action,
            message: teacherFeedback || (action === 'APPROVE' ? 'Great work!' : 'Please revise.')
        });
        if (feedbackError) throw feedbackError;

        // 2. Update Assignment Status
        const { error: statusError } = await supabase
            .from('assignments')
            .update({ status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
            .eq('id', targetAssignmentId);
        if (statusError) throw statusError;

        // 3. AUTO UNLOCK LOGIC
        if (action === 'APPROVE') {
            const assignment = assignments.find(a => a.id === targetAssignmentId);
            const student = allUsers.find(u => u.id === assignment?.studentId);
            
            if (assignment && student && student.classType) {
                const isInterior = assignment.referenceImage === student.interiorRefUrl;
                const track = isInterior ? 'INTERIOR' : 'EXTERIOR';
                
                const curriculum = CURRICULUM[student.classType];
                const currentIndex = curriculum.indexOf(assignment.category);
                
                // If there is a next step
                if (currentIndex !== -1 && currentIndex < curriculum.length - 1) {
                    const nextStep = curriculum[currentIndex + 1];
                    const currentProgress = student.progress ? [...student.progress[track]] : [];
                    
                    if (!currentProgress.includes(nextStep)) {
                        currentProgress.push(nextStep);
                        const updatedProgress = {
                            ...student.progress,
                            [track]: currentProgress
                        };

                        await supabase
                            .from('profiles')
                            .update({ progress: updatedProgress })
                            .eq('id', student.id);
                    }
                }
            }
        }

        await fetchApplicationData();
        setTeacherFeedback('');

    } catch (err) {
        console.error('Error giving feedback:', err);
    }
  };

  const handleToggleLockStage = async (studentId: string, project: 'INTERIOR' | 'EXTERIOR', step: AssignmentCategory) => {
      const user = allUsers.find(u => u.id === studentId);
      if (user && user.progress) {
          let newProgress = [...user.progress[project]];
          if (newProgress.includes(step)) {
              newProgress = newProgress.filter(s => s !== step);
          } else {
              newProgress.push(step);
          }
          const updatedProgressObj = { ...user.progress, [project]: newProgress };
          await supabase.from('profiles').update({ progress: updatedProgressObj }).eq('id', studentId);
          setAllUsers(allUsers.map(u => u.id === studentId ? { ...u, progress: updatedProgressObj } : u));
      }
  };

  // --- Render Functions ---

  const renderStudentProgressContent = (student: User, isMe: boolean) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
                <div 
                    onClick={() => isMe && setStudentProjectView('INTERIOR')}
                    className={`relative h-48 rounded-2xl overflow-hidden transition-all group border ${studentProjectView === 'INTERIOR' ? 'border-[#c7023a] shadow-[0_0_20px_rgba(199,2,58,0.15)]' : 'border-white/10 hover:border-white/20'} ${isMe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    {student.interiorRefUrl && <img src={student.interiorRefUrl} className={`w-full h-full object-cover transition-all duration-500 ${studentProjectView === 'INTERIOR' ? 'scale-105' : 'grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0'}`} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all" />
                    <div className="absolute bottom-5 left-5 flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${studentProjectView === 'INTERIOR' ? 'bg-[#c7023a] text-white shadow-lg' : 'bg-white/10 text-zinc-400 backdrop-blur-md'}`}>
                            <Armchair size={18} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-base font-bold text-white leading-none tracking-tight">INTERIOR</h3>
                            <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1 uppercase">Track</p>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => isMe && setStudentProjectView('EXTERIOR')}
                    className={`relative h-48 rounded-2xl overflow-hidden transition-all group border ${studentProjectView === 'EXTERIOR' ? 'border-[#c7023a] shadow-[0_0_20px_rgba(199,2,58,0.15)]' : 'border-white/10 hover:border-white/20'} ${isMe ? 'cursor-pointer' : 'cursor-default'}`}
                >
                   {student.exteriorRefUrl && <img src={student.exteriorRefUrl} className={`w-full h-full object-cover transition-all duration-500 ${studentProjectView === 'EXTERIOR' ? 'scale-105' : 'grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0'}`} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all" />
                    <div className="absolute bottom-5 left-5 flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${studentProjectView === 'EXTERIOR' ? 'bg-[#c7023a] text-white shadow-lg' : 'bg-white/10 text-zinc-400 backdrop-blur-md'}`}>
                            <Building2 size={18} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-base font-bold text-white leading-none tracking-tight">EXTERIOR</h3>
                            <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1 uppercase">Track</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                        {studentProjectView === 'INTERIOR' ? <Armchair size={20} className="text-[#c7023a]"/> : <Building2 size={20} className="text-[#c7023a]"/>}
                        {studentProjectView} CURRICULUM
                    </h3>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] border border-white/5 px-2 py-1 rounded">
                        {student.classType === 'MASTER_CLASS' ? 'Master Class' : 'Viz Class'}
                    </div>
                </div>

                <div className="space-y-3">
                    {getProjectProgress(student.id, studentProjectView).map((stepData, idx) => {
                        const isLocked = stepData.status === 'LOCKED';
                        const isAvailable = stepData.status === 'AVAILABLE';
                        
                        return (
                            <div 
                                key={idx}
                                onClick={() => {
                                    if (stepData.assignments.length > 0) {
                                        setViewingGroupParams({
                                            studentId: student.id,
                                            category: stepData.step,
                                            referenceImage: studentProjectView === 'INTERIOR' ? student.interiorRefUrl! : student.exteriorRefUrl!
                                        });
                                        setViewingVersionIndex(stepData.assignments.length - 1);
                                    } else if (isAvailable && isMe) {
                                        setSelectedProjectForSubmit(studentProjectView);
                                        setDetectedStep(stepData.step);
                                        setActiveTab('SUBMIT');
                                        setSubmitStep('UPLOAD_RENDER');
                                    }
                                }}
                                className={`
                                    relative p-4 rounded-xl border flex items-center gap-5 transition-all
                                    ${isLocked 
                                        ? 'bg-zinc-900/30 border-white/5 opacity-40 cursor-not-allowed' 
                                        : 'bg-zinc-900/60 border-white/10 cursor-pointer hover:bg-zinc-800 hover:border-[#c7023a]/40'}
                                    ${stepData.status === 'APPROVED' ? 'border-emerald-500/20 bg-emerald-900/5' : ''}
                                    ${stepData.status === 'REJECTED' ? 'border-red-500/20 bg-red-900/5' : ''}
                                `}
                            >
                                <div className="text-xl font-black text-zinc-800 w-8 text-center">{idx + 1}</div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-bold text-sm text-white tracking-wide">{getAssignmentDisplayName(stepData.step)}</h4>
                                        <StatusBadge status={stepData.status === 'LOCKED' || stepData.status === 'AVAILABLE' ? (stepData.status === 'AVAILABLE' ? 'PENDING' : 'PENDING') : stepData.status} />
                                    </div>
                                    <div className="text-[11px] text-zinc-500 font-medium">
                                        {isLocked ? "Complete previous requirements to unlock." : 
                                         isAvailable ? "Assignment available for submission." : 
                                         `${stepData.assignments.length} Version(s) Submitted • Last update: ${new Date(stepData.latest?.submissionDate || '').toLocaleDateString()}`}
                                    </div>
                                </div>

                                <div className="text-zinc-600">
                                    {isLocked ? <Lock size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderTeacherDashboard = () => {
      const students = allUsers.filter(u => u.role === 'STUDENT' && 
          ((teacherTab === 'MASTER' && u.classType === 'MASTER_CLASS') || 
           (teacherTab === 'VIZ' && u.classType === 'VIZ_CLASS'))
      );

      if (teacherSelectedStudentId) {
          const student = allUsers.find(u => u.id === teacherSelectedStudentId);
          if (!student) return null;

          const renderTeacherProgressTrack = (project: 'INTERIOR' | 'EXTERIOR') => {
              const progress = getProjectProgress(student.id, project);
              const unlockedList = student.progress ? student.progress[project] : [];

              return (
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
                          <div className="p-2 bg-zinc-800 rounded-lg text-[#c7023a]">
                              {project === 'INTERIOR' ? <Armchair size={20}/> : <Building2 size={20}/>}
                          </div>
                          <h3 className="font-bold text-white text-lg">{project} PROGRESS</h3>
                      </div>

                      <div className="space-y-3">
                          {progress.map((p, idx) => {
                              const isUnlocked = unlockedList.includes(p.step);

                              return (
                                  <div key={idx} className={`bg-zinc-900/50 border rounded-lg p-3 flex items-center justify-between ${isUnlocked ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}>
                                      <div className="flex items-center gap-3">
                                          <span className="text-zinc-600 font-bold text-xs w-4">{idx + 1}.</span>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                 <span className={`font-bold text-sm ${!isUnlocked ? 'text-zinc-500' : 'text-white'}`}>{getAssignmentDisplayName(p.step)}</span>
                                                 {isUnlocked && <StatusBadge status={p.status === 'LOCKED' || p.status === 'AVAILABLE' ? 'PENDING' : p.status} />}
                                              </div>
                                              {p.assignments.length > 0 && (
                                                <button 
                                                    onClick={() => {
                                                        setViewingGroupParams({
                                                            studentId: student.id,
                                                            category: p.step,
                                                            referenceImage: project === 'INTERIOR' ? student.interiorRefUrl! : student.exteriorRefUrl!
                                                        });
                                                        setViewingVersionIndex(p.assignments.length - 1);
                                                        setSelectedAssignmentId(p.latest?.id || null);
                                                    }}
                                                    className="text-[10px] text-[#c7023a] hover:underline font-bold mt-1"
                                                >
                                                    View {p.assignments.length} Submission(s)
                                                </button>
                                              )}
                                          </div>
                                      </div>

                                      <button 
                                          onClick={() => handleToggleLockStage(student.id, project, p.step)}
                                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                              isUnlocked 
                                                ? 'bg-zinc-800 border-zinc-700 text-emerald-500 hover:bg-zinc-700' 
                                                : 'bg-black border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
                                          }`}
                                      >
                                          {isUnlocked ? (
                                              <><Unlock size={12} /> UNLOCKED</>
                                          ) : (
                                              <><Lock size={12} /> LOCKED</>
                                          )}
                                      </button>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              );
          };

          return (
              <div className="animate-fade-in space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                      <button onClick={() => setTeacherSelectedStudentId(null)} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm"><ArrowRight className="rotate-180" size={14}/> Back to List</button>
                      <h2 className="text-2xl font-black text-white uppercase">{student.name}</h2>
                      <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded font-bold">{getClassDisplayInfo(student.classType).title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      {renderTeacherProgressTrack('INTERIOR')}
                      {renderTeacherProgressTrack('EXTERIOR')}
                  </div>
              </div>
          );
      }

      return (
          <div className="animate-fade-in space-y-6">
             <div className="flex items-center gap-4 border-b border-zinc-800 pb-2">
                 <button onClick={() => setTeacherTab('MASTER')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${teacherTab === 'MASTER' ? 'border-[#c7023a] text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                    Master Class
                 </button>
                 <button onClick={() => setTeacherTab('VIZ')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${teacherTab === 'VIZ' ? 'border-[#c7023a] text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                    Visualization Class
                 </button>
             </div>

             <div className="grid grid-cols-1 gap-4">
                 {students.map(student => {
                     const pendingCount = assignments.filter(a => a.studentId === student.id && a.status === 'PENDING').length;

                     return (
                         <div 
                            key={student.id} 
                            onClick={() => setTeacherSelectedStudentId(student.id)}
                            className="bg-zinc-900/30 border border-zinc-800 hover:border-[#c7023a] p-4 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                         >
                             <div className="flex items-center gap-4">
                                 <div className="relative">
                                    <img src={student.avatarUrl} className="w-12 h-12 rounded-full bg-zinc-800" />
                                    {pendingCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                                            {pendingCount}
                                        </div>
                                    )}
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-lg text-white group-hover:text-[#c7023a] transition-colors">{student.name}</h4>
                                     <p className="text-xs text-zinc-500">{student.email}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-8">
                                 <div className="text-right">
                                     <div className="text-[10px] font-bold text-zinc-500 uppercase">Progress</div>
                                     <div className="flex gap-2 text-xs">
                                         <span className="text-white"><Armchair size={12} className="inline mr-1"/>{student.progress?.INTERIOR.length || 0}</span>
                                         <span className="text-white"><Building2 size={12} className="inline mr-1"/>{student.progress?.EXTERIOR.length || 0}</span>
                                     </div>
                                 </div>
                                 <ChevronRight className="text-zinc-600 group-hover:text-white" />
                             </div>
                         </div>
                     );
                 })}
             </div>
          </div>
      );
  };

  const renderProfileView = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return null;

    const isMe = currentUser && userId === currentUser.id;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between p-8 bg-zinc-900/30 border border-white/5 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <img src={user.avatarUrl} className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-white/10 object-cover" />
                        {isMe && (
                             <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-[#c7023a]">
                                <Camera size={24} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                             </label>
                        )}
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-1">{user.name}</h2>
                        <div className="text-sm font-medium text-zinc-400">
                            {user.email}
                        </div>
                    </div>
                </div>
                {isMe && (
                  <button onClick={() => setIsEditingRefs(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-white transition-colors tracking-wide">
                     <Edit2 size={12} /> EDIT REFS
                  </button>
                )}
            </div>

            {user.role === 'STUDENT' && isMe && (
                renderStudentProgressContent(user, true)
            )}
            
            {user.role === 'STUDENT' && !isMe && (
                 renderStudentProgressContent(user, false)
            )}
        </div>
    );
  };

  const renderSidebar = () => (
    <div className="w-20 bg-[#050505] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50 items-center py-6 backdrop-blur-xl">
      <div className="mb-10 w-10 h-10 bg-[#c7023a] flex items-center justify-center rounded-lg shadow-[0_0_15px_#c7023a40]">
        <span className="text-white font-black text-xs tracking-tighter">RTA</span>
      </div>
      
      <div className="flex-1 space-y-2 w-full px-2 flex flex-col items-center">
        {currentUser && currentUser.role === 'STUDENT' ? (
          <>
            {/* UPDATED: Upload First, then Community, Profile moved up */}
            <NavIcon active={activeTab === 'SUBMIT'} onClick={() => { setActiveTab('SUBMIT'); resetForms(); }} icon={Upload} label="Submit" />
            <NavIcon active={activeTab === 'COMMUNITY'} onClick={() => { setActiveTab('COMMUNITY'); setViewingStudentId(null); }} icon={Globe} label="Community" />
            <button 
                onClick={() => { setActiveTab('PROFILE'); setViewingStudentId(null); }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border-2 mb-3 ${activeTab === 'PROFILE' ? 'border-[#c7023a] p-0.5' : 'border-transparent hover:border-zinc-700'}`}
                title="My Personal Account"
            >
              {currentUser && <img src={currentUser.avatarUrl} className="w-full h-full rounded-full object-cover" />}
            </button>
          </>
        ) : (
          <>
            <NavIcon active={activeTab === 'DASHBOARD'} onClick={() => { setActiveTab('DASHBOARD'); setSelectedAssignmentId(null); setTeacherSelectedStudentId(null); }} icon={CheckCircle} label="Students" />
            <NavIcon active={activeTab === 'COMMUNITY'} onClick={() => { setActiveTab('COMMUNITY'); setViewingStudentId(null); }} icon={GraduationCap} label="Community" />
            <button 
                onClick={() => { setActiveTab('PROFILE'); setViewingStudentId(null); }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border-2 mb-3 ${activeTab === 'PROFILE' ? 'border-[#c7023a] p-0.5' : 'border-transparent hover:border-zinc-700'}`}
                title="My Personal Account"
            >
              {currentUser && <img src={currentUser.avatarUrl} className="w-full h-full rounded-full object-cover" />}
            </button>
          </>
        )}
      </div>

      <div className="mt-auto space-y-4 w-full px-2 flex flex-col items-center">
        <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-zinc-900 rounded-xl transition-colors" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden font-sans">
        {/* Login Page preserved as is */}
        <div className="absolute inset-0 bg-black z-0">
             <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-[#c7023a] rounded-full blur-[180px] opacity-20 animate-pulse"></div>
             <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-blue-900 rounded-full blur-[200px] opacity-10"></div>
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150"></div>
        </div>
        
        <div className="absolute top-0 left-0 w-full p-8 z-50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-[#c7023a] flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(199,2,58,0.5)]">
                     <span className="text-white font-black text-xs tracking-tighter">RTA</span>
                 </div>
                 <span className="font-bold text-sm tracking-widest text-zinc-400">ACADEMY</span>
             </div>
             <div className="text-xs font-bold text-zinc-600 tracking-widest uppercase hidden md:block">Visualization Portal</div>
        </div>

        <div className="z-10 flex-1 flex items-center justify-center relative w-full h-full">
             <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-0 bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                 <div className="p-12 flex flex-col justify-center border-r border-white/5 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                     <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-[#c7023a] mb-6 w-fit">
                            <Sparkles size={10} /> NEW SEMESTER OPEN
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-6">
                            RENDER<br/>THE ART.
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
                            Where geometry meets emotion. The ultimate ecosystem for architectural visualization mastery.
                        </p>
                     </div>
                 </div>

                 <div className="p-12 flex flex-col justify-center bg-black/40">
                      <form onSubmit={handleLoginSubmit} className="space-y-6 max-w-sm mx-auto w-full">
                          <div className="text-center mb-8">
                              <h2 className="text-xl font-bold text-white tracking-tight">Access Portal</h2>
                              <p className="text-zinc-500 text-sm mt-1">Enter your credentials to continue</p>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
                                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-[#050505] border border-zinc-800 rounded-lg p-3 text-white text-sm outline-none focus:border-[#c7023a] focus:bg-zinc-900 transition-all placeholder:text-zinc-700" placeholder="student@rta.edu"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-[#050505] border border-zinc-800 rounded-lg p-3 text-white text-sm outline-none focus:border-[#c7023a] focus:bg-zinc-900 transition-all placeholder:text-zinc-700" placeholder="••••••••"/>
                              </div>
                          </div>
                          {loginError && (<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2 font-medium"><AlertCircle size={14} /> {loginError}</div>)}
                          <button type="submit" className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide mt-2">Sign In <ArrowRight size={16} /></button>
                      </form>
                 </div>
             </div>
        </div>
      </div>
    );
  }

  // --- ONBOARDING OR EDITING REFS ---
  if ((isOnboarding || isEditingRefs) && currentUser) {
      const classInfo = getClassDisplayInfo(currentUser.classType);

      return (
          <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 relative font-sans">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c7023a] to-transparent opacity-50"></div>
               <div className="absolute top-8 left-8 flex items-center gap-6">
                   <div className="w-10 h-10 bg-[#c7023a] flex items-center justify-center rounded-lg shadow-lg shadow-red-900/30">
                        <span className="text-white font-black text-xs tracking-tighter">RTA</span>
                   </div>
                   <div className="flex flex-col justify-center border-l border-zinc-800 pl-6">
                        <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">{classInfo.title}</h1>
                        <p className="text-[10px] font-bold text-[#c7023a] tracking-[0.2em] uppercase">{classInfo.subtitle}</p>
                    </div>
               </div>
              <button onClick={() => isEditingRefs ? setIsEditingRefs(false) : handleLogout()} className="absolute top-8 right-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold border border-zinc-800 px-4 py-2 rounded-lg">
                {isEditingRefs ? <X size={14} /> : <LogOut size={14} />} {isEditingRefs ? 'CANCEL' : 'LOGOUT'}
              </button>

              <div className="max-w-5xl w-full">
                  <div className="text-center mb-16">
                      <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-bold tracking-[0.2em] uppercase mb-6 backdrop-blur-sm">System Initialization</div>
                      <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">Upload Master References</h2>
                      <p className="text-zinc-500 text-lg max-w-2xl mx-auto">These master files will serve as the ground truth for all future assignment comparisons.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      <label className={`aspect-video rounded-3xl border border-white/5 bg-zinc-900/30 flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer backdrop-blur-sm ${newInteriorRef ? 'border-[#c7023a]/50 shadow-[0_0_30px_rgba(199,2,58,0.1)]' : 'hover:border-white/20 hover:bg-zinc-900/50'}`}>
                          {(newInteriorRef || currentUser.interiorRefUrl) ? (
                              <>
                                <img src={newInteriorRef || currentUser.interiorRefUrl} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                <div className="absolute bottom-6 left-6 pointer-events-none">
                                    <div className="flex items-center gap-3 text-white font-bold tracking-tight">
                                        <div className="p-2 bg-[#c7023a] rounded-lg"><Armchair size={16}/></div> 
                                        INTERIOR MASTER
                                    </div>
                                </div>
                              </>
                          ) : (
                              <div className="text-center p-4 relative z-10 pointer-events-none flex flex-col items-center">
                                  <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                     <Upload className="text-zinc-600 group-hover:text-white transition-colors" size={24} />
                                  </div>
                                  <span className="text-sm font-bold text-white tracking-wide block">Upload Interior Reference</span>
                              </div>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setNewInteriorRef, 'references')} />
                      </label>

                      <label className={`aspect-video rounded-3xl border border-white/5 bg-zinc-900/30 flex flex-col items-center justify-center relative overflow-hidden group transition-all cursor-pointer backdrop-blur-sm ${newExteriorRef ? 'border-[#c7023a]/50 shadow-[0_0_30px_rgba(199,2,58,0.1)]' : 'hover:border-white/20 hover:bg-zinc-900/50'}`}>
                          {(newExteriorRef || currentUser.exteriorRefUrl) ? (
                              <>
                                <img src={newExteriorRef || currentUser.exteriorRefUrl} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                <div className="absolute bottom-6 left-6 pointer-events-none">
                                    <div className="flex items-center gap-3 text-white font-bold tracking-tight">
                                        <div className="p-2 bg-[#c7023a] rounded-lg"><Building2 size={16}/></div> 
                                        EXTERIOR MASTER
                                    </div>
                                </div>
                              </>
                          ) : (
                              <div className="text-center p-4 relative z-10 pointer-events-none flex flex-col items-center">
                                  <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                     <Upload className="text-zinc-600 group-hover:text-white transition-colors" size={24} />
                                  </div>
                                  <span className="text-sm font-bold text-white tracking-wide block">Upload Exterior Reference</span>
                              </div>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setNewExteriorRef, 'references')} />
                      </label>
                  </div>
                  <div className="flex justify-center">
                    <button onClick={handleSaveProfileRefs} className="px-12 py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all flex items-center gap-3 tracking-widest uppercase text-sm shadow-xl hover:shadow-2xl hover:-translate-y-1">
                        Confirm Updates
                    </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#c7023a] selection:text-white">
      {renderSidebar()}
      
      <main className="pl-20 min-h-screen relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
          {currentUser.role === 'STUDENT' ? (
             <div className="flex flex-col justify-center">
                 <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">{getClassDisplayInfo(currentUser.classType).title}</h1>
                 <p className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">{getClassDisplayInfo(currentUser.classType).subtitle}</p>
             </div>
          ) : (
            <div>
                 <h1 className="text-xl font-bold text-white tracking-tight">FACULTY DASHBOARD</h1>
                 <p className="text-[10px] font-bold text-[#c7023a] tracking-widest uppercase">INSTRUCTOR VIEW</p>
            </div>
          )}

          <div className="text-right flex items-center gap-4">
             <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-r border-zinc-800 pr-4 mr-4 hidden md:block">
                {activeTab === 'COMMUNITY' && viewingStudentId ? 'STUDENT PROFILE' : activeTab}
             </div>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto">
          
          {(activeTab === 'PROFILE' || (activeTab === 'COMMUNITY' && viewingStudentId)) && (
              renderProfileView(activeTab === 'PROFILE' ? currentUser.id : viewingStudentId!)
          )}

          {activeTab === 'COMMUNITY' && !viewingStudentId && (
              <div className="space-y-8">
                 <div className="flex items-center gap-6 border-b border-white/5 pb-1">
                     {(currentUser.role === 'TEACHER' || currentUser.classType === 'MASTER_CLASS') && (
                         <button onClick={() => setCommunityTab('MASTER')} className={`text-sm font-bold pb-3 border-b-2 transition-all tracking-wide ${communityTab === 'MASTER' ? 'border-[#c7023a] text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                            Master Class
                         </button>
                     )}
                     {(currentUser.role === 'TEACHER' || currentUser.classType === 'VIZ_CLASS') && (
                         <button onClick={() => setCommunityTab('VIZ')} className={`text-sm font-bold pb-3 border-b-2 transition-all tracking-wide ${communityTab === 'VIZ' ? 'border-[#c7023a] text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}>
                            Visualization Class
                         </button>
                     )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {/* FIXED: Filter Logic covers both Interior and Exterior now, simply checking Class Type */}
                    {getCommunityGroupedAssignments(assignments.filter(a => {
                        const student = allUsers.find(u => u.id === a.studentId);
                        if (!student || student.role !== 'STUDENT') return false;
                        
                        if (communityTab === 'MASTER' && student.classType !== 'MASTER_CLASS') return false;
                        if (communityTab === 'VIZ' && student.classType !== 'VIZ_CLASS') return false;
                        
                        return true;
                    })).map((group, idx) => {
                        const latest = group[group.length - 1];
                        const student = allUsers.find(u => u.id === latest.studentId);
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => {
                                    setViewingGroupParams({
                                        studentId: latest.studentId,
                                        category: latest.category,
                                        referenceImage: latest.referenceImage
                                    });
                                    setViewingVersionIndex(group.length - 1);
                                }}
                                className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden hover:border-white/20 hover:bg-zinc-900/60 transition-all cursor-pointer group flex flex-col shadow-lg"
                            >
                                <div className="aspect-[4/3] bg-black relative">
                                    <img src={latest.renderImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="text-white font-bold text-sm leading-tight mb-1 tracking-wide">{getAssignmentDisplayName(latest.category)}</div>
                                        {/* ADDED: Student Name Visible on Card */}
                                        <div className="text-[10px] text-zinc-300 font-bold flex items-center gap-2">
                                            <img src={student?.avatarUrl} className="w-5 h-5 rounded-full border border-white/20" />
                                            {student?.name}
                                        </div>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <StatusBadge status={latest.status} />
                                    </div>

                                    {/* TEACHER DIRECT GRADING ON CARD */}
                                    {currentUser.role === 'TEACHER' && latest.status === 'PENDING' && (
                                        <div className="absolute top-3 left-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleTeacherAction(latest.id, 'APPROVE')} className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg" title="Quick Approve">
                                                <CheckCircle size={14} className="text-black" />
                                            </button>
                                            <button onClick={() => handleTeacherAction(latest.id, 'REJECT')} className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg" title="Quick Reject">
                                                <X size={14} className="text-black" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>
          )}

          {studentViewAssignmentGroup && (
              <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                  {(() => {
                      const currentVersion = studentViewAssignmentGroup[viewingVersionIndex];
                      if (!currentVersion) return null;

                      const student = allUsers.find(u => u.id === currentVersion.studentId);
                      const isLatest = viewingVersionIndex === studentViewAssignmentGroup.length - 1;
                      const studentIsOwner = currentUser.id === currentVersion.studentId;
                      const progress = getProjectProgress(currentVersion.studentId, currentVersion.referenceImage === currentUser.interiorRefUrl ? 'INTERIOR' : 'EXTERIOR');
                      const stepInfo = progress.find(p => p.step === currentVersion.category);
                      const isLocked = stepInfo?.status === 'LOCKED';
                      const canSubmitNewVersion = studentIsOwner && isLatest && !isLocked;

                      const hasPrev = currentGroupIdx > 0;
                      const hasNext = currentGroupIdx < filteredCommunityGroups.length - 1;

                      return (
                        <div className="w-full h-full max-w-[1800px] bg-[#050505] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
                             <button onClick={() => { setViewingGroupParams(null); if(currentUser.role === 'TEACHER') setSelectedAssignmentId(null); }} className="absolute top-6 right-6 z-50 p-3 bg-black/50 hover:bg-[#c7023a] text-white rounded-full backdrop-blur-md transition-all border border-white/10 group">
                                 <X size={24} className="group-hover:scale-110 transition-transform" />
                             </button>

                             <div className="h-20 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl">
                                 <div>
                                     <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                        {getAssignmentDisplayName(currentVersion.category)}
                                        {/* ADDED: Student Name in Modal Header */}
                                        <span className="text-zinc-500 text-lg font-medium flex items-center gap-2">
                                            by <img src={student?.avatarUrl} className="w-6 h-6 rounded-full" /> {student?.name}
                                        </span>
                                     </h2>
                                     <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                         <span className="font-bold text-[#c7023a] uppercase tracking-wider">Assignment {currentVersion.week.toString().padStart(2, '0')}</span>
                                         <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                         <span>Version {viewingVersionIndex + 1} of {studentViewAssignmentGroup.length}</span>
                                     </div>
                                 </div>
                                 <div className="ml-8">
                                     <StatusBadge status={currentVersion.status} />
                                 </div>
                             </div>

                             <div className="flex-1 flex overflow-hidden">
                                 <div className="flex-1 bg-zinc-900/20 relative p-6 flex flex-col">
                                     <div className="flex-1 w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black relative group/image-area">
                                        <ComparisonViewer 
                                            refImage={currentVersion.referenceImage} 
                                            renderImage={currentVersion.renderImage} 
                                            mode={compMode} 
                                            setMode={setCompMode} 
                                            fullViewSource={fullViewSource} 
                                            onFullViewToggle={() => setFullViewSource(prev => prev === 'REF' ? 'RENDER' : 'REF')} 
                                        />

                                        {/* NAVIGATION ARROWS IN MODAL - MOVED INSIDE & MADE SMALLER */}
                                        {hasPrev && (
                                            <button onClick={() => navigateGroup('prev')} className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/40 hover:bg-[#c7023a] text-white rounded-full backdrop-blur border border-white/10 transition-all shadow-lg hover:scale-105 group-hover/image-area:opacity-100 opacity-0 transition-opacity duration-300">
                                                <ChevronLeft size={20} />
                                            </button>
                                        )}
                                        {hasNext && (
                                            <button onClick={() => navigateGroup('next')} className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-2 bg-black/40 hover:bg-[#c7023a] text-white rounded-full backdrop-blur border border-white/10 transition-all shadow-lg hover:scale-105 group-hover/image-area:opacity-100 opacity-0 transition-opacity duration-300">
                                                <ChevronRight size={20} />
                                            </button>
                                        )}
                                     </div>
                                     
                                     {/* MINIMIZED VERSION HISTORY DOTS */}
                                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-2 flex items-center gap-1.5 shadow-xl">
                                         {studentViewAssignmentGroup.map((_, idx) => (
                                             <button 
                                                key={idx}
                                                onClick={() => setViewingVersionIndex(idx)}
                                                className={`w-2 h-2 rounded-full transition-all ${idx === viewingVersionIndex ? 'bg-[#c7023a] scale-125' : 'bg-white/30 hover:bg-white/60'}`}
                                                title={`View Version ${idx + 1}`}
                                             />
                                         ))}
                                     </div>
                                 </div>

                                 <div className="w-96 border-l border-white/5 bg-[#050505] flex flex-col">
                                     {currentUser.role === 'TEACHER' && (selectedAssignmentId || currentVersion.status === 'PENDING') ? (
                                        <div className="flex flex-col h-full p-6">
                                            <div className="mb-6">
                                                <h3 className="font-bold text-white text-lg">{student?.name}</h3>
                                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 mt-4">
                                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">Student Note</div>
                                                    <p className="text-sm text-zinc-300 italic leading-relaxed">"{currentVersion.studentMessage}"</p>
                                                </div>
                                                {/* ADDED: Timestamps in Teacher View */}
                                                <div className="mt-4 space-y-1">
                                                    <div className="text-[10px] text-zinc-500 flex justify-between">
                                                        <span>Submitted:</span>
                                                        <span className="text-zinc-300">{formatDateTime(currentVersion.submissionDate)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {currentVersion.status === 'PENDING' ? (
                                                <>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">Instructor Feedback</label>
                                                        <textarea 
                                                            className="flex-1 w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm text-white resize-none outline-none focus:border-[#c7023a] transition-all" 
                                                            placeholder="Enter constructive feedback..." 
                                                            value={teacherFeedback} 
                                                            onChange={e => setTeacherFeedback(e.target.value)} 
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-3 mt-6">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button onClick={() => handleTeacherAction(currentVersion.id, 'APPROVE')} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">Approve</button>
                                                            <button onClick={() => handleTeacherAction(currentVersion.id, 'REJECT')} className="py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all">Reject</button>
                                                        </div>
                                                        <div className="text-xs text-zinc-500 text-center mt-2">
                                                            *Approving will automatically unlock the next stage.
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex flex-col justify-center items-center opacity-70">
                                                    <div className={`p-6 rounded-full mb-4 ${currentVersion.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {currentVersion.status === 'APPROVED' ? <CheckCircle size={48} /> : <AlertCircle size={48} />}
                                                    </div>
                                                    <h3 className={`text-xl font-bold mb-2 ${currentVersion.status === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        ALREADY {currentVersion.status}
                                                    </h3>
                                                    {/* ADDED: Graded Time in Teacher View */}
                                                    {currentVersion.feedback && currentVersion.feedback.length > 0 && (
                                                         <div className="text-xs text-zinc-500 mt-2">
                                                             Graded: {formatDateTime(currentVersion.feedback[currentVersion.feedback.length - 1].date)}
                                                         </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                     ) : (
                                        <>
                                            <div className="p-6 border-b border-white/5">
                                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Submission Details</h3>
                                                
                                                {/* ADDED: Timestamps in Student View */}
                                                <div className="flex flex-col gap-1 mb-4 text-[10px] text-zinc-500 border-b border-zinc-800/50 pb-4">
                                                    <div className="flex justify-between">
                                                        <span>Submitted:</span>
                                                        <span className="text-zinc-300 font-medium">{formatDateTime(currentVersion.submissionDate)}</span>
                                                    </div>
                                                    {(currentVersion.status === 'APPROVED' || currentVersion.status === 'REJECTED') && currentVersion.feedback && currentVersion.feedback.length > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>Graded:</span>
                                                            <span className="text-zinc-300 font-medium">{formatDateTime(currentVersion.feedback[currentVersion.feedback.length - 1].date)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                                                        <div className="text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Student Note</div>
                                                        <p className="text-sm text-zinc-300 italic leading-relaxed">"{currentVersion.studentMessage}"</p>
                                                    </div>
                                                    
                                                    {currentVersion.feedback && currentVersion.feedback.length > 0 ? (
                                                        <div className={`p-4 rounded-xl border ${currentVersion.status === 'APPROVED' ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                                            <div className={`text-[10px] font-bold mb-2 uppercase tracking-wider ${currentVersion.status === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}`}>Instructor Feedback</div>
                                                            <p className="text-sm text-white leading-relaxed">{currentVersion.feedback[currentVersion.feedback.length - 1].message}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/20 text-zinc-500 text-sm italic text-center">
                                                            No feedback yet.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {currentUser.id === currentVersion.studentId && (
                                                <div className="mt-auto p-6 bg-zinc-900/10">
                                                    {canSubmitNewVersion ? (
                                                        <div className="text-center">
                                                            {currentVersion.status === 'REJECTED' && (
                                                                <p className="text-xs text-red-400 mb-4 bg-red-900/20 p-2 rounded border border-red-900/40">This submission was rejected. Please review feedback.</p>
                                                            )}
                                                            <button 
                                                                onClick={() => {
                                                                    const project = currentVersion.referenceImage === currentUser.interiorRefUrl ? 'INTERIOR' : 'EXTERIOR';
                                                                    handleProjectSelectForSubmit(project);
                                                                    setDetectedStep(currentVersion.category);
                                                                    setActiveTab('SUBMIT');
                                                                    setSubmitStep('UPLOAD_RENDER');
                                                                    setViewingGroupParams(null); // Close the modal
                                                                }}
                                                                className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                                            >
                                                                <PlusCircle size={18} /> Upload New Version
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            {isLocked ? (
                                                                <div className="text-zinc-500 font-bold flex flex-col items-center gap-2">
                                                                    <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800"><Lock size={20} /></div>
                                                                    <span className="text-xs uppercase tracking-widest mt-2">Stage Locked</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-yellow-600 font-bold flex flex-col items-center gap-2">
                                                                    <div className="p-3 bg-yellow-900/20 rounded-full border border-yellow-700/30"><Clock size={24} /></div>
                                                                    <span className="text-xs uppercase tracking-widest mt-2">Awaiting Review...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                     )}
                                 </div>
                             </div>
                        </div>
                      )
                  })()}
              </div>
          )}

          {activeTab === 'SUBMIT' && currentUser.role === 'STUDENT' && (
             <div className="h-[calc(100vh-140px)] flex flex-col">
                {submitStep !== 'VERIFY' && (
                   <div className="flex items-center justify-center mb-10">
                       <StepIndicator step={1} current={submitStep === 'SELECT_PROJECT' ? 1 : 2} label="Select Project" />
                       <div className="w-16 h-[1px] bg-zinc-800 mx-4" />
                       <StepIndicator step={2} current={submitStep === 'SELECT_PROJECT' ? 1 : 2} label="Upload Render" />
                   </div>
                )}

                <div className="flex-1 flex flex-col bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl backdrop-blur-sm">
                  {submitStep === 'SELECT_PROJECT' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
                        <div>
                            <h3 className="text-3xl font-black tracking-tight mb-2">Select Project Track</h3>
                            <p className="text-zinc-400">Choose which project you are submitting work for</p>
                        </div>
                        <div className="flex gap-8">
                            <button onClick={() => handleProjectSelectForSubmit('INTERIOR')} className="w-72 h-80 bg-zinc-900/50 border border-white/5 hover:border-[#c7023a] hover:bg-zinc-800/80 rounded-2xl transition-all flex flex-col items-center justify-center gap-6 group">
                                <div className="p-6 rounded-full bg-zinc-800 group-hover:bg-[#c7023a] transition-colors shadow-lg">
                                    <Armchair size={48} className="text-zinc-400 group-hover:text-white transition-colors" /> 
                                </div>
                                <div>
                                    <span className="font-bold text-xl block mb-1">Interior Project</span>
                                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Continue Progress</span>
                                </div>
                            </button>
                            <button onClick={() => handleProjectSelectForSubmit('EXTERIOR')} className="w-72 h-80 bg-zinc-900/50 border border-white/5 hover:border-[#c7023a] hover:bg-zinc-800/80 rounded-2xl transition-all flex flex-col items-center justify-center gap-6 group">
                                <div className="p-6 rounded-full bg-zinc-800 group-hover:bg-[#c7023a] transition-colors shadow-lg">
                                    <Building2 size={48} className="text-zinc-400 group-hover:text-white transition-colors" /> 
                                </div>
                                <div>
                                    <span className="font-bold text-xl block mb-1">Exterior Project</span>
                                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Continue Progress</span>
                                </div>
                            </button>
                        </div>
                    </div>
                  )}

                  {submitStep === 'UPLOAD_RENDER' && detectedStep && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in relative">
                       <button onClick={() => setSubmitStep('SELECT_PROJECT')} className="absolute top-10 left-10 text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold tracking-wide"><ArrowRight className="rotate-180" size={16}/> BACK</button>
                       <div className="text-center">
                          <h3 className="text-4xl font-black mb-3 tracking-tighter">
                             Upload {getAssignmentDisplayName(detectedStep)}
                          </h3>
                          <p className="text-zinc-400 text-base">
                             Submitting for <span className="text-[#c7023a] font-bold">{selectedProjectForSubmit}</span> Project
                          </p>
                       </div>
                       
                       <label className="cursor-pointer group relative">
                            <div className="w-96 h-64 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-500 transition-all">
                                <Upload size={48} className="text-zinc-600 group-hover:text-white mb-4 transition-colors" />
                                <span className="font-bold text-lg text-zinc-300">Click to Browse</span>
                                <span className="text-xs text-zinc-600 mt-2">Select one or more images</span>
                            </div>
                            {/* ADDED: Multiple attribute for multi-upload */}
                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, setUploadRenders, 'renders', () => setSubmitStep('VERIFY'))} />
                       </label>
                    </div>
                  )}

                  {submitStep === 'VERIFY' && uploadRenders.length > 0 && (
                    <div className="flex h-full w-full">
                       <div className="flex-1 bg-black relative">
                          <ComparisonViewer 
                            refImage={selectedProjectForSubmit === 'INTERIOR' ? currentUser.interiorRefUrl! : currentUser.exteriorRefUrl!}
                            renderImage={uploadRenders[uploadRenders.length - 1]} // Show the last uploaded image as preview
                            mode={compMode}
                            setMode={setCompMode}
                            fullViewSource={fullViewSource}
                            onFullViewToggle={() => setFullViewSource(prev => prev === 'REF' ? 'RENDER' : 'REF')}
                          />
                          {uploadRenders.length > 1 && (
                              <div className="absolute bottom-4 left-4 bg-black/60 px-4 py-2 rounded-lg text-xs font-bold text-white border border-white/10 backdrop-blur">
                                  + {uploadRenders.length - 1} other files selected
                              </div>
                          )}
                       </div>

                       <div className="w-96 bg-[#0a0a0a] border-l border-white/5 flex flex-col p-8 z-10 shadow-2xl">
                          <div className="mb-8">
                              <h3 className="font-bold text-white text-xl mb-2 tracking-tight">Verify Submission</h3>
                              <p className="text-xs text-zinc-500 leading-relaxed">Please verify your render aligns perfectly with the reference before submitting.</p>
                          </div>
                          
                          <div className="flex-1">
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Student Note</label>
                              <textarea 
                                placeholder="Add a note for the instructor..."
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-white outline-none focus:border-[#c7023a] resize-none h-40 transition-all placeholder:text-zinc-700"
                                value={submissionMessage}
                                onChange={e => setSubmissionMessage(e.target.value)}
                              />
                          </div>

                          <div className="mt-auto space-y-4 pt-8 border-t border-white/5">
                              <button onClick={handleSubmitAssignment} className="w-full bg-[#c7023a] hover:bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-1">
                                  {isResubmission ? 'Resubmit Fix' : `Submit ${uploadRenders.length} File${uploadRenders.length > 1 ? 's' : ''}`} <ArrowRight size={18} />
                              </button>
                              <button onClick={() => setSubmitStep('UPLOAD_RENDER')} className="w-full py-2 rounded-lg font-bold text-zinc-500 hover:text-white text-xs tracking-wide">
                                  SELECT DIFFERENT IMAGES
                              </button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
             </div>
          )}

          {currentUser.role === 'TEACHER' && activeTab === 'DASHBOARD' && (
             renderTeacherDashboard()
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
