import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Image,
  Upload,
  Users, 
  Settings, 
  Menu, 
  X, 
  Plus, 
  Minus,
  Moon,
  Sun,
  Search, 
  UserPlus, 
  Download, 
  LogOut, 
  Trash2, 
  UserMinus,
  UserCheck,
  CheckCircle,
  Check,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Edit2,
  ExternalLink,
  Eye,
  Camera,
  RotateCcw,
  RefreshCcw,
  Cloud,
  Copy,
  User,
  Share,
  Mail,
  Filter,
  Heart,
  Facebook,
  MessageSquare,
  Phone,
  PhoneCall,
  MapPin,
  Info,
  LayoutGrid,
  Maximize2,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  PieChart as LucidePieChart,
  BarChart3,
  Scale,
  BookOpen,
  FileUp,
  GripVertical,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import SplashScreen from './components/SplashScreen';

// Navigation configuration
const TAB_ICONS: Record<string, any> = {
  members: Users,
  ministries: LayoutGrid,
  assembleia: FileText,
  reports: TrendingUp,
  rh: Users,
  normativos: Scale,
  adm: Settings
};

const DEFAULT_NAV_ITEMS = [
  { id: 'members', label: 'Membros' },
  { id: 'ministries', label: 'Ministérios' },
  { id: 'assembleia', label: 'Reuniões' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'rh', label: 'RH' },
  { id: 'normativos', label: 'Atos normativos' },
  { id: 'adm', label: 'ADM' },
];
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth, firebaseConfig, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Offine Cache Helpers ---
const loadFromCache = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(`cache_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading cache for ${key}:`, error);
    return defaultValue;
  }
};

const saveToCache = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving cache for ${key}:`, error);
  }
};

  // --- Error Handling Pattern ---
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
      emailVerified?: boolean | null;
      isAnonymous?: boolean | null;
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    // Cast to any to access potential code property
    const err = error as any;
    const errorStr = err instanceof Error ? err.message : String(err);
    const errorCode = err.code || '';
    
    const isQuotaError = 
      errorStr.includes('Quota limit exceeded') || 
      errorStr.includes('resource-exhausted') || 
      errorStr.toLowerCase().includes('quota') ||
      errorStr.includes('quota-exceeded') ||
      errorCode === 'resource-exhausted' ||
      errorCode === 'quota-exceeded';

    const errInfo: FirestoreErrorInfo = {
      error: errorStr,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    
    if (isQuotaError) {
      console.warn(`Firestore Quota Limit Hit (${operationType} @ ${path || 'unknown'}): Switching to local cache mode.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      }
      return; // Gracefully return without crashing the app, relying on caches!
    }

    console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
    console.error('Unhandled Firestore Error:', errorStr);
  };

  // --- Storage Utils with Compression ---
  const uploadFile = async (path: string, file: File): Promise<string> => {
    if (!auth.currentUser) {
      throw new Error("Você precisa estar autenticado para fazer upload de arquivos.");
    }

    // Simple image compression using canvas
    const compressImage = (imageFile: File): Promise<Blob> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = (event) => {
          const img = new window.Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; // Reduced further for profile optimization
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(imageFile);
            }, 'image/jpeg', 0.6); // Slightly lower quality for faster upload
          };
        };
      });
    };

    const storageRef = ref(storage, path);
    
    let fileToUpload: Blob | File = file;
    if (file.type.startsWith('image/')) {
      console.log("Comprimindo imagem antes do upload...");
      fileToUpload = await compressImage(file);
      console.log(`Imagem comprimida. Novo tamanho: ${fileToUpload.size} bytes (Redução: ${Math.round((1 - fileToUpload.size / file.size) * 100)}%)`);
    }

    console.log(`Iniciando upload para: ${path} (Tamanho original: ${file.size} bytes). Usuário: ${auth.currentUser.uid}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }, 
        (error: any) => {
          console.error(`Erro crítico no upload para ${path}:`, error);
          let message = "Erro ao enviar a imagem.";
          if (error.code === 'storage/unauthorized') {
            message = "Sem permissão para fazer upload. Verifique as regras de segurança.";
          } else if (error.code === 'storage/quota-exceeded') {
            message = "Cota de armazenamento excedida.";
          }
          reject(new Error(message));
        }, 
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`URL de download obtida: ${downloadUrl}`);
            resolve(downloadUrl);
          } catch (e: any) {
            reject(e);
          }
        }
      );
    });
  };

  // --- Utils ---
  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  const safeFormatDate = (dateStr: string | undefined | null, formatStr: string = 'dd/MM/yyyy') => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, formatStr);
    } catch (e) {
      console.error("Date formatting error:", e);
      return '';
    }
  };

  const calculateAge = (birthDate: string | undefined | null) => {
    if (!birthDate) return null;
    try {
      const birth = new Date(birthDate);
      if (isNaN(birth.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (e) {
      return null;
    }
  };

// --- Types ---
interface Relationship {
  memberId: string;
  type: string;
}

interface RelationshipType {
  id: string;
  name: string;
}

interface MemberMinistry {
  ministryId: string;
  role: string;
}

interface MinistryRole {
  id: string;
  name: string;
}

interface MemberFunction {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
  function: string;
  ministryId?: string; // Mantido para compatibilidade
  ministryIds?: string[]; // Múltiplos ministérios
  ministries?: MemberMinistry[];
  relationships?: Relationship[];
  gender?: 'Homem' | 'Mulher';
  birthDate: string;
  startDate: string;
  photoUrl?: string;
  isActive: boolean;
  isAbsent?: boolean;
  exitDate?: string;
  exitReason?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  createdAt: any;
  updatedAt: any;
}

interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status?: 'pending' | 'approved' | 'blocked';
  isFullAdmin?: boolean;
  requestAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  handledByEmail?: string;
  handledByUid?: string;
  createdAt: any;
}

interface Ministry {
  id: string;
  name: string;
  color: string;
  description?: string;
  photoUrl?: string;
  createdAt: any;
  updatedAt: any;
}

interface Ata {
  id: string;
  number: string;
  date: string;
  content: string;
  type: 'Assembleia' | 'Reunião';
  photoUrl?: string;
  signer1Role?: string;
  signer1Name?: string;
  signer2Role?: string;
  signer2Name?: string;
  createdAt: any;
  updatedAt: any;
}

interface Presenca {
  id: string;
  ataNumber: string;
  date: string;
  type: 'Assembleia' | 'Reunião';
  createdAt: any;
  updatedAt: any;
}

interface UndoAction {
  type: 'delete' | 'update' | 'add' | 'bulk_delete' | 'bulk_update';
  collection: string;
  id?: string;
  ids?: string[];
  data: any;
  message: string;
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed,
  showDragHandle = false
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  collapsed: boolean;
  showDragHandle?: boolean;
}) => (
  <div
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className={cn(
      "flex items-center w-full p-4 rounded-[1.5rem] transition-all duration-300 group relative active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ibc-teal/50",
      active 
        ? "bg-ibc-teal text-white shadow-lg shadow-ibc-teal/20" 
        : "text-gray-500 dark:text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:text-gray-50"
    )}
  >
    {showDragHandle && !collapsed && (
      <div className="absolute left-2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>
    )}
    <div className={cn(
      "flex items-center justify-center transition-transform duration-300",
      active ? "scale-110" : "scale-100",
      !collapsed && (showDragHandle ? "ml-4 mr-4" : "mr-4")
    )}>
      <Icon className="w-5 h-5 flex-shrink-0" />
    </div>
    {!collapsed && <span className="font-bold text-sm tracking-tight whitespace-nowrap">{label}</span>}
    {active && !collapsed && (
      <motion.div 
        layoutId="activeIndicator"
        className="absolute left-1 w-1 h-6 bg-white dark:bg-[#111] rounded-full"
      />
    )}
    {collapsed && (
      <div className="absolute left-20 bg-gray-900/85 backdrop-blur-[20px] border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 translate-x-[-10px] group-hover:translate-x-0">
        {label}
      </div>
    )}
  </div>
);

const AccessControlModal = ({ 
  isOpen, 
  onClose, 
  pendingUsers, 
  onStartApproval, 
  onReject 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  pendingUsers: AppUser[]; 
  onStartApproval: (user: AppUser) => void;
  onReject: (id: string, email: string) => void;
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Solicitações de Acesso" maxWidth="max-w-md">
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {pendingUsers.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhuma solicitação pendente</p>
        </div>
      ) : (
        pendingUsers.map((user) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-[10px] font-black text-ibc-teal uppercase tracking-[0.2em]">Pendente de Aprovação</span>
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 truncate">{user.email}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Solicitado em: {user.requestAt?.seconds ? new Date(user.requestAt.seconds * 1000).toLocaleString('pt-BR') : 'Recentemente'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => onStartApproval(user)}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Aprovar
              </button>
              <button
                onClick={() => onReject(user.id, user.email)}
                className="flex-1 bg-rose-50 text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Recusar
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  </Modal>
);

const RoleSelectionModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  user: { id: string, email: string } | null;
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (role: 'admin' | 'user') => void;
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Definir Nível de Acesso" maxWidth="max-w-md">
    <div className="flex flex-col gap-6">
      <div className="bg-ibc-teal/5 p-4 rounded-2xl border border-ibc-teal/10">
        <p className="text-[10px] text-ibc-teal font-black uppercase tracking-widest mb-1">Usuário em Aprovação</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onConfirm('admin')}
          className="flex flex-col items-start p-5 rounded-3xl border-2 border-gray-100 dark:border-[#222] hover:border-ibc-teal hover:bg-ibc-teal/[0.02] transition-all group text-left"
        >
          <div className="w-10 h-10 bg-ibc-teal/10 text-ibc-teal rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 mb-1">Administrador</h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed uppercase tracking-tight">
            Acesso total ao sistema. Pode cadastrar, editar, excluir e gerenciar usuários.
          </p>
        </button>

        <button
          onClick={() => onConfirm('user')}
          className="flex flex-col items-start p-5 rounded-3xl border-2 border-gray-100 dark:border-[#222] hover:border-ibc-teal hover:bg-ibc-teal/[0.02] transition-all group text-left"
        >
          <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <User className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 mb-1">Usuário</h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed uppercase tracking-tight">
            Acesso limitado. Pode visualizar e editar membros, mas não acessa funções administrativas.
          </p>
        </button>
      </div>

      <button
        onClick={onClose}
        className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:text-gray-300 transition-colors py-2"
      >
        Cancelar
      </button>
    </div>
  </Modal>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", className = "", fullscreen = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string; className?: string; fullscreen?: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn("fixed inset-0 z-[110] flex items-center justify-center overflow-hidden", fullscreen ? "p-0" : "p-2 sm:p-6")}>
          {/* Overlay - Synchronized with Content */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[4px] cursor-pointer"
            onClick={onClose}
          />
          
          {/* Content - Spring Animation for Fluidity */}
          <motion.div 
            initial={fullscreen ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={fullscreen ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 32,
              mass: 0.8
            }}
            className={cn(
              fullscreen 
                ? "relative bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border dark:border-white/10 shadow-none w-full h-full max-w-full max-h-full flex flex-col overflow-hidden rounded-none border-0"
                : "relative bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden",
              maxWidth,
              className
            )}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-3 shrink-0 border-b border-gray-100 dark:border-[#222]">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-50 tracking-tight">{title}</h3>
              <button 
                onClick={onClose} 
                className="p-2.5 hover:bg-gray-100 dark:bg-[#1a1a1a] rounded-full transition-colors focus:outline-none"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  // Debug marker for user
  const [showDebug, setShowDebug] = useState(true);

  // Connection/Quota warning state
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Register listener for custom quota event
  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // Auto-cache appUser
  useEffect(() => {
    if (appUser) {
      saveToCache('appUser', appUser);
    }
  }, [appUser]);
  const [activeTab, setActiveTab] = useState<'members' | 'ministries' | 'assembleia' | 'reports' | 'rh' | 'adm' | 'normativos'>('members');
  const [assembleiaSubTab, setAssembleiaSubTab] = useState<'assembleia' | 'reuniao'>('assembleia');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
    if (isDark) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  };

  const [members, setMembers] = useState<Member[]>(() => loadFromCache<Member[]>('members', []));
  const [memberFunctions, setMemberFunctions] = useState<MemberFunction[]>(() => loadFromCache<MemberFunction[]>('memberFunctions', []));
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>(() => loadFromCache<RelationshipType[]>('relationshipTypes', []));
  const [isMemberFunctionsCollapsed, setIsMemberFunctionsCollapsed] = useState(true);
  const [isRelationshipTypesCollapsed, setIsRelationshipTypesCollapsed] = useState(true);
  const [isRHFilterCollapsed, setIsRHFilterCollapsed] = useState(true);
  const [rhFilterType, setRhFilterType] = useState<'all' | 'relationship' | 'function' | 'couples'>('all');
  const [rhSelectedValue, setRhSelectedValue] = useState<string>('');
  
  const [isEditFunctionModalOpen, setIsEditFunctionModalOpen] = useState(false);
  const [isAddFunctionModalOpen, setIsAddFunctionModalOpen] = useState(false);
  const [isViewFunctionDetailsModalOpen, setIsViewFunctionDetailsModalOpen] = useState(false);
  const [isEditRelationshipTypeModalOpen, setIsEditRelationshipTypeModalOpen] = useState(false);
  const [isAddRelationshipTypeModalOpen, setIsAddRelationshipTypeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStep, setExportStep] = useState<'selection' | 'fields'>('selection');
  const [exportFilter, setExportFilter] = useState<'ativos' | 'ausentes' | 'inativos' | 'todos' | 'unico'>('todos');
  const [selectedExportMemberId, setSelectedExportMemberId] = useState("");
  const [exportFields, setExportFields] = useState<string[]>(['name', 'function', 'gender', 'birthDate', 'baptismDate', 'ministries', 'relationships']);
  const [selectAllFields, setSelectAllFields] = useState(true);

  const availableExportFields = [
    { id: 'name', label: 'Nome Completo' },
    { id: 'function', label: 'Função' },
    { id: 'gender', label: 'Sexo' },
    { id: 'birthDate', label: 'Data de Nascimento' },
    { id: 'baptismDate', label: 'Data de Batismo' },
    { id: 'ministries', label: 'Ministérios' },
    { id: 'relationships', label: 'Parentesco/Família' },
    { id: 'phone', label: 'Telefone' },
    { id: 'email', label: 'E-mail' },
  ];
  const [selectedFunction, setSelectedFunction] = useState<MemberFunction | null>(null);
  const [expandedFunctionIds, setExpandedFunctionIds] = useState<Record<string, boolean>>({});
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType | null>(null);
  const [isAddingNewFunction, setIsAddingNewFunction] = useState(false);
  const [newFunctionValue, setNewFunctionValue] = useState("");
  const [isFormDirty, setIsFormDirty] = useState(false);

  const resetModalStates = () => {
    setIsFormDirty(false);
    setIsAddMemberModalOpen(false);
    setIsEditMemberModalOpen(false);
    setIsAddMinistryModalOpen(false);
    setIsEditMinistryModalOpen(false);
    setIsAddAtaModalOpen(false);
    setIsEditAtaModalOpen(false);
    setIsAddPresencaModalOpen(false);
    setIsEditPresencaModalOpen(false);
    setIsAddUserModalOpen(false);
    setIsDeactivateModalOpen(false);
    setIsEditFunctionModalOpen(false);
    setIsAddFunctionModalOpen(false);
    setIsViewFunctionDetailsModalOpen(false);
    setIsEditRelationshipTypeModalOpen(false);
    setIsAddRelationshipTypeModalOpen(false);
    setIsExportModalOpen(false);
    setExportStep('selection');
    setExportFilter('todos');
    setExportFields(['name', 'function', 'gender', 'birthDate', 'baptismDate', 'ministries', 'relationships']);
    setSelectAllFields(true);
    setSelectedFunction(null);
    setSelectedRelationshipType(null);
    setIsAddingNewFunction(false);
    setNewFunctionValue("");
    setPhotoPreview(null);
    setTempRelationships([]);
    setTempMinistryIds([]);
    setTempMemberMinistries([]);
    setNewMinistryRoleValue("");
    setIsAddingNewMinistryRole(false);
  };

  const handleModalCloseWithCheck = (closeFn: () => void) => {
    if (isFormDirty) {
      showConfirm(
        "Alterações não salvas",
        "Você tem alterações não salvas. Se sair agora, perderá o que editou. Deseja realmente sair?",
        () => {
          setIsFormDirty(false);
          closeFn();
        }
      );
    } else {
      closeFn();
    }
  };

  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const normalizeString = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  const handleMaskedInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    maskFn: (val: string) => string
  ) => {
    const input = e.target;
    const rawValue = input.value;
    const selectionStart = input.selectionStart;

    if (selectionStart === null) {
      input.value = maskFn(rawValue);
      return;
    }

    // Count core characters (digits and + symbol) before the cursor in the unformatted input
    let coreCharsBeforeCursor = 0;
    for (let i = 0; i < selectionStart; i++) {
      if (/[0-9+]/.test(rawValue[i])) {
        coreCharsBeforeCursor++;
      }
    }

    const formattedValue = maskFn(rawValue);
    input.value = formattedValue;

    // Find the position in the formatted value that has exactly coreCharsBeforeCursor core characters before it
    let targetSelectionStart = 0;
    let coreCharsFound = 0;
    while (targetSelectionStart < formattedValue.length && coreCharsFound < coreCharsBeforeCursor) {
      if (/[0-9+]/.test(formattedValue[targetSelectionStart])) {
        coreCharsFound++;
      }
      targetSelectionStart++;
    }

    // Set selection synchronously
    input.setSelectionRange(targetSelectionStart, targetSelectionStart);

    // Safeguard to execute asynchronously in the next macrotask as some browsers
    // override selection during default key/input event processing.
    setTimeout(() => {
      try {
        input.setSelectionRange(targetSelectionStart, targetSelectionStart);
      } catch (err) {
        // Ignored
      }
    }, 0);
  };

  const formatPhone = (val: string) => {
    const numeric = val.replace(/[^\d+]/g, '');
    if (numeric.startsWith('+')) {
      return numeric;
    }
    const digits = numeric.replace(/\D/g, '');
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCEP = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 5) {
      return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const getRawPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const getWhatsAppNumber = (phone: string) => {
    let raw = getRawPhoneNumber(phone);
    if (raw.length === 0) return '';
    if (raw.length <= 11 && !raw.startsWith('55')) {
      raw = '55' + raw;
    }
    return raw;
  };

  const getMapsUrl = (member: Member) => {
    const parts = [
      member.logradouro,
      member.numero,
      member.bairro,
      member.cidade,
      member.estado,
      member.cep,
      member.pais || "Brasil"
    ].filter(Boolean);
    const fullAddress = parts.join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  };

  const hasAddress = (member: Member) => {
    return !!(member.logradouro || member.numero || member.cep || member.bairro || member.cidade);
  };

  const handleCEPLookup = async (cepValue: string, isEdit: boolean) => {
    const rawCep = cepValue.replace(/\D/g, '');
    if (rawCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const formSelector = isEdit ? 'form[onSubmit*="handleEditMember"]' : 'form[onSubmit*="handleAddMember"]';
          const formObj = document.querySelector(formSelector) as HTMLFormElement;
          if (formObj) {
            const logradouroInput = formObj.querySelector('input[name="logradouro"]') as HTMLInputElement;
            const bairroInput = formObj.querySelector('input[name="bairro"]') as HTMLInputElement;
            const cidadeInput = formObj.querySelector('input[name="cidade"]') as HTMLInputElement;
            const estadoInput = formObj.querySelector('input[name="estado"]') as HTMLInputElement;
            const paisInput = formObj.querySelector('input[name="pais"]') as HTMLInputElement;
            
            if (logradouroInput) logradouroInput.value = data.logradouro || '';
            if (bairroInput) bairroInput.value = data.bairro || '';
            if (cidadeInput) cidadeInput.value = data.localidade || '';
            if (estadoInput) estadoInput.value = data.uf || '';
            if (paisInput) paisInput.value = 'Brasil';
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedFunction, setExpandedFunction] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Service Worker and Update States
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const runningVersionRef = useRef<string | null>(null);
  
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!(
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone || 
        document.referrer.includes('android-app://')
      );
    }
    return false;
  });

  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = !!(
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone || 
        document.referrer.includes('android-app://')
      );
      if (isStandaloneMode) return false;
    }
    return !localStorage.getItem('pwa_install_dismissed');
  });

  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const handleCloseBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
    localStorage.setItem('pwa_install_dismissed_time', Date.now().toString());
  };

  // PWA Install Prompt Detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (navigator as any).standalone || 
                             document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      setShowInstallBanner(false);
      setShowInstallModal(false);
      return;
    }

    // Set up a listener for changes to standalone display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      const active = e.matches;
      setIsStandalone(active);
      if (active) {
        setShowInstallBanner(false);
        setShowInstallModal(false);
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaQueryChange);
    } else {
      mediaQuery.addListener(handleMediaQueryChange);
    }

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowInstallBanner(false);
      setShowInstallModal(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    let timeoutId: any = null;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isDismissed = localStorage.getItem('pwa_install_dismissed');
      const lastDismissedTime = localStorage.getItem('pwa_install_dismissed_time');
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      
      const shouldShow = !isDismissed || (lastDismissedTime && now - parseInt(lastDismissedTime) > threeDays);

      if (shouldShow) {
        timeoutId = setTimeout(() => setShowInstallModal(true), 3000);
      }
    };

    // For iOS, we don't have beforeinstallprompt, so we check manually
    if (isIOSDevice) {
      const isDismissed = localStorage.getItem('pwa_install_dismissed');
      const lastDismissedTime = localStorage.getItem('pwa_install_dismissed_time');
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      
      const shouldShow = !isDismissed || (lastDismissedTime && now - parseInt(lastDismissedTime) > threeDays);
      if (shouldShow) {
        timeoutId = setTimeout(() => setShowInstallModal(true), 5000);
      }
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaQueryChange);
      } else {
        mediaQuery.removeListener(handleMediaQueryChange);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallModal(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallModal(false);
      setShowInstallBanner(false);
    }
  };

  // --- Service Worker Registration & PWA Update Handler ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Register our service worker manually since we want to handle update prompts
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        setSwRegistration(reg);
        console.log('SW registered successfully:', reg);

        // 1. Check if there's already an active but waiting service worker on load
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdateBanner(true);
        }

        // 2. Listen for future service worker updates
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (installing.state === 'installed') {
              // Only if we already had a running controller, meaning this is a real update
              if (navigator.serviceWorker.controller) {
                setWaitingWorker(installing);
                setShowUpdateBanner(true);
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });

    // 3. Listen to controller changes to reload when update is activated
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // --- Check for updates on load, app focus or periodically ---
  useEffect(() => {
    let checkInterval: any = null;
    let isMounted = true;

    const checkVersion = async (isInitial = false) => {
      try {
        const response = await fetch('/version.json?t=' + Date.now(), {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) return;
        const data = await response.json();
        
        if (isInitial) {
          runningVersionRef.current = data.version;
          console.log('App initial version loaded:', data.version);
        } else {
          if (runningVersionRef.current && data.version && data.version !== runningVersionRef.current) {
            console.log('New update detected! Current:', runningVersionRef.current, 'New:', data.version);
            setShowUpdateBanner(true);
            
            // Also trigger a SwRegistration update check to download sw.js if available
            if (swRegistration) {
              swRegistration.update().catch(err => console.debug("Auto SW update call:", err));
            }
          }
        }
      } catch (err) {
        console.debug('Failed to check app version:', err);
      }
    };

    // Initial check
    checkVersion(true);

    // Check version every 30 seconds for fast update detection
    checkInterval = setInterval(() => {
      if (isMounted) checkVersion(false);
    }, 30000);

    // Check version & sw registration when window/tab returns to focus
    const handleFocus = () => {
      if (isMounted) checkVersion(false);
      if (swRegistration) {
        swRegistration.update().catch(err => console.debug("Failed SW update on focus:", err));
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [swRegistration]);

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Bypasses browser cache to reload fresh assets
      window.location.reload();
    }
  };

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [ministries, setMinistries] = useState<Ministry[]>(() => loadFromCache<Ministry[]>('ministries', []));
  const [atas, setAtas] = useState<Ata[]>(() => loadFromCache<Ata[]>('atas', []));
  const [presencas, setPresencas] = useState<Presenca[]>(() => loadFromCache<Presenca[]>('presencas', []));
  const [users, setUsers] = useState<AppUser[]>(() => loadFromCache<AppUser[]>('users', []));
  const [appSettings, setAppSettings] = useState<any>(() => loadFromCache<any>('settings', { 
    logoUrl: '', 
    appName: 'IBC Coqueiral', 
    churchCnpj: '',
    navOrder: DEFAULT_NAV_ITEMS.map(i => i.id)
  }));
  const [sideNavItems, setSideNavItems] = useState(DEFAULT_NAV_ITEMS);
  
  // Dynamic PWA Update Effect
  useEffect(() => {
    const updateDynamicMetadata = () => {
      const logoUrl = appSettings.logoUrl || '/icon-192.png';
      const appName = appSettings.appName || 'Secretaria IBC';
      
      // Keep manifest link stable at /manifest.json for reliable PWA install prompt triggers
      
      // Update Apple Icon
      const appleIcon = document.getElementById('apple-icon') as HTMLLinkElement;
      if (appleIcon) {
        appleIcon.href = logoUrl;
      }
      
      // Update Favicon
      const favicon = document.getElementById('favicon') as HTMLLinkElement;
      if (favicon) {
        favicon.href = logoUrl;
      }

      // Update Windows Tile
      const msTile = document.getElementById('ms-tile-image');
      if (msTile) {
        msTile.setAttribute('content', logoUrl);
      }
      
      // Update App Title and Apple Status
      document.title = appName;
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) appleTitle.setAttribute('content', appName);
    };

    updateDynamicMetadata();
  }, [appSettings.logoUrl, appSettings.appName]);

  useEffect(() => {
    if (isReorderingNav.current) return;
    if (appSettings.navOrder && Array.isArray(appSettings.navOrder)) {
      const ordered = appSettings.navOrder
        .map((id: string) => DEFAULT_NAV_ITEMS.find(item => item.id === id))
        .filter((item): item is typeof DEFAULT_NAV_ITEMS[0] => !!item);
      
      const missing = DEFAULT_NAV_ITEMS.filter(item => !appSettings.navOrder.includes(item.id));
      setSideNavItems([...ordered, ...missing]);
    }
  }, [appSettings.navOrder]);



  // Dynamic Manifest and Icon Updates
  useEffect(() => {
    // Current user name and photo
    const displayName = user?.displayName || 'IBC';
    const profilePhoto = user?.photoURL || appSettings.logoUrl || '/icon-192.png';
    
    // Keep manifest link stable at /manifest.json for reliable PWA install prompt triggers

    // Update Apple Touch Icon (iOS)
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', profilePhoto);

    // Update favicon as well
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.setAttribute('rel', 'icon');
      document.head.appendChild(favicon);
    }
    favicon.setAttribute('href', profilePhoto);
  }, [user, appSettings]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingEstatuto, setIsUploadingEstatuto] = useState(false);
  const [isUploadingRegimento, setIsUploadingRegimento] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const isReorderingNav = useRef(false);
  const navSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [approvingUser, setApprovingUser] = useState<{ id: string, email: string } | null>(null);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const [galleryPickerType, setGalleryPickerType] = useState<'member-add' | 'member-edit'>('member-add');
  const [searchQuery, setSearchQuery] = useState('');
  const [ministrySearchQuery, setMinistrySearchQuery] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'google'>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modals
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isViewMemberModalOpen, setIsViewMemberModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const publicAppLink = "https://secretariaibc.vercel.app/";
  const [isAddMinistryModalOpen, setIsAddMinistryModalOpen] = useState(false);
  const [isEditMinistryModalOpen, setIsEditMinistryModalOpen] = useState(false);
  const [isAddAtaModalOpen, setIsAddAtaModalOpen] = useState(false);
  const [isEditAtaModalOpen, setIsEditAtaModalOpen] = useState(false);
  const [isViewAtaModalOpen, setIsViewAtaModalOpen] = useState(false);
  const [isAddPresencaModalOpen, setIsAddPresencaModalOpen] = useState(false);
  const [isEditPresencaModalOpen, setIsEditPresencaModalOpen] = useState(false);
  const [isViewPresencaModalOpen, setIsViewPresencaModalOpen] = useState(false);
  const [isMinistryMembersModalOpen, setIsMinistryMembersModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [selectedAta, setSelectedAta] = useState<Ata | null>(null);
  const [selectedPresenca, setSelectedPresenca] = useState<Presenca | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [tempRelationships, setTempRelationships] = useState<Relationship[]>([]);
  const [tempMinistryIds, setTempMinistryIds] = useState<string[]>([]);
  const [tempMemberMinistries, setTempMemberMinistries] = useState<MemberMinistry[]>([]);
  const [ministryRoles, setMinistryRoles] = useState<MinistryRole[]>(() => loadFromCache<MinistryRole[]>('ministryRoles', []));
  const [isAddingNewMinistryRole, setIsAddingNewMinistryRole] = useState(false);
  const [newMinistryRoleValue, setNewMinistryRoleValue] = useState("");

  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'active' | 'inactive' | 'absent'>('all');

  // Ata Roles State for "Nova Ata"
  const [signer1Role, setSigner1Role] = useState('Pastor Presidente');
  const [signer2Role, setSigner2Role] = useState('Secretário 1');

  // Helper to get member name by function
  const getMemberNameByFunction = (func: string) => {
    if (!func) return "";
    const normalizedTarget = normalizeString(func);
    return members.find(m => 
      normalizeString(m.function || "").includes(normalizedTarget)
    )?.name || "";
  };

  // Custom Alert/Confirm State
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [passwordPromptConfig, setPasswordPromptConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [uiScale, setUiScale] = useState<number>(() => {
    const saved = localStorage.getItem('ui-scale');
    return saved ? parseFloat(saved) : 1;
  });
  const undoTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('ui-scale', uiScale.toString());
    document.documentElement.style.setProperty('--ui-scale', uiScale.toString());
  }, [uiScale]);

  const showAlert = (title: string, message: string) => setAlertConfig({ isOpen: true, title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmConfig({ isOpen: true, title, message, onConfirm });
  const showPasswordPrompt = (title: string, message: string, onConfirm: () => void) => {
    setEnteredPassword('');
    setPasswordPromptConfig({ isOpen: true, title, message, onConfirm });
  };

  const triggerUndo = (action: UndoAction) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoAction(action);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoAction(null);
    }, 6000); // 6 seconds for undo
  };

  // RH Filtering Helpers
  const getFilteredMembers = () => {
    if (rhFilterType === 'all') return [];
    
    if (rhFilterType === 'relationship' && rhSelectedValue) {
      // Find all members who ARE the target of this relationship type
      // A member is a "Son" if someone else lists them as "Son"
      const targetIds = new Set<string>();
      members.forEach(m => {
        m.relationships?.forEach(r => {
          if (r.type === rhSelectedValue) {
            targetIds.add(r.memberId);
          }
        });
      });
      
      let filtered = members.filter(m => targetIds.has(m.id));
      
      // Enforce gender constraints based on relationship name to prevent data entry inconsistencies
      const selectedLower = rhSelectedValue.toLowerCase().trim();
      if (['pai', 'irmão', 'esposo', 'filho', 'tio', 'avô', 'sobrinho', 'neto', 'sogro', 'genro', 'cunhado'].includes(selectedLower)) {
        filtered = filtered.filter(m => m.gender === 'Homem');
      } else if (['mãe', 'irmã', 'esposa', 'filha', 'tia', 'avó', 'sobrinha', 'neta', 'sogra', 'nora', 'cunhada'].includes(selectedLower)) {
        filtered = filtered.filter(m => m.gender === 'Mulher');
      }
      
      return filtered;
    }
    
    if (rhFilterType === 'function' && rhSelectedValue) {
      return members.filter(m => m.function === rhSelectedValue);
    }
    return [];
  };

  const getCouples = () => {
    const couples: { names: string, ids: string[], husband?: Member, wife?: Member, raw: [Member, Member] }[] = [];
    const processedIds = new Set<string>();

    members.forEach(member => {
      if (processedIds.has(member.id)) return;

      const spouseRel = member.relationships?.find(r => 
        r.type === 'Esposa' || r.type === 'Esposo' || r.type === 'Esposo(a)'
      );

      if (spouseRel) {
        const partner = members.find(m => m.id === spouseRel.memberId);
        if (partner && !processedIds.has(partner.id)) {
          let husband, wife;
          if (member.gender === 'Homem' && partner.gender === 'Mulher') {
            husband = member; wife = partner;
          } else if (member.gender === 'Mulher' && partner.gender === 'Homem') {
            husband = partner; wife = member;
          } else if (member.gender === 'Homem') {
            husband = member;
          } else if (member.gender === 'Mulher') {
            wife = member;
          } else {
            husband = member;
          }

          let nameLabel = '';
          if (husband && wife) {
             nameLabel = `${husband.name} e ${wife.name}`;
          } else {
             nameLabel = `${member.name} e ${partner.name}`;
          }

          couples.push({
            names: nameLabel,
            ids: [member.id, partner.id],
            husband,
            wife,
            raw: [member, partner]
          });
          processedIds.add(member.id);
          processedIds.add(partner.id);
        }
      }
    });

    return couples;
  };

  const handleExportRHFilterPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    if (appSettings.logoUrl) {
      try {
        // Use JPEG as fallback, but check for PNG/base64
        const format = appSettings.logoUrl.includes('png') || appSettings.logoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(appSettings.logoUrl, format, 15, 10, 25, 25);
      } catch (e) {
        console.warn("Logo error in Filter PDF:", e);
      }
    }
    
    doc.setFontSize(18);
    doc.setTextColor(6, 74, 143); // ibc-blue
    doc.setFont('helvetica', 'bold');
    doc.text(appSettings.appName, 45, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    
    let filterTitle = "";
    if (rhFilterType === 'relationship') filterTitle = `Filtro: Parentesco - ${rhSelectedValue}`;
    else if (rhFilterType === 'function') filterTitle = `Filtro: Função - ${rhSelectedValue}`;
    else if (rhFilterType === 'couples') filterTitle = `Filtro: Casais`;
    
    doc.text(filterTitle, 45, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 45, 34);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(230);
    doc.line(10, 40, pageWidth - 10, 40);

    if (rhFilterType === 'couples') {
      const couples = getCouples();
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Nomes do Casal']],
        body: couples.map((c, i) => [i + 1, c.names]),
        theme: 'striped',
        headStyles: { fillColor: [6, 74, 143], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 }
      });
      
      const lastY = (doc as any).lastAutoTable.finalY || 50;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${couples.length} Casais encontrados`, 15, lastY + 15);
    } else {
      const filtered = getFilteredMembers();
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Nome', 'Função', 'Gênero']],
        body: filtered.map((m, i) => [i + 1, m.name, m.function, m.gender || '-']),
        theme: 'striped',
        headStyles: { fillColor: [6, 74, 143], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      const lastY = (doc as any).lastAutoTable.finalY || 50;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${filtered.length} Membros encontrados`, 15, lastY + 15);
    }
    
    doc.save(`filtro-rh-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };


  // --- Navigation & Browser History Sync ---
  // Sync state with history for back button support
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        if (state.tab) setActiveTab(state.tab);
        
        // Close all modals if we go back
        setIsAddMemberModalOpen(false);
        setIsEditMemberModalOpen(false);
        setIsViewMemberModalOpen(false);
        setIsDeactivateModalOpen(false);
        setIsAddUserModalOpen(false);
        setIsShareModalOpen(false);
        setIsAddMinistryModalOpen(false);
        setIsEditMinistryModalOpen(false);
        setIsAddAtaModalOpen(false);
        setIsEditAtaModalOpen(false);
        setIsViewAtaModalOpen(false);
        setIsAddPresencaModalOpen(false);
        setIsEditPresencaModalOpen(false);
        setIsViewPresencaModalOpen(false);
        setIsMinistryMembersModalOpen(false);
        setIsGalleryPickerOpen(false);
        setIsAddFunctionModalOpen(false);
        setIsEditFunctionModalOpen(false);
        setIsViewFunctionDetailsModalOpen(false);
        setIsAddRelationshipTypeModalOpen(false);
        setIsEditRelationshipTypeModalOpen(false);
        setIsExportModalOpen(false);
        setExpandedCard(null);
        setExpandedFunction(null);
        setAlertConfig(null);
        setConfirmConfig(null);
        setPasswordPromptConfig(null);
      } else {
        // Safe reset if no state is present in pop
        setIsAddMemberModalOpen(false);
        setIsEditMemberModalOpen(false);
        setIsViewMemberModalOpen(false);
        setIsDeactivateModalOpen(false);
        setIsAddUserModalOpen(false);
        setIsShareModalOpen(false);
        setIsAddMinistryModalOpen(false);
        setIsEditMinistryModalOpen(false);
        setIsAddAtaModalOpen(false);
        setIsEditAtaModalOpen(false);
        setIsViewAtaModalOpen(false);
        setIsAddPresencaModalOpen(false);
        setIsEditPresencaModalOpen(false);
        setIsViewPresencaModalOpen(false);
        setIsMinistryMembersModalOpen(false);
        setIsGalleryPickerOpen(false);
        setIsAddFunctionModalOpen(false);
        setIsEditFunctionModalOpen(false);
        setIsViewFunctionDetailsModalOpen(false);
        setIsAddRelationshipTypeModalOpen(false);
        setIsEditRelationshipTypeModalOpen(false);
        setIsExportModalOpen(false);
        setExpandedCard(null);
        setExpandedFunction(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state
    if (!window.history.state) {
      window.history.replaceState({ tab: activeTab, root: true }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update history when tab changes
  useEffect(() => {
    if (window.history.state?.tab !== activeTab) {
      window.history.pushState({ tab: activeTab }, '');
    }
  }, [activeTab]);

  // Handle Modal History (Push state when any modal opens)
  const isAnyModalOpen = isAddMemberModalOpen || isEditMemberModalOpen || isViewMemberModalOpen || 
                         isDeactivateModalOpen || isAddUserModalOpen || isShareModalOpen || 
                         isAddMinistryModalOpen || isEditMinistryModalOpen || isAddAtaModalOpen || 
                         isEditAtaModalOpen || isViewAtaModalOpen || isAddPresencaModalOpen || 
                         isEditPresencaModalOpen || isViewPresencaModalOpen || isMinistryMembersModalOpen || 
                         isGalleryPickerOpen || isAddFunctionModalOpen || isEditFunctionModalOpen || 
                         isViewFunctionDetailsModalOpen || isAddRelationshipTypeModalOpen || isEditRelationshipTypeModalOpen || 
                         isExportModalOpen ||
                         (alertConfig?.isOpen ?? false) || (confirmConfig?.isOpen ?? false) || 
                         (passwordPromptConfig?.isOpen ?? false);

  useEffect(() => {
    if (isAnyModalOpen) {
      // If modal was just opened, push a state
      if (!window.history.state?.modal) {
        window.history.pushState({ tab: activeTab, modal: true }, '');
      }
    } else {
      // If modal was closed via UI (not back button), and we have a modal state in history, go back
      if (window.history.state?.modal) {
        window.history.back();
      }
    }
  }, [isAnyModalOpen]);

  // Specific history pushes for expandedCard and expandedFunction to allow native back button to close them directly
  useEffect(() => {
    if (expandedFunction) {
      if (window.history.state?.expandedFunction !== expandedFunction) {
        window.history.pushState({ tab: activeTab, expandedFunction }, '');
      }
    } else {
      if (window.history.state?.expandedFunction) {
        window.history.back();
      }
    }
  }, [expandedFunction]);

  useEffect(() => {
    if (expandedCard) {
      if (window.history.state?.expandedCard !== expandedCard) {
        window.history.pushState({ tab: activeTab, expandedCard }, '');
      }
    } else {
      if (window.history.state?.expandedCard) {
        window.history.back();
      }
    }
  }, [expandedCard]);

  const inverseRelationship = (type: string): string => {
    if (!type) return "";
    const t = type.trim().toLowerCase();
    switch (t) {
      case 'pai': return 'Filho(a)';
      case 'mãe': return 'Filho(a)';
      case 'filho(a)': return 'Pai'; 
      case 'filho': return 'Pai';
      case 'filha': return 'Pai';
      case 'irmão': return 'Irmão';
      case 'irmã': return 'Irmão';
      case 'esposo': return 'Esposa';
      case 'esposa': return 'Esposo';
      case 'esposo(a)': return 'Esposo(a)';
      default: return type;
    }
  };

  const getGenderedKinship = (type: string, gender?: 'Homem' | 'Mulher'): string => {
    if (!type) return "";
    if (!gender) return type;
    const t = type.trim().toLowerCase();
    
    if (t === 'pai' || t === 'mãe') return gender === 'Mulher' ? 'Mãe' : 'Pai';
    if (t === 'filho(a)' || t === 'filho' || t === 'filha') return gender === 'Mulher' ? 'Filha' : 'Filho';
    if (t === 'irmão' || t === 'irmã') return gender === 'Mulher' ? 'Irmã' : 'Irmão';
    if (t === 'esposo' || t === 'esposa' || t === 'esposo(a)') return gender === 'Mulher' ? 'Esposa' : 'Esposo';
    
    return type;
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    try {
      const { type, collection: colName, id, ids, data } = undoAction;
      if (type === 'delete' && id) {
        await setDoc(doc(db, colName, id), data);
      } else if ((type === 'bulk_delete' || type === 'bulk_update') && Array.isArray(data)) {
        const promises = data.map((item: any) => setDoc(doc(db, colName, item.id), item));
        await Promise.all(promises);
      } else if (type === 'update' && id) {
        await updateDoc(doc(db, colName, id), data);
      } else if (type === 'add' && id) {
        await deleteDoc(doc(db, colName, id));
      }
      setUndoAction(null);
    } catch (error) {
      console.error("Undo Error:", error);
      showAlert("Erro", "Não foi possível desfazer a ação.");
    }
  };

  // Re-run ESLint when any change is made to the rules. (Note: this is a reminder for the assistant)

  // Initialize Ata Roles when modal opens
  useEffect(() => {
    if (isAddAtaModalOpen) {
      setSigner1Role('Pastor Presidente');
      setSigner2Role('Secretário 1');
    }
  }, [isAddAtaModalOpen]);

  useEffect(() => {
    if (isEditAtaModalOpen && selectedAta) {
      setSigner1Role(selectedAta.signer1Role || 'Pastor Presidente');
      setSigner2Role(selectedAta.signer2Role || 'Secretário 1');
    }
  }, [isEditAtaModalOpen, selectedAta]);

  // Test Firestore Connection
  useEffect(() => {
    const testConnection = async (retries = 3) => {
      try {
        console.log("Checking Firestore connection for DB:", firebaseConfig.firestoreDatabaseId);
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection verified successfully.");
      } catch (error: any) {
        handleFirestoreError(error, OperationType.GET, 'test/connection');
        const errorStr = error instanceof Error ? error.message : String(error);
        if (errorStr.includes('Quota limit exceeded') || errorStr.includes('resource-exhausted') || errorStr.toLowerCase().includes('quota') || errorStr.includes('quota-exceeded')) {
          return;
        }
        if (retries > 0) {
          console.log(`Retrying connection check... (${retries} attempts left)`);
          setTimeout(() => testConnection(retries - 1), 2000);
          return;
        }
        if (error.code === 'permission-denied') {
          console.error("PERMISSION_DENIED: Security rules might be misconfigured or still propagating to the new database instance.");
        }
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();
  }, []);

  // Real-time Settings
  useEffect(() => {
    const unsubscribeSettings = onSnapshot(
      doc(db, 'settings', 'app'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAppSettings({
            logoUrl: data.logoUrl || '',
            appName: data.appName || 'IBC Coqueiral',
            churchCnpj: data.churchCnpj || ''
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'settings')
    );

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    // Timeout to stop loading if Firebase is taking too long
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout reached. Forcing loading false.");
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Auth
  useEffect(() => {
    console.log("Setting up auth listener...");
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        setUser(firebaseUser);
        if (firebaseUser) {
          // Listen to user document in real-time for immediate approval status update
          unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data();
              const defaultAdmins = ['secretariaibc3@gmail.com', 'secretaria1@gmail.com'];
              const isDefaultAdmin = firebaseUser.email && defaultAdmins.includes(firebaseUser.email);
              const isFullAdmin = isDefaultAdmin || !!userData.isFullAdmin;
              
              // Migração: Se o usuário existe mas não tem status, aprova automaticamente se for admin ou default admin
              if (!userData.status) {
                const status = (userData.role === 'admin' || isDefaultAdmin) ? 'approved' : 'pending';
                const role = isDefaultAdmin ? 'admin' : userData.role;
                
                try {
                  await updateDoc(doc(db, 'users', firebaseUser.uid), { status, role, isFullAdmin });
                  setAppUser({ id: snapshot.id, ...userData, status, role, isFullAdmin } as AppUser);
                } catch (e) {
                  console.error("Migration error:", e);
                  setAppUser({ id: snapshot.id, ...userData, status: 'approved', role: 'admin', isFullAdmin: true } as AppUser); // Fallback local
                }
              } else if (isDefaultAdmin && (userData.role !== 'admin' || userData.status !== 'approved' || !userData.isFullAdmin)) {
                // Force admin stay approved and full admin
                await updateDoc(doc(db, 'users', firebaseUser.uid), { status: 'approved', role: 'admin', isFullAdmin: true });
              } else {
                setAppUser({ id: snapshot.id, ...userData, isFullAdmin } as AppUser);
              }
              setLoading(false);
            } else {
              // Check if it's the default admin
              const defaultAdmins = ['secretariaibc3@gmail.com', 'secretaria1@gmail.com'];
              if (firebaseUser.email && defaultAdmins.includes(firebaseUser.email)) {
                const newAdmin: Partial<AppUser> = {
                  email: firebaseUser.email,
                  role: 'admin',
                  status: 'approved',
                  isFullAdmin: true,
                  createdAt: serverTimestamp()
                };
                try {
                  await setDoc(doc(db, 'users', firebaseUser.uid), newAdmin);
                } catch (error) {
                  handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
                }
                setAppUser({ id: firebaseUser.uid, ...newAdmin } as AppUser);
                setLoading(false);
              } else {
                // New user - don't create doc yet, set status to 'none' to show request screen
                setAppUser({ 
                  id: firebaseUser.uid, 
                  email: firebaseUser.email || '', 
                  role: 'user', 
                  status: 'none' as any 
                } as AppUser);
                setLoading(false);
              }
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            const errorStr = error instanceof Error ? error.message : String(error);
            if (errorStr.includes('Quota limit exceeded') || errorStr.includes('resource-exhausted') || errorStr.toLowerCase().includes('quota')) {
              const cachedAppUser = loadFromCache<AppUser | null>('appUser', null);
              if (cachedAppUser) {
                setAppUser(cachedAppUser);
              } else if (firebaseUser.email) {
                const defaultAdmins = ['secretariaibc3@gmail.com', 'secretaria1@gmail.com'];
                const isDefaultAdmin = defaultAdmins.includes(firebaseUser.email);
                setAppUser({
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  role: isDefaultAdmin ? 'admin' : 'user',
                  status: 'approved'
                } as AppUser);
              }
            }
            setLoading(false);
          });
        } else {
          setAppUser(null);
          setLoading(false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'auth-sync');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // --- Reports Calculation ---
  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodLabel = selectedMonth === -1 
      ? `Ano Completo de ${selectedYear}`
      : `${new Date(0, selectedMonth).toLocaleString('pt-BR', { month: 'long' })} / ${selectedYear}`;

    // Header
    if (appSettings.logoUrl) {
      try {
        doc.addImage(appSettings.logoUrl, 'JPEG', 10, 10, 25, 25);
      } catch (e) {
        console.error("PDF Logo error:", e);
      }
    }
    
    doc.setFontSize(18);
    doc.setTextColor(6, 74, 143); // ibc-blue
    doc.setFont('helvetica', 'bold');
    doc.text(appSettings.appName, 40, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    const cnpjText = `CNPJ: ${appSettings.churchCnpj || 'Não informado'}`;
    const dateText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
    doc.text(cnpjText, 40, 26);
    doc.text(dateText, 40, 31);
    
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text(`Relatório de Movimentação - ${periodLabel}`, 10, 45);

    doc.setLineWidth(0.5);
    doc.setDrawColor(243, 244, 246);
    doc.line(10, 48, pageWidth - 10, 48);

    // Smart Summary
    if (memberStats.summary) {
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // gray-600
      doc.setFont('helvetica', 'italic');
      const summaryLines = doc.splitTextToSize(memberStats.summary, pageWidth - 20);
      doc.text(summaryLines, 10, 55);
    }
    
    const summaryY = memberStats.summary ? 55 + (doc.splitTextToSize(memberStats.summary, pageWidth - 20).length * 5) + 5 : 55;

    // Movement Statistics Table
    const movementRows = Object.values(memberStats.categories).map((cat: any) => {
      const currentCount = cat.members.length;
      const prevCount = cat.prevMembers.length;
      const diff = currentCount - prevCount;
      const percentageOfTotal = members.length > 0 ? `${Math.round((currentCount / members.length) * 100)}%` : '0%';
      const variation = prevCount > 0 
        ? `${diff > 0 ? '+' : ''}${((diff / prevCount) * 100).toFixed(1)}%` 
        : (currentCount > 0 ? '+100%' : '0%');
      const trend = diff > 0 ? 'Crescimento' : (diff < 0 ? 'Redução' : 'Estável');
      
      return [cat.label, currentCount, percentageOfTotal, variation, trend];
    });

    autoTable(doc, {
      startY: summaryY,
      head: [['Indicador', 'Quantidade', '% Total', 'Variação', 'Tendência']],
      body: movementRows,
      theme: 'grid',
      headStyles: { fillColor: [6, 74, 143], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' }
      }
    });

    // Members by Function Table
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    const functionY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Membros por Função", 10, functionY);

    const functionRows = Object.entries(reportData.functionsDetails)
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
      .map(([name, data]: [string, any]) => [
        name,
        data.count,
        `${data.percentage}%`
      ]);

    autoTable(doc, {
      startY: functionY + 5,
      head: [['Função', 'Quantidade', 'Percentual']],
      body: functionRows,
      theme: 'striped',
      headStyles: { fillColor: [0, 168, 150], fontStyle: 'bold' }, // ibc-teal
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' }
      },
      foot: [['Total de Membros Ativos', members.filter(m => m.isActive !== false).length, '100%']],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - Sistema de Gestão ${appSettings.appName}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-movimentacao-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const reportData = useMemo(() => {
    const activeMembers = members.filter(m => m.isActive !== false && !m.isAbsent);
    const absentMembers = members.filter(m => m.isActive !== false && m.isAbsent);
    const inactiveMembers = members.filter(m => m.isActive === false);

    const active = activeMembers.length;
    const absent = absentMembers.length;
    const inactive = inactiveMembers.length;
    const total = members.length;
    
    const totalActiveForFunctions = members.filter(m => m.isActive !== false).length;
    
    // Group by function (excluding Inactive members)
    const functionsDetails: Record<string, { members: Member[], count: number, percentage: string }> = {};
    members.filter(m => m.isActive !== false).forEach(m => {
      const func = m.function || 'Não Definida';
      if (!functionsDetails[func]) {
        functionsDetails[func] = { members: [], count: 0, percentage: '0' };
      }
      functionsDetails[func].members.push(m);
      functionsDetails[func].count++;
    });
    
    Object.keys(functionsDetails).forEach(func => {
        const count = functionsDetails[func].count;
        functionsDetails[func].percentage = totalActiveForFunctions > 0 ? ((count / totalActiveForFunctions) * 100).toFixed(1) : '0';
    });

    const functionChartData = Object.entries(functionsDetails)
      .map(([name, data]) => ({ name, value: data.count }))
      .sort((a, b) => b.value - a.value);

    // Active vs Absent vs Inactive
    const statusChartData = [
      { name: 'Ativos', value: active },
      { name: 'Ausentes', value: absent },
      { name: 'Negativados', value: inactive }
    ];

    const COLORS = ['#00A896', '#f97316', '#EF4444'];

    const activePercentage = total > 0 ? Math.round(((active + absent) / total) * 100) : 0;

    return {
      active,
      absent,
      inactive,
      total,
      absentMembersList: absentMembers,
      functionChartData,
      statusChartData,
      activePercentage,
      COLORS,
      functionsDetails
    };
  }, [members]);

  // Data Fetching
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'members'), orderBy('name'));
    const unsubscribeMembers = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(membersData);
      saveToCache('members', membersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const unsubscribeFunctions = onSnapshot(collection(db, 'memberFunctions'), (snapshot) => {
      const functionsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name, 
        description: doc.data().description || "" 
      } as MemberFunction)).sort((a,b) => a.name.localeCompare(b.name));
      setMemberFunctions(functionsData);
      saveToCache('memberFunctions', functionsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'memberFunctions'));

    const unsubscribeMinistries = onSnapshot(collection(db, 'ministries'), (snapshot) => {
      const ministriesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name, 
        color: doc.data().color, 
        description: doc.data().description || "",
        photoUrl: doc.data().photoUrl || "",
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      } as Ministry)).sort((a,b) => a.name.localeCompare(b.name));
      setMinistries(ministriesData);
      saveToCache('ministries', ministriesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ministries'));

    // Real-time synchronization and automatic seeding of relationship types
    const unsubscribeRelationshipTypes = onSnapshot(collection(db, 'relationshipTypes'), (snapshot) => {
      const relTypesData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as RelationshipType));
      if (relTypesData.length === 0) {
        console.log("Empty relationship types, seeding default values...");
        const defaults = ['Pai', 'Mãe', 'Filho(a)', 'Irmão', 'Irmã', 'Esposo(a)'];
        const batch = writeBatch(db);
        defaults.forEach(d => {
          const docRef = doc(collection(db, 'relationshipTypes'));
          batch.set(docRef, { name: d });
        });
        batch.commit().catch(err => console.error("Error seeding relationship types:", err));
      } else {
        const sorted = relTypesData.sort((a, b) => a.name.localeCompare(b.name));
        setRelationshipTypes(sorted);
        saveToCache('relationshipTypes', sorted);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'relationshipTypes'));

    const fetchData = async () => {
      try {
        const atasSnapshot = await getDocs(query(collection(db, 'atas'), orderBy('createdAt', 'desc')));
        const atasData = atasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ata));
        setAtas(atasData);
        saveToCache('atas', atasData);

        const presencasSnapshot = await getDocs(query(collection(db, 'presencas'), orderBy('createdAt', 'desc')));
        const presencasData = presencasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presenca));
        setPresencas(presencasData);
        saveToCache('presencas', presencasData);

        const rolesSnapshot = await getDocs(collection(db, 'ministryRoles'));
        const rolesData = rolesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as MinistryRole));
        const finalRoles = rolesData.length === 0 ? [{ id: '1', name: 'Líder' }, { id: '2', name: 'Liderado' }] : rolesData.sort((a,b) => a.name.localeCompare(b.name));
        setMinistryRoles(finalRoles);
        saveToCache('ministryRoles', finalRoles);

      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'data-fetching');
      }
    };
    fetchData();

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'app'), (doc) => {
      if (doc.exists()) {
        const settingsData = doc.data();
        setAppSettings(settingsData);
        saveToCache('settings', settingsData);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    return () => {
      unsubscribeMembers();
      unsubscribeFunctions();
      unsubscribeMinistries();
      unsubscribeRelationshipTypes();
      unsubscribeSettings();
    };
  }, [user?.uid]);

  // Admin-only Users Fetching (Depends correctly on user?.uid and appUser?.role)
  useEffect(() => {
    if (!user || appUser?.role !== 'admin') {
      setUsers([]);
      return;
    }

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(usersData);
      saveToCache('users', usersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => {
      unsubscribeUsers();
    };
  }, [user?.uid, appUser?.role]);

  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>, methodOverride?: 'email' | 'google') => {
    if (e) e.preventDefault();
    if (isAuthLoading) return;

    setLoginError('');
    setIsAuthLoading(true);

    const activeMethod = methodOverride || loginMethod;

    if (activeMethod === 'google') {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        console.error("Google Login Error:", error);
        setLoginError("Erro ao entrar com Google.");
      } finally {
        setIsAuthLoading(false);
      }
      return;
    }

    if (!e) {
      console.error("handleLogin called without event in email mode");
      setIsAuthLoading(false);
      return;
    }
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim();
    const password = formData.get('password') as string || '';

    if (!email || !password) {
      setLoginError("Por favor, preencha todos os campos.");
      setIsAuthLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Login/SignUp Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError("Email ou senha incorretos.");
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError("Este email já está em uso.");
      } else if (error.code === 'auth/weak-password') {
        setLoginError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setLoginError("Erro ao processar solicitação. Verifique sua conexão.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!user) return;
    setIsAuthLoading(true);
    try {
      const newUser: Partial<AppUser> = {
        email: user.email || '',
        role: 'user',
        status: 'pending',
        requestAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', user.uid), newUser);
      setAppUser({ id: user.uid, ...newUser } as AppUser);
    } catch (error) {
      console.error("Error requesting access:", error);
      setLoginError("Erro ao enviar solicitação.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    showConfirm(
      "Confirmar Saída",
      "Deseja realmente sair da sua conta?",
      () => signOut(auth)
    );
  };
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        let dataUrl;
        if (file.type === 'image/png') {
          dataUrl = canvas.toDataURL('image/png');
        } else if (file.type === 'image/webp') {
          dataUrl = canvas.toDataURL('image/webp', 0.8);
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
        setPhotoPreview(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Iniciando handleAddMember");
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const func = formData.get('function') as string;
    const gender = formData.get('gender') as 'Homem' | 'Mulher';
    const birthDate = formData.get('birthDate') as string || '';
    const startDate = formData.get('startDate') as string || '';
    const celular = formData.get('celular') as string || '';
    const cep = formData.get('cep') as string || '';
    const logradouro = formData.get('logradouro') as string || '';
    const numero = formData.get('numero') as string || '';
    const complemento = formData.get('complemento') as string || '';
    const bairro = formData.get('bairro') as string || '';
    const cidade = formData.get('cidade') as string || '';
    const estado = formData.get('estado') as string || '';
    const pais = formData.get('pais') as string || '';
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    let finalTempRelationships = [...tempRelationships];
    const unsavedRelTypeElem = document.getElementById('kinship-type') as HTMLSelectElement;
    const unsavedRelIdElem = document.getElementById('kinship-member') as HTMLSelectElement;
    if (unsavedRelTypeElem && unsavedRelIdElem && unsavedRelIdElem.value) {
      if (!finalTempRelationships.some(r => r.memberId === unsavedRelIdElem.value)) {
        finalTempRelationships.push({ memberId: unsavedRelIdElem.value, type: unsavedRelTypeElem.value });
      }
    }

    try {
      setIsSaving(true);
      console.log("Status: isSaving = true");
      
      // Criar um timeout de segurança (120 segundos)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("A operação de cadastro excedeu o tempo limite (120s). Verifique sua conexão ou tente uma imagem menor.")), 120000)
      );

      const saveOperation = (async () => {
        let photoUrl = '';
        if (photoPreview && photoPreview.startsWith('data:image')) {
          photoUrl = photoPreview;
        } else if (photoFile) {
          console.log("Iniciando upload de foto...");
          const fileName = photoFile.name || "profile";
          photoUrl = await uploadFile(`members/${Date.now()}_${fileName}`, photoFile);
          console.log("Upload concluído com sucesso:", photoUrl);
        }

        // Verificar duplicidade por nome (ignorando maiúsculas/minúsculas e acentos)
        const isDuplicate = members.some(m => normalizeString(m.name) === normalizeString(name));
        if (isDuplicate) {
          throw new Error(`O membro "${name}" já está cadastrado no sistema.`);
        }

        console.log("Preparando batch para salvar membro...");
        const batch = writeBatch(db);
        const memberRef = doc(collection(db, 'members'));
        const memberId = memberRef.id;

        batch.set(memberRef, {
          name,
          function: func,
          ministryIds: tempMemberMinistries.map(m => m.ministryId),
          ministries: tempMemberMinistries,
          relationships: finalTempRelationships,
          gender,
          birthDate,
          startDate,
          photoUrl,
          isActive: true,
          celular,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          pais,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Sincronizar parentesco bidirecional
        if (finalTempRelationships.length > 0) {
          console.log(`Sincronizando ${finalTempRelationships.length} parentescos...`);
          const relPromises = finalTempRelationships.map(async (rel) => {
            const bRef = doc(db, 'members', rel.memberId);
            const bSnap = await getDoc(bRef);
            if (bSnap.exists()) {
              const bData = bSnap.data() as Member;
              const bRels = bData.relationships || [];
              batch.update(bRef, {
                relationships: [...bRels.filter(r => r.memberId !== memberId), { memberId: memberId, type: inverseRelationship(rel.type) }],
                updatedAt: serverTimestamp()
              });
            }
          });
          await Promise.all(relPromises);
        }

        if (func && func.trim()) {
          const normalizedFunc = func.trim();
          if (!memberFunctions.some(f => f.name.toLowerCase() === normalizedFunc.toLowerCase())) {
            const funcRef = doc(collection(db, 'memberFunctions'));
            batch.set(funcRef, { name: normalizedFunc, createdAt: serverTimestamp() });
          }
        }

        // Sincronizar papéis de ministério
        tempMemberMinistries.forEach(mm => {
          const roleName = mm.role.trim();
          if (!ministryRoles.some(r => r.name.toLowerCase() === roleName.toLowerCase())) {
             const roleRef = doc(collection(db, 'ministryRoles'));
             batch.set(roleRef, { name: roleName, createdAt: serverTimestamp() });
          }
        });
        
        console.log("Comitando batch...");
        await batch.commit();
        console.log("Membro salvo com sucesso!");

        triggerUndo({
          type: 'add',
          collection: 'members',
          id: memberId,
          data: {},
          message: `Membro ${name} cadastrado.`
        });

        return true;
      })();

      // Executar operação com timeout
      await Promise.race([saveOperation, timeoutPromise]);
      
      resetModalStates();
      showAlert("Sucesso", "Membro cadastrado com sucesso!");
    } catch (error: any) {
      console.error("Erro fatal no handleAddMember:", error);
      showAlert("Erro", `Não foi possível cadastrar: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
      console.log("Status: isSaving = false");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMemberIds.length === 0) return;
    
    showPasswordPrompt(
      'Segurança Adicional',
      `Digite a senha de segurança para excluir ${selectedMemberIds.length} membros:`,
      async () => {
        try {
          setIsSaving(true);
          const count = selectedMemberIds.length;
          const deletedMembers = members.filter(m => selectedMemberIds.includes(m.id));
          const deletePromises = selectedMemberIds.map(id => deleteDoc(doc(db, 'members', id)));
          await Promise.all(deletePromises);
          
          triggerUndo({
            type: 'bulk_delete',
            collection: 'members',
            data: deletedMembers,
            message: `${count} membros excluídos.`
          });

          setSelectedMemberIds([]);
        } catch (error) {
          console.error("Bulk Delete Error:", error);
          showAlert("Erro", "Não foi possível excluir alguns membros.");
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m.id));
    }
  };

  const handleEditMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMember) return;
    console.log("Iniciando handleEditMember para id:", selectedMember.id);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const func = formData.get('function') as string;
    const gender = formData.get('gender') as 'Homem' | 'Mulher';
    const birthDate = formData.get('birthDate') as string || '';
    const startDate = formData.get('startDate') as string || '';
    const celular = formData.get('celular') as string || '';
    const cep = formData.get('cep') as string || '';
    const logradouro = formData.get('logradouro') as string || '';
    const numero = formData.get('numero') as string || '';
    const complemento = formData.get('complemento') as string || '';
    const bairro = formData.get('bairro') as string || '';
    const cidade = formData.get('cidade') as string || '';
    const estado = formData.get('estado') as string || '';
    const pais = formData.get('pais') as string || '';
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    let finalTempRelationships = [...tempRelationships];
    const unsavedRelTypeElem = document.getElementById('kinship-type-edit') as HTMLSelectElement;
    const unsavedRelIdElem = document.getElementById('kinship-member-edit') as HTMLSelectElement;
    if (unsavedRelTypeElem && unsavedRelIdElem && unsavedRelIdElem.value) {
      if (!finalTempRelationships.some(r => r.memberId === unsavedRelIdElem.value)) {
        finalTempRelationships.push({ memberId: unsavedRelIdElem.value, type: unsavedRelTypeElem.value });
      }
    }

    try {
      setIsSaving(true);
      console.log("Status Edit: isSaving = true");

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("A operação de edição excedeu o tempo limite (120s). Verifique sua conexão ou tente uma imagem menor.")), 120000)
      );

      const updateOperation = (async () => {
        const oldData = {
          name: selectedMember.name,
          function: selectedMember.function,
          ministryIds: selectedMember.ministryIds || (selectedMember.ministryId ? [selectedMember.ministryId] : []),
          relationships: selectedMember.relationships || [],
          gender: selectedMember.gender,
          birthDate: selectedMember.birthDate,
          startDate: selectedMember.startDate,
          photoUrl: selectedMember.photoUrl,
          isActive: selectedMember.isActive,
          celular: selectedMember.celular || '',
          cep: selectedMember.cep || '',
          logradouro: selectedMember.logradouro || '',
          numero: selectedMember.numero || '',
          complemento: selectedMember.complemento || '',
          bairro: selectedMember.bairro || '',
          cidade: selectedMember.cidade || '',
          estado: selectedMember.estado || '',
          pais: selectedMember.pais || '',
          updatedAt: serverTimestamp()
        };

        let photoUrl = selectedMember.photoUrl || '';
        if (photoPreview && photoPreview.startsWith('data:image')) {
          photoUrl = photoPreview;
        } else if (photoFile) {
          console.log("Iniciando upload de nova foto...");
          const fileName = photoFile.name || "profile";
          photoUrl = await uploadFile(`members/${Date.now()}_${fileName}`, photoFile);
          console.log("Upload de nova foto concluído com sucesso:", photoUrl);
        }
        
        const updatedMemberData = {
          name,
          function: func,
          ministryIds: tempMemberMinistries.map(m => m.ministryId),
          ministries: tempMemberMinistries,
          relationships: finalTempRelationships,
          gender,
          birthDate,
          startDate,
          photoUrl,
          isActive: selectedMember.isActive !== undefined ? selectedMember.isActive : true,
          celular,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          pais,
          updatedAt: serverTimestamp()
        };

        console.log("Preparando batch para atualizar membro e parentescos...");
        const batch = writeBatch(db);
        const memberRef = doc(db, 'members', selectedMember.id);

        const oldRels = selectedMember.relationships || [];
        const removedRels = oldRels.filter(old => !finalTempRelationships.some(curr => curr.memberId === old.memberId));
        
        // Optimize relationship updates using shared logic to avoid multiple independent getDoc calls if possible
        // but for safety in this complex logic, we'll keep them but add more logging and better error handling
        
        if (removedRels.length > 0) {
          console.log(`Removendo ${removedRels.length} vínculos antigos nos parentes...`);
          const removedPromises = removedRels.map(async (rel) => {
            try {
              const bRef = doc(db, 'members', rel.memberId);
              const bSnap = await getDoc(bRef);
              if (bSnap.exists()) {
                const bData = bSnap.data() as Member;
                const bRels = bData.relationships || [];
                // Remove the link to current member
                const filteredRels = bRels.filter(r => r.memberId !== selectedMember.id);
                batch.update(bRef, {
                  relationships: filteredRels,
                  updatedAt: serverTimestamp()
                });
              }
            } catch (err) {
              console.error(`Erro ao remover vínculo recíproco de ${rel.memberId}:`, err);
            }
          });
          await Promise.all(removedPromises);
        }

        if (finalTempRelationships.length > 0) {
          console.log(`Sincronizando ${finalTempRelationships.length} vínculos atuais nos parentes...`);
          const currentPromises = finalTempRelationships.map(async (rel) => {
            try {
              const bRef = doc(db, 'members', rel.memberId);
              const bSnap = await getDoc(bRef);
              if (bSnap.exists()) {
                const bData = bSnap.data() as Member;
                const bRels = bData.relationships || [];
                
                // Add or update the link to current member
                const otherRels = bRels.filter(r => r.memberId !== selectedMember.id);
                const updatedRels = [...otherRels, { memberId: selectedMember.id, type: inverseRelationship(rel.type) }];
                
                batch.update(bRef, {
                  relationships: updatedRels,
                  updatedAt: serverTimestamp()
                });
              }
            } catch (err) {
              console.error(`Erro ao sincronizar vínculo recíproco de ${rel.memberId}:`, err);
            }
          });
          await Promise.all(currentPromises);
        }

        batch.update(memberRef, updatedMemberData);

        if (func && func.trim()) {
          const normalizedFunc = func.trim();
          if (!memberFunctions.some(f => f.name.toLowerCase() === normalizedFunc.toLowerCase())) {
            const funcRef = doc(collection(db, 'memberFunctions'));
            batch.set(funcRef, { name: normalizedFunc, createdAt: serverTimestamp() });
          }
        }

        // Sincronizar papéis de ministério
        tempMemberMinistries.forEach(mm => {
          const roleName = mm.role.trim();
          if (!ministryRoles.some(r => r.name.toLowerCase() === roleName.toLowerCase())) {
             const roleRef = doc(collection(db, 'ministryRoles'));
             batch.set(roleRef, { name: roleName, createdAt: serverTimestamp() });
          }
        });
        
        console.log("Comitando batch de edição...");
        await batch.commit();
        console.log("Edição concluída com sucesso!");
        
        triggerUndo({
          type: 'update',
          collection: 'members',
          id: selectedMember.id,
          data: oldData,
          message: `Ddos de ${selectedMember.name} atualizados.`
        });

        return true;
      })();

      await Promise.race([updateOperation, timeoutPromise]);
      
      resetModalStates();
      setSelectedMember(null);
      showAlert("Sucesso", "Membro atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro fatal no handleEditMember:", error);
      showAlert("Erro", `Não foi possível atualizar: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
      console.log("Status Edit: isSaving = false");
    }
  };

  const handleDeactivateMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMember) return;
    const formData = new FormData(e.currentTarget);
    const updateData = {
      isActive: false,
      exitDate: formData.get('exitDate') as string,
      exitReason: formData.get('exitReason') as string,
      updatedAt: serverTimestamp()
    };

    try {
      setIsSaving(true);
      const oldMember = { ...selectedMember };
      await updateDoc(doc(db, 'members', selectedMember.id), updateData);
      
      triggerUndo({
        type: 'update',
        collection: 'members',
        id: selectedMember.id,
        data: { isActive: true, exitDate: deleteField(), exitReason: deleteField(), updatedAt: serverTimestamp() },
        message: `Membro ${selectedMember.name} foi negativado.`
      });

      setIsDeactivateModalOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Deactivate Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFunction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    if (!name || !name.trim()) return;

    try {
      setIsSaving(true);
      const docRef = await addDoc(collection(db, 'memberFunctions'), {
        name: name.trim(),
        description: description?.trim() || "",
        createdAt: serverTimestamp()
      });

      triggerUndo({
        type: 'add',
        collection: 'memberFunctions',
        id: docRef.id,
        data: { name: name.trim(), description: description?.trim() || "" },
        message: `Função ${name} adicionada.`
      });

      resetModalStates();
      showAlert("Sucesso", "Função cadastrada com sucesso!");
    } catch (error) {
      console.error("Add Function Error:", error);
      showAlert("Erro", "Não foi possível cadastrar a função.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailedExportPDF = async () => {
    try {
      setIsSaving(true);
      const orientation = exportFields.length > 5 ? 'l' : 'p';
      const doc = new jsPDF(orientation, 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      let membersToExport = members;
      let filename = "corpo_de_membros.pdf";

      if (exportFilter === 'ativos') {
        membersToExport = members.filter(m => m.isActive && !m.isAbsent);
        filename = "membros_ativos.pdf";
      } else if (exportFilter === 'ausentes') {
        membersToExport = members.filter(m => m.isActive && m.isAbsent);
        filename = "membros_ausentes.pdf";
      } else if (exportFilter === 'inativos') {
        membersToExport = members.filter(m => !m.isActive);
        filename = "membros_inativos.pdf";
      } else if (exportFilter === 'unico') {
        membersToExport = members.filter(m => m.id === selectedExportMemberId);
        const memberName = membersToExport[0]?.name || "membro";
        filename = `ficha_${memberName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      }

      // Add Logo
      if (appSettings.logoUrl) {
        try {
          doc.addImage(appSettings.logoUrl, 'PNG', 15, 12, 35, 35);
        } catch (e) {
          console.warn("Logo could not be added to PDF", e);
        }
      }

      // Add Header
      doc.setFontSize(26);
      doc.setTextColor(0, 128, 128); // IBC Teal color approx
      doc.text(appSettings.appName || "Igreja Batista Central", pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text("Relatório do Corpo de Membros", pageWidth / 2, 34, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 41, { align: 'center' });

      // Define columns based on selection
      const columns = availableExportFields
        .filter(f => exportFields.includes(f.id))
        .map(f => ({ id: f.id, header: f.label }));

      const tableRows = membersToExport.map(m => {
        return columns.map(col => {
          if (col.id === 'birthDate') return m.birthDate ? format(new Date(m.birthDate), 'dd/MM/yyyy') : '-';
          if (col.id === 'baptismDate') return m.startDate ? format(new Date(m.baptismDate || m.startDate), 'dd/MM/yyyy') : '-';
          if (col.id === 'ministries') return m.ministryIds?.map(id => ministries.find(min => min.id === id)?.name).filter(Boolean).join(', ') || '-';
          if (col.id === 'relationships') return m.relationships?.map(rel => {
            const relMember = members.find(member => member.id === rel.memberId);
            return relMember ? `${relMember.name} (${getGenderedKinship(rel.type, relMember.gender)})` : rel.type;
          }).join(', ') || '-';
          if (col.id === 'gender') return m.gender === 'Homem' ? 'Masc' : (m.gender === 'Mulher' ? 'Fem' : '-');
          if (col.id === 'isActive') return m.isActive ? (m.isAbsent ? 'Ausente' : 'Ativo') : 'Inativo';
          return (m as any)[col.id] || '-';
        });
      });

      autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: tableRows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [0, 128, 128], textColor: 255, fontStyle: 'bold', fontSize: exportFields.length > 6 ? 9 : 10 },
        styles: { 
          fontSize: exportFields.length > 6 ? 7 : (exportFields.length > 4 ? 8 : 10), 
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        margin: { top: 55, left: 15, right: 15 }
      });

      doc.save(filename);
      setIsExportModalOpen(false);
      showAlert("Sucesso", "PDF gerado com sucesso!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showAlert("Erro", "Não foi possível gerar o PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFunction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFunction) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    if (!name || !name.trim()) return;

    try {
      setIsSaving(true);
      const oldData = { 
        id: selectedFunction.id, 
        name: selectedFunction.name, 
        description: selectedFunction.description || "" 
      };
      await updateDoc(doc(db, 'memberFunctions', selectedFunction.id), {
        name: name.trim(),
        description: description?.trim() || "",
        updatedAt: serverTimestamp()
      });

      triggerUndo({
        type: 'update',
        collection: 'memberFunctions',
        id: selectedFunction.id,
        data: oldData,
        message: `Função atualizada para ${name}.`
      });

      resetModalStates();
      showAlert("Sucesso", "Função atualizada com sucesso!");
    } catch (error) {
      console.error("Edit Function Error:", error);
      showAlert("Erro", "Não foi possível atualizar a função.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFunction = async (func: MemberFunction) => {
    showPasswordPrompt(
      'Segurança Adicional',
      `Digite a senha de segurança para excluir a função "${func.name}":`,
      async () => {
        try {
          setIsSaving(true);
          await deleteDoc(doc(db, 'memberFunctions', func.id));
          
          triggerUndo({
            type: 'delete',
            collection: 'memberFunctions',
            id: func.id,
            data: { name: func.name },
            message: `Função ${func.name} excluída.`
          });

          showAlert("Sucesso", "Função excluída com sucesso!");
        } catch (error) {
          console.error("Delete Function Error:", error);
          showAlert("Erro", "Não foi possível excluir a função.");
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const handleAddRelationshipType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    if (!name) return;
    
    if (relationshipTypes.some(rt => rt.name.toLowerCase() === name.toLowerCase())) {
      showAlert("Aviso", "Este grau de parentesco já existe.");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'relationshipTypes'), {
        name,
        createdAt: serverTimestamp()
      });
      resetModalStates();
    } catch (error) {
       console.error("Add Relationship Type Error:", error);
       showAlert("Erro", "Não foi possível cadastrar o grau de parentesco.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRelationshipType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving || !selectedRelationshipType) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    if (!name) return;

    setIsSaving(true);
    try {
      const rtRef = doc(db, 'relationshipTypes', selectedRelationshipType.id);
      await updateDoc(rtRef, { name });
      
      const batch = writeBatch(db);
      let count = 0;
      members.forEach(m => {
        if (m.relationships && m.relationships.some(r => r.type === selectedRelationshipType.name)) {
          const updatedRelationships = m.relationships.map(r => 
            r.type === selectedRelationshipType.name ? { ...r, type: name } : r
          );
          batch.update(doc(db, 'members', m.id), { relationships: updatedRelationships });
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }

      resetModalStates();
    } catch (error) {
       console.error("Edit Relationship Type Error:", error);
       showAlert("Erro", "Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRelationshipType = async (rt: RelationshipType) => {
    showPasswordPrompt(
      'Segurança Adicional',
      `Digite a senha de segurança para excluir "${rt.name}":`,
      async () => {
        try {
          setIsSaving(true);
          await deleteDoc(doc(db, 'relationshipTypes', rt.id));
          
          triggerUndo({
            type: 'delete',
            collection: 'relationshipTypes',
            id: rt.id,
            data: { name: rt.name },
            message: `Grau ${rt.name} excluído.`
          });

          showAlert("Sucesso", "Grau de parentesco excluído com sucesso!");
        } catch (error) {
          console.error("Delete Relationship Type Error:", error);
          showAlert("Erro", "Não foi possível excluir o grau de parentesco.");
        } finally {
          setIsSaving(false);
        }
      }
    );
  };
  
  const handleToggleAbsent = async (memberId: string, currentAbsent: boolean) => {
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'members', memberId), {
        isAbsent: !currentAbsent,
        updatedAt: serverTimestamp()
      });
      const member = members.find(m => m.id === memberId);
      triggerUndo({
        type: 'update',
        collection: 'members',
        id: memberId,
        data: { isAbsent: currentAbsent, updatedAt: serverTimestamp() },
        message: `Membro ${member?.name} marcado como ${!currentAbsent ? 'ausente' : 'ativo'}.`
      });
    } catch (error) {
      console.error("Toggle Absent Error:", error);
      showAlert("Erro", "Não foi possível alterar o status de ausência.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkToggleAbsent = async (toAbsent: boolean) => {
    if (selectedMemberIds.length === 0) return;
    try {
      setIsSaving(true);
      const batch = writeBatch(db);
      const membersToUpdate = members.filter(m => selectedMemberIds.includes(m.id));
      const oldMembersData = membersToUpdate.map(m => ({ ...m }));

      selectedMemberIds.forEach(id => {
        batch.update(doc(db, 'members', id), {
          isAbsent: toAbsent,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();

      triggerUndo({
        type: 'bulk_update',
        collection: 'members',
        data: oldMembersData,
        message: `${selectedMemberIds.length} membros marcados como ${toAbsent ? 'ausentes' : 'ativos'}.`
      });

      setSelectedMemberIds([]);
      showAlert("Sucesso", `${selectedMemberIds.length} membros atualizados.`);
    } catch (error) {
      console.error("Bulk Absent Error:", error);
      showAlert("Erro", "Falha na atualização em massa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'admin' | 'user';

    if (!password || password.length < 6) {
      showAlert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    // Check if user already exists in our local list (Firestore)
    const userExistsInFirestore = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (userExistsInFirestore) {
      showAlert("Aviso", "Este usuário já está cadastrado no sistema. Você pode alterar o nível de acesso dele diretamente na lista abaixo.");
      setIsAddUserModalOpen(false);
      return;
    }

    try {
      // Create user in Auth without logging out current admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;

      // Create doc in Firestore
      await setDoc(doc(db, 'users', newUid), {
        email,
        role,
        status: 'approved',
        isFullAdmin: role === 'admin',
        createdAt: serverTimestamp()
      });

      await deleteApp(secondaryApp);
      
      triggerUndo({
        type: 'add',
        collection: 'users',
        id: newUid,
        data: { email, role },
        message: `Usuário ${email} criado.`
      });

      resetModalStates();
      showAlert("Sucesso", `Usuário ${email} criado com sucesso!`);
    } catch (error: any) {
      console.error("Add User Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        showAlert("Aviso", "Este email já possui uma conta no sistema (pode ter sido criado anteriormente ou via Google). Se ele não aparece na lista, peça para o usuário fazer o primeiro login para ativar o perfil.");
      } else {
        showAlert("Erro", "Não foi possível criar o usuário. Verifique se o método Email/Senha está ativado no Firebase Console.");
      }
    }
  };

  const handleBackup = () => {
    const data = JSON.stringify({ members, users, ministries }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-coqueiral-${safeFormatDate(new Date().toISOString(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddMinistry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;
    const description = formData.get('description') as string;
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    try {
      setIsSaving(true);
      
      let photoUrl = '';
      if (photoPreview && photoPreview.startsWith('data:image')) {
        photoUrl = photoPreview;
      } else if (photoFile) {
        console.log("Iniciando upload de foto do ministério...");
        const fileName = photoFile.name || "ministry";
        photoUrl = await uploadFile(`ministries/${Date.now()}_${fileName}`, photoFile);
      }

      const docRef = await addDoc(collection(db, 'ministries'), {
        name,
        color,
        description: description?.trim() || "",
        photoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      triggerUndo({
        type: 'add',
        collection: 'ministries',
        id: docRef.id,
        data: { name, color, description: description?.trim() || "", photoUrl },
        message: `Ministério ${name} cadastrado.`
      });

      resetModalStates();
      showAlert("Sucesso", "Ministério cadastrado com sucesso!");
    } catch (error) {
      console.error("Add Ministry Error:", error);
      showAlert("Erro", "Não foi possível cadastrar o ministério.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMinistry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMinistry) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;
    const description = formData.get('description') as string;
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    try {
      setIsSaving(true);
      
      let photoUrl = selectedMinistry.photoUrl || '';
      if (photoPreview === null && !photoFile) {
        photoUrl = '';
      } else if (photoPreview && photoPreview.startsWith('data:image')) {
        photoUrl = photoPreview;
      } else if (photoFile) {
        console.log("Iniciando upload de nova foto do ministério...");
        const fileName = photoFile.name || "ministry";
        photoUrl = await uploadFile(`ministries/${Date.now()}_${fileName}`, photoFile);
      }
      
      console.log("Atualizando ministério no Firestore...");
      const oldData = { ...selectedMinistry, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'ministries', selectedMinistry.id), {
        name,
        color,
        description: description?.trim() || "",
        photoUrl,
        updatedAt: serverTimestamp()
      });
      
      triggerUndo({
        type: 'update',
        collection: 'ministries',
        id: selectedMinistry.id,
        data: oldData,
        message: `Ministério ${selectedMinistry.name} atualizado.`
      });

      resetModalStates();
      setSelectedMinistry(null);
      showAlert("Sucesso", "Ministério atualizado com sucesso!");
    } catch (error) {
      console.error("Edit Ministry Error:", error);
      showAlert("Erro", "Não foi possível atualizar o ministério. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMinistry = async (id: string, name: string) => {
    showConfirm(
      'Excluir Ministério',
      `Tem certeza que deseja excluir o ministério ${name}?`,
      async () => {
        try {
          const min = ministries.find(m => m.id === id);
          if (min) {
            const minData = { ...min };
            await deleteDoc(doc(db, 'ministries', id));
            triggerUndo({
              type: 'delete',
              collection: 'ministries',
              id,
              data: minData,
              message: `Ministério ${name} excluído.`
            });
          }
        } catch (error) {
          console.error("Delete Ministry Error:", error);
          showAlert("Erro", "Não foi possível excluir o ministério.");
        }
      }
    );
  };

  const handleSaveAta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const number = formData.get('number') as string;
    const date = formData.get('date') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as 'Assembleia' | 'Reunião';
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    try {
      setIsSaving(true);
      let photoUrl = "";
      if (photoFile) {
        const fileName = photoFile.name || "ata";
        photoUrl = await uploadFile(`atas/${Date.now()}_${fileName}`, photoFile);
      }

      const docRef = await addDoc(collection(db, 'atas'), {
        number,
        date,
        content,
        type,
        photoUrl,
        signer1Role,
        signer1Name: getMemberNameByFunction(signer1Role),
        signer2Role,
        signer2Name: getMemberNameByFunction(signer2Role),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      triggerUndo({
        type: 'add',
        collection: 'atas',
        id: docRef.id,
        data: { number, date, content, type, photoUrl, signer1Role, signer2Role },
        message: `Ata nº ${number} salva.`
      });

      resetModalStates();
      showAlert("Sucesso", "Ata salva com sucesso!");
    } catch (error) {
      console.error("Save Ata Error:", error);
      showAlert("Erro", "Não foi possível salvar a ata.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAta) return;
    const formData = new FormData(e.currentTarget);
    const number = formData.get('number') as string;
    const date = formData.get('date') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as 'Assembleia' | 'Reunião';
    const photoEntry = formData.get('photo');
    const photoFile = (photoEntry instanceof File && photoEntry.size > 0) ? photoEntry : null;

    try {
      setIsSaving(true);
      let photoUrl = selectedAta.photoUrl || "";
      if (photoFile) {
        const fileName = photoFile.name || "ata";
        photoUrl = await uploadFile(`atas/${Date.now()}_${fileName}`, photoFile);
      }

      const oldData = { ...selectedAta, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'atas', selectedAta.id), {
        number,
        date,
        content,
        type,
        photoUrl,
        signer1Role,
        signer1Name: getMemberNameByFunction(signer1Role),
        signer2Role,
        signer2Name: getMemberNameByFunction(signer2Role),
        updatedAt: serverTimestamp()
      });
      
      triggerUndo({
        type: 'update',
        collection: 'atas',
        id: selectedAta.id,
        data: oldData,
        message: `Ata nº ${selectedAta.number} atualizada.`
      });

      resetModalStates();
      setSelectedAta(null);
      showAlert("Sucesso", "Ata atualizada com sucesso!");
    } catch (error) {
      console.error("Edit Ata Error:", error);
      showAlert("Erro", "Não foi possível atualizar a ata.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPresenca = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ataNumber = formData.get('ataNumber') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'Assembleia' | 'Reunião';

    try {
      setIsSaving(true);
      const docRef = await addDoc(collection(db, 'presencas'), {
        ataNumber,
        date,
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      triggerUndo({
        type: 'add',
        collection: 'presencas',
        id: docRef.id,
        data: { ataNumber, date, type },
        message: `Lista de presença (Ata ${ataNumber}) salva.`
      });

      setIsAddPresencaModalOpen(false);
      showAlert("Sucesso", "Lista de presença salva com sucesso!");
    } catch (error) {
      console.error("Save Presenca Error:", error);
      showAlert("Erro", "Não foi possível salvar a lista de presença.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPresenca = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPresenca) return;
    const formData = new FormData(e.currentTarget);
    const ataNumber = formData.get('ataNumber') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'Assembleia' | 'Reunião';

    try {
      setIsSaving(true);
      const oldData = { ...selectedPresenca, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'presencas', selectedPresenca.id), {
        ataNumber,
        date,
        type,
        updatedAt: serverTimestamp()
      });

      triggerUndo({
        type: 'update',
        collection: 'presencas',
        id: selectedPresenca.id,
        data: oldData,
        message: `Lista de presença (Ata ${ataNumber}) atualizada.`
      });

      setIsEditPresencaModalOpen(false);
      setSelectedPresenca(null);
      showAlert("Sucesso", "Lista de presença atualizada com sucesso!");
    } catch (error) {
      console.error("Edit Presenca Error:", error);
      showAlert("Erro", "Não foi possível atualizar a lista de presença.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: appSettings.appName,
          text: `Acesse o sistema da ${appSettings.appName}`,
          url: publicAppLink,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error sharing:", error);
          setIsShareModalOpen(true);
        }
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handlePrintPresenca = (presenca: Presenca) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const lines = Array.from({ length: 50 }, (_, i) => i + 1);

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Presença - Ata nº ${presenca.ataNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 16px; margin-bottom: 30px; color: #666; }
            .line { border-bottom: 1px solid #ccc; height: 30px; margin-bottom: 5px; display: flex; align-items: flex-end; font-size: 12px; color: #999; }
            .line span { margin-right: 10px; width: 30px; text-align: right; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Igreja Batista Coqueiral</h1>
          <h2>Lista de Presença - Ata nº ${presenca.ataNumber} - Data: ${safeFormatDate(presenca.date)}</h2>
          ${lines.map(n => `<div class="line"><span>${n}.</span> __________________________________________________________________________</div>`).join('')}
          <script>
            window.onload = () => {
              window.print();
              // window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteAta = async (id: string, number: string) => {
    showConfirm(
      'Excluir Ata',
      `Tem certeza que deseja excluir a ata nº ${number}?`,
      async () => {
        try {
          const ata = atas.find(a => a.id === id);
          if (ata) {
            const ataData = { ...ata };
            await deleteDoc(doc(db, 'atas', id));
            triggerUndo({
              type: 'delete',
              collection: 'atas',
              id,
              data: ataData,
              message: `Ata nº ${number} excluída.`
            });
          }
        } catch (error) {
          console.error("Delete Ata Error:", error);
          showAlert("Erro", "Não foi possível excluir a ata.");
        }
      }
    );
  };

  const handleDeletePresenca = async (id: string, ataNumber: string) => {
    showConfirm(
      'Excluir Lista de Presença',
      `Tem certeza que deseja excluir a lista de presença da ata nº ${ataNumber}?`,
      async () => {
        try {
          const pres = presencas.find(p => p.id === id);
          if (pres) {
            const presData = { ...pres };
            await deleteDoc(doc(db, 'presencas', id));
            triggerUndo({
              type: 'delete',
              collection: 'presencas',
              id,
              data: presData,
              message: `Lista de presença da ata ${ataNumber} excluída.`
            });
          }
        } catch (error) {
          console.error("Delete Presenca Error:", error);
          showAlert("Erro", "Não foi possível excluir a lista de presença.");
        }
      }
    );
  };

  const handleExportAtaPDF = async (ata: Ata) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Igreja Batista Coqueiral", 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(`Ata nº ${ata.number}`, 105, 35, { align: 'center' });
    doc.text(`Data: ${safeFormatDate(ata.date)}`, 105, 45, { align: 'center' });
    
    doc.setFontSize(12);
    const splitContent = doc.splitTextToSize(ata.content, 180);
    doc.text(splitContent, 15, 60);
    
    let finalY = 60 + (splitContent.length * 7) + 20;
    
    // Signers
    doc.line(20, finalY, 90, finalY);
    doc.text(ata.signer1Role || "Pastor Presidente", 55, finalY + 5, { align: 'center' });
    doc.text(ata.signer1Name || "____________________", 55, finalY + 12, { align: 'center' });
    
    doc.line(120, finalY, 190, finalY);
    doc.text(ata.signer2Role || "Secretário", 155, finalY + 5, { align: 'center' });
    doc.text(ata.signer2Name || "____________________", 155, finalY + 12, { align: 'center' });
    
    doc.save(`ata-${ata.number}.pdf`);
  };

  // Stat Calculations
  const activeMembersCount = useMemo(() => members.filter(m => m.isActive !== false && !m.isAbsent).length, [members]);
  const absentMembersCount = useMemo(() => members.filter(m => m.isActive !== false && m.isAbsent).length, [members]);
  const inactiveMembersCount = useMemo(() => members.filter(m => m.isActive === false).length, [members]);
  
  const memberStats = useMemo(() => {
    const categories: Record<string, { members: Member[], prevMembers: Member[], label: string, id: string, color: string, icon: any, tag: string }> = {
      absents: { members: [], prevMembers: [], label: 'Ausentes', id: 'absents', color: '#F97316', icon: Clock, tag: 'Ausentes' },
      returns: { members: [], prevMembers: [], label: 'Voltaram', id: 'returns', color: '#10B981', icon: RefreshCcw, tag: 'Retornos' },
      inactives: { members: [], prevMembers: [], label: 'Inativos', id: 'inactives', color: '#EF4444', icon: UserMinus, tag: 'Inativos' },
      news: { members: [], prevMembers: [], label: 'Novos Cadastros', id: 'news', color: '#3B82F6', icon: UserPlus, tag: 'Novos' }
    };

    const currentStart = selectedMonth === -1 
      ? new Date(selectedYear, 0, 1)
      : new Date(selectedYear, selectedMonth, 1);
    const currentEnd = selectedMonth === -1
      ? new Date(selectedYear, 11, 31)
      : new Date(selectedYear, selectedMonth + 1, 0);
    
    const prevStart = selectedMonth === -1
      ? new Date(selectedYear - 1, 0, 1)
      : new Date(selectedYear, selectedMonth - 1, 1);
    const prevEnd = selectedMonth === -1
      ? new Date(selectedYear - 1, 11, 31)
      : new Date(selectedYear, selectedMonth, 0);

    const checkInPeriod = (date: Date | null, start: Date, end: Date) => {
      if (!date) return false;
      return date >= start && date <= end;
    };

    members.forEach(m => {
      const created = m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : null;
      const updated = m.updatedAt?.seconds ? new Date(m.updatedAt.seconds * 1000) : null;

      // News: Based on createdAt
      if (checkInPeriod(created, currentStart, currentEnd)) categories.news.members.push(m);
      if (checkInPeriod(created, prevStart, prevEnd)) categories.news.prevMembers.push(m);

      // Others: Based on updatedAt as proxy for status change if currently in that state
      if (m.isAbsent && m.isActive !== false) {
        if (checkInPeriod(updated, currentStart, currentEnd)) categories.absents.members.push(m);
        if (checkInPeriod(updated, prevStart, prevEnd)) categories.absents.prevMembers.push(m);
      }
      
      if (m.isActive === false) {
        if (checkInPeriod(updated, currentStart, currentEnd)) categories.inactives.members.push(m);
        if (checkInPeriod(updated, prevStart, prevEnd)) categories.inactives.prevMembers.push(m);
      }

      // Returns: Active (not absent) but updated in period (Heuristic)
      if (m.isActive !== false && !m.isAbsent) {
        if (checkInPeriod(updated, currentStart, currentEnd)) categories.returns.members.push(m);
        if (checkInPeriod(updated, prevStart, prevEnd)) categories.returns.prevMembers.push(m);
      }
    });

    // Evolution data for chart
    const chartData = [];
    const monthsToFetch = selectedMonth === -1 ? 12 : 6;
    const startOffset = selectedMonth === -1 ? 0 : selectedMonth - 5;
    const yearForChart = selectedYear;

    for (let i = 0; i < monthsToFetch; i++) {
      const monthIdx = selectedMonth === -1 ? i : startOffset + i;
      const d = new Date(yearForChart, monthIdx, 1);
      const start = d;
      const end = new Date(yearForChart, monthIdx + 1, 0);
      const name = d.toLocaleString('pt-BR', { month: 'short' });
      
      const counts = {
        name,
        novos: 0,
        ausentes: 0,
        inativos: 0,
        voltaram: 0
      };

      members.forEach(m => {
        const created = m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : null;
        const updated = m.updatedAt?.seconds ? new Date(m.updatedAt.seconds * 1000) : null;

        if (checkInPeriod(created, start, end)) counts.novos++;
        if (m.isAbsent && m.isActive !== false && checkInPeriod(updated, start, end)) counts.ausentes++;
        if (m.isActive === false && checkInPeriod(updated, start, end)) counts.inativos++;
        if (m.isActive !== false && !m.isAbsent && checkInPeriod(updated, start, end)) counts.voltaram++;
      });
      chartData.push(counts);
    }

    // Smart Summary
    let summary = "Neste período analisado, o sistema registrou movimentações consistentes. ";
    const newsDiff = categories.news.members.length - categories.news.prevMembers.length;
    if (newsDiff > 0) summary += `Houve um aumento de ${newsDiff} novos cadastros em relação ao mês anterior. `;
    else if (newsDiff < 0) summary += `Houve uma redução de ${Math.abs(newsDiff)} cadastros em relação ao mês anterior. `;
    
    const absDiff = categories.absents.members.length - categories.absents.prevMembers.length;
    if (absDiff > 0) summary += `O número de ausentes cresceu em ${absDiff}. `;
    else if (absDiff < 0) summary += `Houve uma redução positiva de ${Math.abs(absDiff)} nos membros ausentes. `;

    return { categories, chartData, summary };
  }, [members, selectedMonth, selectedYear]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = normalizeString(searchQuery);
    return members.filter(m => {
      const matchesSearch = normalizeString(m.name || '').includes(normalizedQuery) ||
                           normalizeString(m.function || '').includes(normalizedQuery);
      
      const isActive = m.isActive !== false;
      const isAbsent = !!m.isAbsent;
      
      const matchesStatus = memberStatusFilter === 'all' || 
                           (memberStatusFilter === 'active' && isActive && !isAbsent) || 
                           (memberStatusFilter === 'absent' && isActive && isAbsent) ||
                           (memberStatusFilter === 'inactive' && !isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, memberStatusFilter]);

  const [visibleMembersCount, setVisibleMembersCount] = useState(30);

  useEffect(() => {
    setVisibleMembersCount(30);
  }, [searchQuery, memberStatusFilter]);

  const displayedMembers = useMemo(() => {
    return filteredMembers.slice(0, visibleMembersCount);
  }, [filteredMembers, visibleMembersCount]);

  const filteredNavItems = useMemo(() => {
    if (appUser?.role === 'admin') return sideNavItems;
    return sideNavItems.filter(item => item.id !== 'adm');
  }, [sideNavItems, appUser?.role]);

  // Handle unauthorized tab access
  useEffect(() => {
    if (appUser?.role === 'user' && activeTab === 'adm') {
      setActiveTab('members');
    }
  }, [appUser?.role, activeTab]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const size = 512; // Standard size for app icon
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white'; // Background for transparent parts if needed, or could be transparent
          ctx.fillRect(0, 0, size, size);
          
          const scale = Math.min(size / img.width, size / img.height);
          const x = (size / 2) - (img.width / 2) * scale;
          const y = (size / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        }
        
        const dataUrl = canvas.toDataURL('image/png', 0.9); // Use PNG for better icon quality
        try {
          const oldData = { ...appSettings };
          await setDoc(doc(db, 'settings', 'app'), { logoUrl: dataUrl }, { merge: true });
          
          triggerUndo({
            type: 'update',
            collection: 'settings',
            id: 'app',
            data: oldData,
            message: "Logotipo atualizado."
          });

          showAlert("Sucesso", "Logotipo atualizado com sucesso!");
        } catch (error) {
          console.error("Erro ao salvar logotipo:", error);
          showAlert("Erro", "Não foi possível salvar o logotipo.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'estatuto' | 'regimento') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showAlert("Erro", "Por favor, selecione apenas arquivos do tipo PDF.");
      return;
    }

    const setUploading = type === 'estatuto' ? setIsUploadingEstatuto : setIsUploadingRegimento;
    setUploading(true);

    try {
      const fileName = `${type}_${Date.now()}.pdf`;
      const path = `normativos/${fileName}`;
      const downloadUrl = await uploadFile(path, file);

      const fieldName = type === 'estatuto' ? 'estatutoUrl' : 'regimentoUrl';
      const oldData = { ...appSettings };
      
      await setDoc(doc(db, 'settings', 'app'), { [fieldName]: downloadUrl }, { merge: true });

      triggerUndo({
        type: 'update',
        collection: 'settings',
        id: 'app',
        data: oldData,
        message: type === 'estatuto' ? "Estatuto importado com sucesso." : "Regimento Interno importado com sucesso."
      });

      showAlert("Sucesso", `${type === 'estatuto' ? 'Estatuto' : 'Regimento Interno'} importado com sucesso!`);
    } catch (error) {
      console.error(`Erro ao carregar documento (${type}):`, error);
      showAlert("Erro", "Ocorreu um erro ao carregar o arquivo PDF. Verifique se o tamanho é adequado.");
    } finally {
      setUploading(false);
    }
  };

  const saveNavOrder = async (newOrder: typeof DEFAULT_NAV_ITEMS) => {
    if (appUser?.role !== 'admin') return;
    const navOrder = newOrder.map(item => item.id);
    try {
      await setDoc(doc(db, 'settings', 'app'), { navOrder }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar ordem das abas:", err);
    }
  };

  const handleNavReorder = (newOrder: typeof DEFAULT_NAV_ITEMS) => {
    setSideNavItems(newOrder);
    
    if (navSaveTimeout.current) clearTimeout(navSaveTimeout.current);
    navSaveTimeout.current = setTimeout(() => {
      saveNavOrder(newOrder);
    }, 2000);
  };

  const defaultLogo = "https://images.unsplash.com/photo-1548625361-195fe5795df5?w=200&h=200&fit=crop";
  const currentLogo = appSettings.logoUrl || defaultLogo;

  if (loading) {
    return <SplashScreen />;
  }

  // Pending/Blocked Access Screen
  if (appUser && appUser.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#111] p-10 rounded-3xl shadow-2xl shadow-gray-200/50 max-w-md w-full border border-gray-100 dark:border-[#222] text-center"
        >
          <div className="w-24 h-24 bg-ibc-teal/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner overflow-hidden">
            <img 
              src={currentLogo} 
              alt={appSettings.appName} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="mb-8">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-50 mb-2">Acesso Restrito</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              {(appUser.status as any) === 'none' ? (
                "Você ainda não possui autorização para acessar este aplicativo. Solicite acesso ao administrador."
              ) : appUser.status === 'pending' ? (
                "Sua solicitação está em análise. Você receberá acesso assim que for aprovado pelo administrador."
              ) : (
                "Seu acesso foi bloqueado pelo administrador. Entre em contato para mais informações."
              )}
            </p>
          </div>

          <div className="space-y-4">
            {(appUser.status as any) === 'none' && (
              <button
                onClick={handleRequestAccess}
                disabled={isAuthLoading}
                className={cn(
                  "w-full bg-ibc-teal text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest hover:bg-ibc-teal/90 transition-all shadow-xl shadow-ibc-teal/20 active:scale-95 flex items-center justify-center gap-2",
                  isAuthLoading && "opacity-50 cursor-wait"
                )}
              >
                {isAuthLoading ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Enviar solicitação de acesso
              </button>
            )}

            {appUser.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <p className="text-xs text-amber-700 font-bold leading-tight">
                    Solicitação enviada.
                  </p>
                  <p className="text-[10px] text-amber-600 font-medium">
                    Aguarde o contato da administração para liberação do acesso.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 py-4 px-6 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 dark:bg-[#222] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-6">
        <AnimatePresence>
          {!isStandalone && showInstallBanner && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-6 left-6 right-6 z-[150] flex justify-center pointer-events-none"
            >
              <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 max-w-md w-full pointer-events-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ibc-teal rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-ibc-teal/20">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 leading-tight">Instalar Aplicativo</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">Acesse mais rápido e offline</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCloseBanner}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleInstallClick}
                    className="bg-ibc-teal text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-ibc-teal/20 hover:bg-ibc-teal/90 transition-all active:scale-95"
                  >
                    Instalar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111] p-10 rounded-3xl shadow-2xl shadow-gray-200/50 max-w-md w-full border border-gray-100 dark:border-[#222]"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-ibc-teal/5 rounded-3xl flex items-center justify-center mb-4 shadow-inner overflow-hidden">
              <img 
                src={currentLogo} 
                alt="Igreja Batista Coqueiral" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">CNPJ 05.048.0001/27</p>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">Secretaria</p>
          </div>

          <div className="flex mb-8 bg-gray-50 dark:bg-black p-1.5 rounded-2xl border border-gray-100 dark:border-[#222]">
            <button 
              onClick={() => { setLoginMethod('email'); setLoginError(''); }}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300", 
                loginMethod === 'email' ? "bg-white dark:bg-[#111] shadow-lg shadow-gray-200/50 text-ibc-blue" : "text-gray-400 hover:text-gray-600 dark:text-gray-300"
              )}
            >
              Email
            </button>
            <button 
              onClick={() => { setLoginMethod('google'); setLoginError(''); }}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300", 
                loginMethod === 'google' ? "bg-white dark:bg-[#111] shadow-lg shadow-gray-200/50 text-ibc-blue" : "text-gray-400 hover:text-gray-600 dark:text-gray-300"
              )}
            >
              Google
            </button>
          </div>

          {loginMethod === 'email' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                <input 
                  required 
                  name="email" 
                  type="email" 
                  className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-2xl outline-none focus:ring-4 focus:ring-ibc-teal/5 focus:border-ibc-teal/20 transition-all font-medium placeholder:text-gray-300" 
                  placeholder="seu@email.com" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                <input 
                  required 
                  name="password" 
                  type="password" 
                  className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-2xl outline-none focus:ring-4 focus:ring-ibc-teal/5 focus:border-ibc-teal/20 transition-all font-medium placeholder:text-gray-300" 
                  placeholder="••••••••" 
                />
              </div>
              {loginError && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  {loginError}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={isAuthLoading}
                className={cn(
                  "w-full bg-ibc-blue text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest hover:bg-ibc-blue/90 transition-all shadow-xl shadow-ibc-blue/20 active:scale-95",
                  isAuthLoading && "opacity-50 cursor-wait"
                )}
              >
                {isAuthLoading ? 'Aguarde...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setLoginError(''); }}
                  className="text-xs font-bold text-ibc-teal hover:underline"
                >
                  {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => handleLogin(undefined, 'google')}
                disabled={isAuthLoading}
                className={cn(
                  "w-full bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] text-gray-700 dark:text-gray-200 py-4 px-6 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 dark:bg-black transition-all flex items-center justify-center shadow-lg shadow-gray-100/50 active:scale-95",
                  isAuthLoading && "opacity-50 cursor-wait"
                )}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-4" alt="Google" />
                {isAuthLoading ? 'Conectando...' : 'Entrar com Google'}
              </button>
              {loginError && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center"
                >
                  {loginError}
                </motion.p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-50 dark:bg-black flex flex-col">
      {/* Quota Exceeded Sticky Banner */}
      {isQuotaExceeded && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-3 text-xs font-semibold flex items-center justify-between z-[9999] shadow-lg shrink-0 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white dark:bg-[#111] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
            </span>
            <span className="leading-tight">
              <strong>Modo de Leitura Offline / Limite de Cotas:</strong> Atingimos o limite diário gratuito de leituras Firebase (Quota Limit). O app continuará totalmente visível e responsivo com dados salvos em cache local!
            </span>
          </div>
          <button 
            onClick={() => setIsQuotaExceeded(false)}
            className="ml-4 hover:bg-white/10 text-white font-bold h-6 w-6 rounded-full flex items-center justify-center transition-colors shrink-0"
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Admin Quick Access Control Button */}
      {appUser?.role === 'admin' && (
        <div className="fixed bottom-36 left-6 z-[60] flex flex-col items-start gap-4 pointer-events-none">
          <AnimatePresence>
            {users.some(u => u.status === 'pending') && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-amber-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 flex items-center gap-2 pointer-events-auto"
              >
                <div className="w-2 h-2 bg-white dark:bg-[#111] rounded-full animate-ping" />
                {users.filter(u => u.status === 'pending').length} Solicitações Pendentes
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsAccessControlOpen(true)}
            className="w-14 h-14 bg-white dark:bg-[#111] text-ibc-teal rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 dark:border-[#222] flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto group relative"
          >
            <ShieldCheck className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            {users.some(u => u.status === 'pending') && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* Access Control Modal */}
      <AccessControlModal 
        isOpen={isAccessControlOpen}
        onClose={() => setIsAccessControlOpen(false)}
        pendingUsers={users.filter(u => u.status === 'pending')}
        onStartApproval={(u) => {
          setApprovingUser({ id: u.id, email: u.email });
          setIsAccessControlOpen(false);
        }}
        onReject={async (id, email) => {
          showConfirm(
            "Recusar Solicitação",
            `Tem certeza que deseja recusar e bloquear o acesso de ${email}?`,
            async () => {
              await updateDoc(doc(db, 'users', id), { 
                status: 'blocked',
                rejectedAt: serverTimestamp(),
                handledByEmail: appUser?.email,
                handledByUid: appUser?.id
              });
              showAlert("Atenção", `Solicitação de ${email} recusada.`);
            }
          );
        }}
      />

      {/* Role Selection Modal */}
      <RoleSelectionModal 
        isOpen={!!approvingUser}
        onClose={() => setApprovingUser(null)}
        user={approvingUser}
        onConfirm={async (role) => {
          if (!approvingUser) return;
          try {
            await updateDoc(doc(db, 'users', approvingUser.id), { 
              status: 'approved',
              role: role,
              isFullAdmin: role === 'admin',
              approvedAt: serverTimestamp(),
              handledByEmail: appUser?.email,
              handledByUid: appUser?.id
            });
            showAlert("Sucesso", `${approvingUser.email} foi aprovado como ${role === 'admin' ? 'Administrador' : 'Usuário'}.`);
            setApprovingUser(null);
          } catch (error) {
            console.error("Error approving user:", error);
            showAlert("Erro", "Não foi possível aprovar o usuário.");
          }
        }}
      />

      <AnimatePresence>
        {!isStandalone && showInstallBanner && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-6 right-6 z-[150] flex justify-center pointer-events-none"
          >
            <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 max-w-md w-full pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ibc-teal rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-ibc-teal/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 leading-tight">Instalar Aplicativo</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">Acesse mais rápido e offline</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCloseBanner}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleInstallClick}
                  className="bg-ibc-teal text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-ibc-teal/20 hover:bg-ibc-teal/90 transition-all active:scale-95"
                >
                  Instalar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-72 bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] z-50 md:hidden shadow-2xl rounded-r-[3rem] border-r border-white/40 dark:border-white/10"
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex flex-col items-start">
            <img 
              src={currentLogo} 
              alt={appSettings.appName} 
              className="h-10 w-auto mb-1 rounded-lg"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-sm font-black text-gray-900 dark:text-gray-50 tracking-tight leading-none uppercase">
              {appSettings.appName}
            </h1>
            <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{appSettings.churchCnpj || "CNPJ Não informado"}</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:bg-[#1a1a1a] rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <Reorder.Group 
          axis="y" 
          values={filteredNavItems} 
          onReorder={(newOrder) => {
            if (appUser?.role === 'admin') handleNavReorder(newOrder);
          }}
          className="p-4 space-y-2 list-none"
        >
          {filteredNavItems.map((item) => (
            <Reorder.Item 
              key={item.id} 
              value={item}
              dragListener={appUser?.role === 'admin'}
              className="relative cursor-grab active:cursor-grabbing list-none"
              onDragStart={() => { isReorderingNav.current = true; }}
              onDragEnd={() => { isReorderingNav.current = false; }}
              whileDrag={{ scale: 1.02 }}
            >
              <SidebarItem 
                icon={TAB_ICONS[item.id]} 
                label={item.label} 
                active={activeTab === item.id} 
                onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }}
                collapsed={false}
                showDragHandle={appUser?.role === 'admin'}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>


        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center p-4 rounded-2xl bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] space-x-3">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} className="w-10 h-10 rounded-xl border-2 border-white dark:border-[#111] shadow-sm" alt="Profile" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">{user.displayName}</p>
              <button onClick={handleLogout} className="text-xs text-red-500 font-bold hover:underline">Sair da conta</button>
            </div>
            <button onClick={toggleTheme} className="p-2 hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 rounded-xl transition-all">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col md:flex-row relative z-0" style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left', width: `${100 / uiScale}%`, height: `${100 / uiScale}%` }}>

      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 90 : 280 }}
        className="hidden md:flex flex-col bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] z-30 relative border-r border-gray-200/50 dark:border-white/10"
      >
        <div className="p-8 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-start"
              >
                <img 
                  src={currentLogo} 
                  alt={appSettings.appName} 
                  className="h-10 w-auto mb-1 rounded-lg"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-sm font-black text-gray-900 dark:text-gray-50 tracking-tight leading-none uppercase">
                  {appSettings.appName}
                </h1>
                <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{appSettings.churchCnpj || "CNPJ Não informado"}</p>
              </motion.div>
            )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-gray-100 dark:bg-[#1a1a1a] rounded-xl transition-colors text-gray-400"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <Reorder.Group 
          axis="y" 
          values={filteredNavItems} 
          onReorder={(newOrder) => {
            if (appUser?.role === 'admin') handleNavReorder(newOrder);
          }}
          className="flex-1 px-4 space-y-2 list-none"
        >
          {filteredNavItems.map((item) => (
            <Reorder.Item 
              key={item.id} 
              value={item}
              dragListener={appUser?.role === 'admin'}
              className="relative cursor-grab active:cursor-grabbing list-none"
              onDragStart={() => { isReorderingNav.current = true; }}
              onDragEnd={() => { isReorderingNav.current = false; }}
              whileDrag={{ scale: 1.02 }}
            >
              <SidebarItem 
                icon={TAB_ICONS[item.id]} 
                label={item.label} 
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id as any)}
                collapsed={isSidebarCollapsed}
                showDragHandle={appUser?.role === 'admin'}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>



        <div className="p-6">
          <div className={cn(
            "flex items-center p-3 rounded-2xl bg-gray-50/50 border border-gray-100 dark:bg-black/50 dark:border-[#222]",
            isSidebarCollapsed ? "justify-center" : "space-x-3"
          )}>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
              className="w-10 h-10 rounded-xl border-2 border-white dark:border-[#111] shadow-sm"
              alt="Profile"
            />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">{user.displayName}</p>
                <p className="text-[10px] font-black text-ibc-teal uppercase tracking-widest">{appUser?.role || 'User'}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex space-x-1">
                <button onClick={toggleTheme} className="p-2 hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 rounded-xl transition-all">
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button onClick={handleLogout} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 hover:text-red-600 rounded-xl transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-8 pt-2 sm:pt-12 pb-2 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 transition-all glass-header">
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 mr-3 bg-white dark:bg-[#111] shadow-sm border border-gray-100 dark:border-[#222] rounded-xl"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center flex-wrap">
                <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tighter leading-tight">
                  {activeTab === 'members' ? 'Membros' : 
                   activeTab === 'ministries' ? 'Ministérios' : 
                   activeTab === 'assembleia' ? 'Reuniões' : 
                   activeTab === 'reports' ? 'Relatórios e Estatísticas' :
                   activeTab === 'rh' ? 'Recursos Humanos' :
                   activeTab === 'normativos' ? 'Atos Normativos' :
                   'Administração'}
                </h2>
                {activeTab === 'members' && (
                  <div className="flex items-center ml-2 sm:ml-3">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-300 mr-2 shadow-sm" />
                    <span className="text-sm sm:text-lg font-bold text-ibc-teal tracking-tight">{members.filter(m => m.isActive !== false).length}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-sm text-gray-400 font-bold mt-0.5 uppercase tracking-widest">
                {activeTab === 'members' ? 'Corpo de Membros' : 
                 activeTab === 'ministries' ? 'Frentes de trabalho' : 
                 activeTab === 'assembleia' ? 'Atas e registros' : 
                 activeTab === 'reports' ? 'Quadro de membros' :
                 activeTab === 'rh' ? 'Gestão de Funções' :
                 activeTab === 'normativos' ? 'Estatuto & Regimento Interno' :
                 'Configurações'}
              </p>
            </div>
          </div>
          
          {activeTab === 'members' && (
            <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {selectedMemberIds.length > 0 && appUser?.isFullAdmin && (
                <>
                  <button 
                    onClick={() => handleBulkToggleAbsent(true)}
                    className="bg-orange-500 text-white px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 whitespace-nowrap text-xs"
                    title={`Marcar ${selectedMemberIds.length} como ausentes`}
                  >
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Ausentes ({selectedMemberIds.length})</span>
                    <span className="sm:hidden">{selectedMemberIds.length}</span>
                  </button>
                  <button 
                    onClick={() => handleBulkToggleAbsent(false)}
                    className="bg-green-500 text-white px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 active:scale-95 whitespace-nowrap text-xs"
                    title={`Marcar ${selectedMemberIds.length} como ativos`}
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Ativar ({selectedMemberIds.length})</span>
                    <span className="sm:hidden">{selectedMemberIds.length}</span>
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="bg-red-500 text-white px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95 whitespace-nowrap text-xs"
                    title={`Excluir ${selectedMemberIds.length} membros`}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Excluir ({selectedMemberIds.length})</span>
                    <span className="sm:hidden">{selectedMemberIds.length}</span>
                  </button>
                </>
              )}
              {filteredMembers.length > 0 && (
                <label className="flex items-center cursor-pointer group bg-white dark:bg-[#111] border border-ibc-teal/20 px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all hover:bg-ibc-teal/5">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0}
                      onChange={toggleSelectAll}
                    />
                    <div className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all flex items-center justify-center",
                      selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0
                        ? "bg-ibc-teal border-ibc-teal" 
                        : "border-gray-200 dark:border-[#333] group-hover:border-ibc-teal/50"
                    )}>
                      {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 && (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hidden sm:inline text-nowrap">Selecionar Todos</span>
                  <span className="ml-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest sm:hidden text-nowrap">Todos</span>
                </label>
              )}
              <button 
                onClick={() => setIsExportModalOpen(true)}
                className="bg-white dark:bg-[#111] text-ibc-teal border border-ibc-teal/20 px-3 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-ibc-teal/5 transition-all active:scale-95 text-xs whitespace-nowrap"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              {appUser?.role === 'admin' && (
                <button 
                  onClick={() => {
                    setTempMinistryIds([]);
                    setTempRelationships([]);
                    setPhotoPreview(null);
                    setIsAddingNewFunction(false);
                    setNewFunctionValue("");
                    setIsAddMemberModalOpen(true);
                  }}
                  className="bg-ibc-teal text-white px-3 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 active:scale-95 text-xs whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Novo Membro</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              )}
            </div>
          )}
          {activeTab === 'ministries' && appUser?.role === 'admin' && (
            <button 
              onClick={() => {
                setIsAddMinistryModalOpen(true);
              }}
              className="bg-ibc-teal text-white px-3 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center font-bold hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 active:scale-95 text-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">Novo Ministério</span>
              <span className="sm:hidden">Novo</span>
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-12 relative">
          {activeTab === 'members' ? (
            <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
              {/* Sticky Header Section */}
              <div className="sticky top-0 glass-header z-20 pt-1 pb-2 space-y-2 sm:space-y-3 -mx-4 sm:-mx-8 px-4 sm:px-8">
                {/* Member Stats Cards & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-4">
                  {/* Status Cards - Horizontal on Mobile */}
                  <div className="flex flex-row overflow-x-auto pb-1 sm:pb-0 gap-2 sm:gap-4 flex-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button 
                       onClick={() => setMemberStatusFilter(memberStatusFilter === 'active' ? 'all' : 'active')}
                      className={cn(
                        "glass-card p-2 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center space-x-2 sm:space-x-4 transition-all duration-300 text-left min-w-[110px] sm:min-w-0 flex-1",
                        memberStatusFilter === 'active' ? "border-green-500 ring-4 ring-green-50 bg-green-50/50" : "hover:border-green-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                        memberStatusFilter === 'active' ? "bg-green-500 text-white" : "bg-green-50 text-green-500"
                      )}>
                        <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 truncate">Ativos</p>
                        <p className="text-xs sm:text-2xl font-black text-gray-900 dark:text-gray-50 leading-none">{activeMembersCount}</p>
                      </div>
                    </button>
                    <button 
                       onClick={() => setMemberStatusFilter(memberStatusFilter === 'absent' ? 'all' : 'absent')}
                      className={cn(
                        "glass-card p-2 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center space-x-2 sm:space-x-4 transition-all duration-300 text-left min-w-[110px] sm:min-w-0 flex-1",
                        memberStatusFilter === 'absent' ? "border-orange-500 ring-4 ring-orange-50 bg-orange-50/50" : "hover:border-orange-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                        memberStatusFilter === 'absent' ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"
                      )}>
                        <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 truncate">Ausentes</p>
                        <p className="text-xs sm:text-2xl font-black text-gray-900 dark:text-gray-50 leading-none">{absentMembersCount}</p>
                      </div>
                    </button>
                    <button 
                       onClick={() => setMemberStatusFilter(memberStatusFilter === 'inactive' ? 'all' : 'inactive')}
                      className={cn(
                        "bg-white dark:bg-[#111] p-2 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center space-x-2 sm:space-x-4 transition-all duration-300 text-left min-w-[110px] sm:min-w-0 flex-1",
                        memberStatusFilter === 'inactive' ? "border-red-500 ring-4 ring-red-50" : "border-gray-100 dark:border-[#222] hover:border-red-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                        memberStatusFilter === 'inactive' ? "bg-red-500 text-white" : "bg-red-50 text-red-500"
                      )}>
                        <UserMinus className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 truncate">Inativos</p>
                        <p className="text-xs sm:text-2xl font-black text-gray-900 dark:text-gray-50 leading-none">{inactiveMembersCount}</p>
                      </div>
                    </button>
                  </div>

                  {/* Expandable Search bar */}
                  <div className="relative flex items-center h-10 sm:h-14 w-full sm:w-80 lg:w-96 justify-start">
                    <motion.div 
                      layout
                      initial={false}
                      className={cn(
                        "flex items-center h-full glass-card transition-all duration-300 overflow-hidden",
                        isSearchExpanded || window.innerWidth >= 640 
                          ? "w-full rounded-2xl sm:rounded-3xl pr-4 border-ibc-teal/20" 
                          : "w-10 rounded-2xl"
                      )}
                    >
                      <button 
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className={cn(
                          "p-3 sm:p-4 transition-all duration-300 z-10 flex items-center justify-center shrink-0",
                          isSearchExpanded || window.innerWidth >= 640 ? "text-ibc-teal" : "text-gray-400"
                        )}
                      >
                        <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>

                      <input
                        type="text"
                        placeholder="Buscar membro..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                          "w-full py-2.5 sm:py-4 outline-none transition-all text-sm sm:text-base font-medium placeholder:text-gray-300 bg-transparent min-w-0 pr-2",
                          (!isSearchExpanded && window.innerWidth < 640) && "hidden"
                        )}
                      />
                      
                      {isSearchExpanded && searchQuery && (
                        <button 
                          onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  </div>
                </div>
                </div>

              {/* Member List Header/Clear Filter */}
              {memberStatusFilter !== 'all' && (
                <div className="flex items-center justify-between px-4 py-2 bg-ibc-teal/5 border border-ibc-teal/10 rounded-2xl max-w-5xl mx-auto">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-ibc-teal uppercase tracking-widest">
                      Filtrando por: {memberStatusFilter === 'active' ? 'Ativos' : memberStatusFilter === 'absent' ? 'Ausentes' : 'Inativos'}
                    </span>
                    <span className="text-xs text-gray-400">({filteredMembers.length} encontrados)</span>
                  </div>
                  <button 
                    onClick={() => setMemberStatusFilter('all')}
                    className="text-xs font-bold text-gray-400 hover:text-ibc-teal transition-colors underline underline-offset-4"
                  >
                    Mostrar Todos
                  </button>
                </div>
              )}

              {/* Member List */}
              <div className="space-y-1.5 sm:space-y-2 max-w-5xl mx-auto">
                <AnimatePresence mode="popLayout">
                  {displayedMembers.map((member) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      key={member.id}
                      onClick={() => { setSelectedMember(member); setIsViewMemberModalOpen(true); }}
                      className={cn(
                        "glass-card p-2 sm:p-4 rounded-2xl sm:rounded-3xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between transition-all duration-300 cursor-pointer group hover:shadow-2xl hover:shadow-gray-200/50 gap-2 sm:gap-4",
                        member.isActive && !member.isAbsent && "border-green-100/50",
                        !member.isActive && "border-red-200/50 bg-red-100/40",
                        member.isActive && member.isAbsent && "border-orange-300/50 bg-orange-100/40",
                        selectedMemberIds.includes(member.id) && "ring-2 ring-ibc-teal border-ibc-teal bg-ibc-teal/10"
                      )}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <label className="cursor-pointer group/check shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={selectedMemberIds.includes(member.id)}
                              onChange={() => toggleSelectMember(member.id)}
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                              selectedMemberIds.includes(member.id)
                                ? "bg-ibc-teal border-ibc-teal" 
                                : "border-gray-200 dark:border-[#333] group-hover/check:border-ibc-teal/50"
                            )}>
                              {selectedMemberIds.includes(member.id) && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                        </label>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-ibc-teal font-black text-xs overflow-hidden shrink-0 border border-gray-100 dark:border-[#222]">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-0 sm:py-1">
                          <div className="flex items-start justify-between gap-2 overflow-hidden">
                            <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-50 tracking-tight leading-tight mb-1 truncate flex-1">
                              {member.name}
                            </h4>
                            <div className="flex flex-shrink-0 gap-1 mt-0.5">
                              {!member.isActive ? (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] uppercase font-black rounded-full tracking-widest shadow-sm h-fit whitespace-nowrap">Negativo</span>
                              ) : member.isAbsent && (
                                <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] uppercase font-black rounded-full tracking-widest shadow-sm h-fit whitespace-nowrap">Ausente</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-2 sm:gap-x-3 mt-1 underline-offset-4 decoration-ibc-teal/30">
                            <p className="text-[9px] sm:text-[10px] text-ibc-teal font-black uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">{member.function}</p>
                            {member.birthDate && (
                              <div className="flex items-center">
                                <span className="w-1 h-1 rounded-full bg-gray-300 mr-1.5 sm:mr-2" />
                                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                  {calculateAge(member.birthDate)} Anos
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-50 mt-0.5 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 sm:py-1">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              handleToggleAbsent(member.id, !!member.isAbsent);
                            }}
                            className={cn(
                              "flex items-center px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl transition-all font-bold text-[8px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap",
                              member.isAbsent ? "text-orange-500 bg-orange-50" : "text-gray-400 bg-gray-50 dark:bg-black hover:bg-orange-50 hover:text-orange-500"
                            )}
                          >
                            <Clock className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                            {member.isAbsent ? 'Voltou' : 'Ausente'}
                          </button>

                          <button 
                            onClick={() => { 
                              setSelectedMember(member); 
                              setTempMinistryIds(member.ministryIds || (member.ministryId ? [member.ministryId] : []));
                              setTempMemberMinistries(member.ministries || []);
                              setTempRelationships(member.relationships || []);
                              setPhotoPreview(member.photoUrl || null);
                              setIsAddingNewFunction(false);
                              setNewFunctionValue("");
                              setIsEditMemberModalOpen(true); 
                            }}
                            className="flex items-center px-1.5 py-1 sm:px-3 sm:py-2 bg-gray-50 dark:bg-black text-gray-400 hover:text-ibc-blue hover:bg-ibc-blue/5 rounded-lg sm:rounded-xl transition-all font-bold text-[8px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap"
                          >
                            <Edit2 className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                            <span>Editar</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 border-l sm:border-none pl-1.5 sm:pl-0 border-gray-100 dark:border-[#222]">
                          {appUser?.role === 'admin' && (
                            <>
                              {member.isActive ? (
                                <button 
                                  onClick={() => { setSelectedMember(member); setIsDeactivateModalOpen(true); }}
                                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-gray-50 dark:bg-black text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all font-bold text-[8px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                  <UserMinus className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1 sm:mr-1.5" />
                                  Negativo
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    showConfirm(
                                      'Reativar Membro',
                                      `Deseja reativar o membro ${member.name}?`,
                                      async () => {
                                        try {
                                          await updateDoc(doc(db, 'members', member.id), { 
                                            isActive: true, 
                                            exitDate: deleteField(), 
                                            exitReason: deleteField(), 
                                            updatedAt: serverTimestamp() 
                                          });
                                        } catch (error) {
                                          console.error("Reactivate Error:", error);
                                          showAlert("Erro", "Não foi possível reativar o membro.");
                                        }
                                      }
                                    );
                                  }}
                                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-ibc-teal/5 text-ibc-teal hover:bg-ibc-teal/10 rounded-lg sm:rounded-xl transition-all font-bold text-[8px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                  <UserPlus className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1 sm:mr-1.5" />
                                  Ativar
                                </button>
                              )}
                            </>
                          )}
                          {appUser?.isFullAdmin && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                showPasswordPrompt(
                                  'Segurança Adicional',
                                  `Digite a senha para excluir ${member.name}:`,
                                  async () => {
                                    try {
                                      const memberData = { ...member };
                                      await deleteDoc(doc(db, 'members', member.id));
                                      triggerUndo({
                                        type: 'delete',
                                        collection: 'members',
                                        id: member.id,
                                        data: memberData,
                                        message: `Membro ${member.name} foi excluído.`
                                      });
                                    } catch (error) {
                                      console.error("Delete Error:", error);
                                      showAlert("Erro", "Não foi possível excluir o membro.");
                                    }
                                  }
                                );
                              }}
                              className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-red-50 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg sm:rounded-xl transition-all font-bold text-[8px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap"
                            >
                              <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1 sm:mr-1.5" />
                              Excluir
                            </button>
                          )}
                        </div>
                        <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-ibc-blue transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredMembers.length > visibleMembersCount && (
                  <div className="flex justify-center pt-5 pb-5 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setVisibleMembersCount(prev => prev + 30)}
                      className="px-6 py-3 bg-white dark:bg-[#111] hover:bg-gray-50 dark:bg-black active:scale-95 text-ibc-teal border border-ibc-teal/20 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Carregar mais membros ({filteredMembers.length - visibleMembersCount} restantes)
                    </button>
                  </div>
                )}
              </div>
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-20">
                  <div className="bg-gray-100 dark:bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">Nenhum membro encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Tente ajustar sua busca ou adicione um novo membro.</p>
                </div>
              )}
            </div>
          ) : activeTab === 'ministries' ? (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-10">
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {ministries.map((m, idx) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      onClick={() => { setSelectedMinistry(m); setIsMinistryMembersModalOpen(true); }}
                      className="p-4 sm:p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group relative overflow-hidden cursor-pointer h-32 sm:h-48 flex flex-col justify-end active:scale-[0.98]"
                      style={{
                        backgroundColor: m.photoUrl ? m.color : `${m.color}cc`,
                        backgroundImage: m.photoUrl ? `url(${m.photoUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backdropFilter: m.photoUrl ? 'none' : 'blur(20px)'
                      }}
                    >
                      {/* Dark overlay for better text readability, especially over images */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                      <div className="relative z-10 w-full">
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight drop-shadow-md truncate">
                          {m.name}
                        </h3>
                        <p className="text-[8px] sm:text-[10px] text-white/90 font-black uppercase tracking-widest mt-1 drop-shadow-sm">
                          {members.filter(mem => mem.isActive !== false && ((mem.ministryIds?.includes(m.id)) || (mem.ministryId === m.id))).length} Participantes
                        </p>
                      </div>

                      {(appUser?.role === 'admin' || appUser?.isFullAdmin) && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex space-x-1 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:translate-y-[-10px] lg:group-hover:translate-y-0 z-20">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedMinistry(m);
                              setPhotoPreview(m.photoUrl || null);
                              setIsEditMinistryModalOpen(true); 
                            }}
                            className="p-2 text-white hover:bg-white/30 rounded-xl transition-all backdrop-blur-md bg-black/20 hover:text-white"
                            title="Editar Ministério"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteMinistry(m.id, m.name); }}
                            className="p-2 text-white hover:bg-red-500/40 rounded-xl transition-all backdrop-blur-md bg-white/10"
                            title="Excluir Ministério"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {ministries.length === 0 && (
                <div className="text-center py-20">
                  <div className="bg-gray-100 dark:bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LayoutGrid className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">Nenhum ministério encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Adicione um novo ministério para começar.</p>
                </div>
              )}
            </div>
          ) : activeTab === 'assembleia' ? (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
              {/* Quick Actions for Reuniões */}
              {appUser?.role === 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setPhotoPreview(null);
                      setIsAddAtaModalOpen(true);
                    }}
                    className="bg-ibc-teal/5 p-4 sm:p-6 rounded-3xl border-2 border-dashed border-ibc-teal/20 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-ibc-teal/10 transition-all group h-full min-h-[120px] sm:min-h-[160px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-ibc-teal text-white flex items-center justify-center mb-4 shadow-lg shadow-ibc-teal/20 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ibc-teal">Nova Ata</h3>
                    <p className="text-xs text-ibc-teal/60 font-medium mt-1">Clique para registrar uma nova reunião</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setIsAddPresencaModalOpen(true)}
                    className="bg-ibc-teal/5 p-4 sm:p-6 rounded-3xl border-2 border-dashed border-ibc-teal/20 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-ibc-teal/10 transition-all group h-full min-h-[120px] sm:min-h-[160px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-ibc-teal text-white flex items-center justify-center mb-4 shadow-lg shadow-ibc-teal/20 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ibc-teal">Nova Lista</h3>
                    <p className="text-xs text-ibc-teal/60 font-medium mt-1">Clique para registrar uma nova lista de presença</p>
                  </motion.div>
                </div>
              )}

              {/* Sub-tabs for Reuniões */}
              <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#111] p-1.5 rounded-2xl border border-gray-100 dark:border-[#222] w-fit shadow-sm max-w-full">
                <button
                  onClick={() => setAssembleiaSubTab('assembleia')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    assembleiaSubTab === 'assembleia' 
                      ? "bg-ibc-blue text-white shadow-lg shadow-ibc-blue/20" 
                      : "text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-black"
                  )}
                >
                  Assembleia
                </button>
                <button
                  onClick={() => setAssembleiaSubTab('reuniao')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    assembleiaSubTab === 'reuniao' 
                      ? "bg-ibc-blue text-white shadow-lg shadow-ibc-blue/20" 
                      : "text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-black"
                  )}
                >
                  Reunião
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {/* Render Atas for current sub-tab */}
                  {atas.filter(a => {
                    const type = a.type || 'Assembleia';
                    return type === (assembleiaSubTab === 'assembleia' ? 'Assembleia' : 'Reunião');
                  }).map((ata, idx) => (
                    <motion.div
                      key={ata.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      onClick={() => { setSelectedAta(ata); setIsViewAtaModalOpen(true); }}
                      className="glass-card p-4 sm:p-6 rounded-[2.5rem] border border-gray-100/50 shadow-sm hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 group relative cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-ibc-blue bg-ibc-blue/10 shadow-sm">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 leading-tight group-hover:text-ibc-blue transition-colors truncate">
                              Ata nº {ata.number}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-ibc-blue/10 text-ibc-blue">Ata</span>
                          </div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {safeFormatDate(ata.date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                          {ata.content}
                        </p>
                      </div>

                      <div className="absolute top-4 right-4 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:translate-y-[-10px] lg:group-hover:translate-y-0 flex items-center space-x-1">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedAta(ata); 
                            setPhotoPreview(ata.photoUrl || null);
                            setIsEditAtaModalOpen(true); 
                          }}
                          className="p-2 text-gray-400 hover:text-ibc-teal hover:bg-ibc-teal/5 rounded-xl transition-all"
                          title="Editar Ata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {appUser?.isFullAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteAta(ata.id, ata.number); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Excluir Ata"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Render Presencas for current sub-tab */}
                  {presencas.filter(p => {
                    const type = p.type || 'Reunião';
                    return type === (assembleiaSubTab === 'assembleia' ? 'Assembleia' : 'Reunião');
                  }).map((presenca, idx) => (
                    <motion.div
                      key={presenca.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      onClick={() => { setSelectedPresenca(presenca); setIsViewPresencaModalOpen(true); }}
                      className="glass-card p-4 sm:p-6 rounded-[2.5rem] border border-gray-100/50 shadow-sm hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-500 group relative cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-ibc-blue bg-ibc-blue/10 shadow-sm">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 leading-tight group-hover:text-ibc-blue transition-colors truncate">
                              Ata nº {presenca.ataNumber}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-ibc-teal/10 text-ibc-teal">Lista</span>
                          </div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {safeFormatDate(presenca.date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-ibc-teal/40" />
                          Lista de presença para impressão
                        </p>
                      </div>

                      <div className="absolute top-4 right-4 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:translate-y-[-10px] lg:group-hover:translate-y-0 flex items-center space-x-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedPresenca(presenca); setIsEditPresencaModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-ibc-teal hover:bg-ibc-teal/5 rounded-xl transition-all"
                          title="Editar Lista"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {appUser?.isFullAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeletePresenca(presenca.id, presenca.ataNumber); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Excluir Lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-10">
              {/* Reports / Dashboard Section */}
              <section className="space-y-3 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-50 tracking-tight">Relatórios e Estatísticas</h3>
                    <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Visão geral do quadro de membros da {appSettings.appName}.</p>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <button 
                      onClick={handleExportPDF}
                      className="bg-ibc-teal text-white flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-2xl font-bold flex items-center justify-center shadow-lg shadow-ibc-teal/20 transition-all hover:-translate-y-1 active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest"
                    >
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                      Exportar PDF
                    </button>
                    <div className="px-3 py-3 sm:px-4 sm:py-2 bg-ibc-teal/10 rounded-2xl flex items-center whitespace-nowrap">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-ibc-teal mr-2" />
                      <span className="text-[10px] sm:text-xs font-black text-ibc-teal uppercase tracking-widest">{reportData.total} Membros</span>
                    </div>
                  </div>
                </div>

                {/* Estatísticas de Movimentação de Membros */}
                <section className="bg-white dark:bg-[#111] p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-[#222] mt-6">
                  <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                    <h4 className="text-lg font-black text-gray-900 dark:text-gray-50">Estatísticas de Movimentação</h4>
                    <div className="flex items-center gap-2">
                        <select className="bg-gray-50 dark:bg-black border-none rounded-xl px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                          <option value={-1}>Ano Inteiro</option>
                          {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
                        </select>
                        <select className="bg-gray-50 dark:bg-black border-none rounded-xl px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-8 bg-gray-50 dark:bg-black p-4 rounded-2xl border border-dashed border-gray-200 dark:border-[#333]">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-ibc-teal/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-ibc-teal" />
                      </div>
                      <p className="font-medium leading-relaxed italic">{memberStats.summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {Object.values(memberStats.categories).map((category: any) => {
                      const Icon = category.icon;
                      const percentage = members.length > 0 ? Math.round((category.members.length / members.length) * 100) : 0;
                      const isGrowing = category.members.length >= (category.prevMembers?.length || 0);
                      const diff = Math.abs(category.members.length - (category.prevMembers?.length || 0));
                      const percentDiff = category.prevMembers.length > 0 
                        ? ((diff / category.prevMembers.length) * 100).toFixed(1) 
                        : '100';
                      
                      return (
                        <button 
                          key={category.id}
                          onClick={() => setExpandedCard(expandedCard === category.id ? null : category.id)}
                          className={`glass-card p-4 sm:p-6 rounded-[2.5rem] border border-white/40 shadow-sm text-left transition-all hover:scale-[1.02] active:scale-95 ${
                            expandedCard === category.id ? 'ring-2 ring-ibc-teal shadow-lg' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ backgroundColor: `${category.color}15`, color: category.color }}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ backgroundColor: `${category.color}10`, color: category.color }}>
                              {category.tag}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline space-x-2">
                             <div className="text-xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 leading-tight">
                               {category.members.length}
                             </div>
                             <div className={`flex items-center text-[9px] sm:text-[11px] font-black ${isGrowing ? (category.id === 'absents' || category.id === 'inactives' ? 'text-red-500' : 'text-green-500') : (category.id === 'absents' || category.id === 'inactives' ? 'text-green-500' : 'text-red-500')}`}>
                                {isGrowing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {percentDiff}%
                             </div>
                          </div>
                          
                          <div className="mt-3 h-1.5 w-full bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                          </div>

                          <div className="mt-3">
                            <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                              {percentage}% da base total
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mb-8">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Evolução Mensal</h5>
                    <div className="h-48 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberStats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} 
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'transparent' }}
                          />
                          <Bar dataKey="novos" name="novos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ausentes" name="ausentes" fill="#F97316" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="inativos" name="inativos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="voltaram" name="voltaram" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fullscreen Member List Modal */}
                  <AnimatePresence>
                    {expandedCard && memberStats.categories[expandedCard] && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-10 pointer-events-auto">
                        {/* Backdrop */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 bg-gray-900/40 backdrop-blur-md cursor-pointer"
                          onClick={() => setExpandedCard(null)}
                        />
                        
                        {/* Modal Container */}
                        <motion.div 
                          initial={{ y: 50, opacity: 0, scale: 0.95 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: 50, opacity: 0, scale: 0.95 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 32,
                            mass: 0.8
                          }}
                          className="relative w-full h-full sm:max-w-6xl sm:max-h-[90vh] bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col z-10"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between p-6 sm:p-10 border-b border-gray-100 dark:border-[#222] shrink-0 glass-header sticky top-0 z-20">
                            <div className="flex items-center space-x-4">
                              <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" 
                                style={{ backgroundColor: `${memberStats.categories[expandedCard].color}15`, color: memberStats.categories[expandedCard].color }}
                              >
                                {(() => {
                                  const Icon = memberStats.categories[expandedCard].icon;
                                  return <Icon className="w-6 h-6" />;
                                })()}
                              </div>
                              <div>
                                <h5 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-50 flex items-center leading-none">
                                  {memberStats.categories[expandedCard].label}
                                </h5>
                                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5 flex items-center">
                                  {memberStats.categories[expandedCard].members.length} registros • 
                                  <span className="ml-1.5">
                                    {selectedMonth === -1 
                                      ? `Ano de ${selectedYear}`
                                      : `${new Date(0, selectedMonth).toLocaleString('pt-BR', { month: 'long' })} / ${selectedYear}`
                                    }
                                  </span>
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setExpandedCard(null)} 
                              className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 dark:bg-black text-gray-400 hover:text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center transition-all active:scale-90"
                            >
                              <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                          </div>

                          {/* Member List Content */}
                          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar overscroll-contain">
                            {memberStats.categories[expandedCard].members.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-10">
                                {memberStats.categories[expandedCard].members.map((m, idx) => (
                                  <motion.div 
                                    key={m.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex items-center space-x-4 p-4 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm hover:border-ibc-teal/50 hover:shadow-xl hover:shadow-gray-100 transition-all group"
                                  >
                                      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-black overflow-hidden shrink-0 border border-gray-100 dark:border-[#222] flex items-center justify-center text-lg font-bold text-gray-400 group-hover:scale-105 transition-transform">
                                        {m.photoUrl ? (
                                          <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.name} referrerPolicy="no-referrer" />
                                        ) : (
                                          m.name.charAt(0)
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-black text-gray-900 dark:text-gray-50 text-sm sm:text-base truncate group-hover:text-ibc-teal transition-colors tracking-tight">
                                          {m.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                          {(m.function || 'Membro')}
                                        </div>
                                      </div>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-black flex items-center justify-center text-gray-200 mb-4">
                                  <X className="w-10 h-10" />
                                </div>
                                <h6 className="text-lg font-bold text-gray-900 dark:text-gray-50">Nenhum registro encontrado</h6>
                                <p className="text-sm text-gray-400 mt-1 max-w-xs">Não existem membros nesta categoria para o período selecionado.</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Mobile Bottom Padding (safe area) */}
                          <div className="h-safe-bottom sm:hidden shrink-0" />
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Functions Bar Chart */}
                  <div className="glass-card p-4 sm:p-8 rounded-[3rem] border border-white/40 shadow-sm overflow-x-auto">
                    <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
                        <LayoutGrid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-50 uppercase tracking-widest">Membros por Função</h4>
                    </div>
                    <div className="space-y-2">
                       {Object.entries(reportData.functionsDetails)
                         .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
                         .map(([name, data]: [string, any]) => (
                         <div key={name}>
                             <button
                               onClick={() => setExpandedFunction(name)}
                               className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] hover:border-ibc-teal/50 transition-all group"
                             >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#111] flex items-center justify-center text-ibc-teal shadow-sm text-xs font-bold">
                                    {data.count}
                                  </div>
                                  <span className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">{name}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-[10px] font-black text-gray-400">{data.percentage}%</span>
                                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-ibc-teal transition-colors" />
                                </div>
                             </button>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Status Pie Chart */}
                  <div className="glass-card p-4 sm:p-8 rounded-[3rem] border border-white/40 shadow-sm overflow-x-auto">
                    <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
                        <LucidePieChart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-50 uppercase tracking-widest">Distribuição por Status</h4>
                    </div>
                    <div className="h-64 sm:h-80 w-full flex flex-col items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {reportData.statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={reportData.COLORS[index % reportData.COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Member by Function Fullscreen Modal */}
                <AnimatePresence>
                  {expandedFunction && reportData.functionsDetails[expandedFunction] && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-10 pointer-events-auto">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md cursor-pointer"
                        onClick={() => setExpandedFunction(null)}
                      />
                      
                      <motion.div 
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 32,
                          mass: 0.8
                        }}
                        className="relative w-full h-full sm:max-w-6xl sm:max-h-[90vh] bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col z-10"
                      >
                        <div className="flex items-center justify-between p-6 sm:p-10 border-b border-gray-100 dark:border-[#222] shrink-0 glass-header sticky top-0 z-20">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-ibc-teal/10 text-ibc-teal flex items-center justify-center shadow-lg">
                              <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <h5 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-50 leading-none">
                                {expandedFunction}
                              </h5>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5 flex items-center">
                                {reportData.functionsDetails[expandedFunction].count} membros ativos • 
                                <span className="ml-1.5 text-ibc-teal font-black">
                                  {reportData.functionsDetails[expandedFunction].percentage}% do quadro total
                                </span>
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setExpandedFunction(null)} 
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 dark:bg-black text-gray-400 hover:text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center transition-all active:scale-90"
                          >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar overscroll-contain">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-10">
                            {reportData.functionsDetails[expandedFunction].members.map((m: any, idx: number) => (
                              <motion.div 
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="flex items-center space-x-4 p-4 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm hover:border-ibc-teal/50 hover:shadow-xl hover:shadow-gray-100 transition-all group"
                              >
                                  <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-black overflow-hidden shrink-0 border border-gray-100 dark:border-[#222] flex items-center justify-center text-lg font-bold text-gray-400 group-hover:scale-105 transition-transform">
                                    {m.photoUrl ? (
                                      <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.name} referrerPolicy="no-referrer" />
                                    ) : (
                                      m.name.charAt(0)
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-black text-gray-900 dark:text-gray-50 text-sm sm:text-base truncate group-hover:text-ibc-teal transition-colors tracking-tight">
                                      {m.name}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {m.function}
                                      </span>
                                      <span className="text-[9px] font-black uppercase text-green-500 bg-green-50 px-1.5 py-0.5 rounded-lg">
                                        Ativo
                                      </span>
                                    </div>
                                  </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="h-safe-bottom sm:hidden shrink-0" />
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>


              </section>
            </div>
          ) : activeTab === 'rh' ? (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-10">
              {/* Filtro Card */}
              <section className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
                <div 
                  onClick={() => setIsRHFilterCollapsed(!isRHFilterCollapsed)}
                  className="flex items-center justify-between p-3 sm:p-8 cursor-pointer hover:bg-gray-50 dark:bg-black transition-colors"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight flex items-center">
                      <Filter className="w-5 h-5 mr-3 text-ibc-teal" />
                      Filtro
                      {isRHFilterCollapsed ? (
                        <ChevronDown className="w-5 h-5 ml-2 text-gray-400" />
                      ) : (
                        <ChevronUp className="w-5 h-5 ml-2 text-gray-400" />
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Filtre membros por parentesco, função ou veja os casais.</p>
                  </div>
                </div>

                <AnimatePresence>
                  {!isRHFilterCollapsed && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-3 sm:px-8 pb-3 sm:pb-8 space-y-3 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Filtrar Por</label>
                            <select 
                              value={rhFilterType}
                              onChange={(e) => {
                                setRhFilterType(e.target.value as any);
                                setRhSelectedValue('');
                              }}
                              className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm font-bold transition-all"
                            >
                              <option value="all">Selecione um filtro...</option>
                              <option value="relationship">Grau de Parentesco</option>
                              <option value="function">Função de Membro</option>
                              <option value="couples">Casais</option>
                            </select>
                          </div>

                          {rhFilterType === 'relationship' && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Selecionar Parentesco</label>
                              <select 
                                value={rhSelectedValue}
                                onChange={(e) => setRhSelectedValue(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm font-bold transition-all"
                              >
                                <option value="">Todos os parentescos...</option>
                                {relationshipTypes.map(rt => (
                                  <option key={rt.id} value={rt.name}>{rt.name}</option>
                                ))}
                              </select>
                            </motion.div>
                          )}

                          {rhFilterType === 'function' && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Selecionar Função</label>
                              <select 
                                value={rhSelectedValue}
                                onChange={(e) => setRhSelectedValue(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm font-bold transition-all"
                              >
                                <option value="">Todas as funções...</option>
                                {memberFunctions.map(f => (
                                  <option key={f.id} value={f.name}>{f.name}</option>
                                ))}
                              </select>
                            </motion.div>
                          )}

                          {((rhFilterType !== 'all' && (rhSelectedValue || rhFilterType === 'couples'))) && (
                            <div className="flex items-end">
                              <button 
                                onClick={handleExportRHFilterPDF}
                                className="w-full p-3 bg-ibc-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center hover:bg-ibc-blue/90 shadow-lg shadow-ibc-blue/20 transition-all active:scale-95"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar em PDF
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Resultados */}
                        <div className="mt-8 pt-6 border-t border-gray-50">
                          {rhFilterType === 'couples' ? (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Casais Identificados</h4>
                                <div className="bg-ibc-teal/10 text-ibc-teal px-4 py-2 rounded-2xl flex items-center shadow-sm">
                                  <Heart className="w-3.5 h-3.5 mr-2 text-red-500 fill-current" />
                                  <span className="text-xs font-black uppercase tracking-tight">
                                    {getCouples().length} {getCouples().length === 1 ? 'Casal' : 'Casais'}
                                  </span>
                                </div>
                              </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getCouples().map((couple, index) => (
                                  <motion.div 
                                    key={index} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm hover:shadow-md group hover:border-red-200 dark:hover:border-red-900/30 transition-all flex flex-col items-center relative overflow-hidden"
                                  >
                                    <div className="flex items-center justify-center w-full mb-3 relative z-10">
                                      {/* Left Person */}
                                      <div className="relative">
                                        <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-[#111] overflow-hidden flex items-center justify-center border-2 border-white dark:border-[#0a0a0a] shadow-sm z-10 relative">
                                          {(couple.husband || couple.raw[0])?.photoUrl ? (
                                            <img src={(couple.husband || couple.raw[0])!.photoUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <User className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Heart Center */}
                                      <div className="mx-2 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 p-2 rounded-full z-20 shadow-sm border border-red-100 dark:border-red-900/30 group-hover:scale-110 group-hover:rotate-12 transition-transform -mt-2">
                                        <Heart className="w-4 h-4 text-red-500 fill-current" />
                                      </div>

                                      {/* Right Person */}
                                      <div className="relative">
                                        <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-[#111] overflow-hidden flex items-center justify-center border-2 border-white dark:border-[#0a0a0a] shadow-sm z-10 relative">
                                          {(couple.wife || couple.raw[1])?.photoUrl ? (
                                            <img src={(couple.wife || couple.raw[1])!.photoUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <User className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-center w-full">
                                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate px-2">
                                        {(couple.husband || couple.raw[0]).name.split(' ')[0]} <span className="text-red-400 dark:text-red-600/50 font-normal mx-0.5">&</span> {(couple.wife || couple.raw[1]).name.split(' ')[0]}
                                      </p>
                                    </div>
                                  </motion.div>
                                ))}
                                {getCouples().length === 0 && (
                                  <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-black rounded-3xl border border-dashed border-gray-200 dark:border-[#333]">
                                    <Heart className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                    <p className="text-xs text-gray-400 font-medium">Nenhum casal identificado nos vínculos atuais.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (rhFilterType !== 'all' && rhSelectedValue) ? (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membros Encontrados</h4>
                                <div className="bg-ibc-teal/10 text-ibc-teal px-4 py-2 rounded-2xl flex items-center shadow-sm">
                                  <Users className="w-3.5 h-3.5 mr-2" />
                                  <span className="text-xs font-black uppercase tracking-tight">
                                    {getFilteredMembers().length} {getFilteredMembers().length === 1 ? 'Membro' : 'Membros'}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getFilteredMembers().map((member, index) => (
                                  <motion.div 
                                    key={member.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setIsViewMemberModalOpen(true);
                                    }}
                                    className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] flex items-center space-x-3 hover:border-ibc-teal/30 hover:bg-white dark:bg-[#111] cursor-pointer transition-all hover:shadow-md"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1a1a1a] shadow-sm flex items-center justify-center text-ibc-teal font-black text-xs overflow-hidden border border-gray-100 dark:border-[#222] shrink-0">
                                      {member.photoUrl ? (
                                        <img src={member.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <User className="w-5 h-5 text-gray-300" />
                                      )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{member.name}</span>
                                      <span className="text-[10px] font-medium text-gray-400">{member.function}</span>
                                    </div>
                                  </motion.div>
                                ))}
                                {getFilteredMembers().length === 0 && (
                                  <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-black rounded-3xl border border-dashed border-gray-200 dark:border-[#333]">
                                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                    <p className="text-xs text-gray-400 font-medium">Nenhum membro encontrado com este filtro.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            rhFilterType !== 'all' && (
                              <div className="text-center py-12 bg-gray-50 dark:bg-black rounded-3xl border border-dashed border-gray-200 dark:border-[#333]">
                                <Filter className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-xs text-gray-400 font-medium">Selecione uma opção acima para visualizar os resultados.</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Member Functions Management Section moved from ADM to RH */}
              {appUser?.role === 'admin' ? (
                <>
                  <section className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
                    <div 
                      onClick={() => setIsMemberFunctionsCollapsed(!isMemberFunctionsCollapsed)}
                      className="flex items-center justify-between p-4 sm:p-8 cursor-pointer hover:bg-gray-50 dark:bg-black transition-colors"
                    >
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight flex items-center">
                          Funções de Membros
                          {isMemberFunctionsCollapsed ? (
                            <ChevronDown className="w-5 h-5 ml-2 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-5 h-5 ml-2 text-gray-400" />
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Gerencie as funções disponíveis para cadastro de membros.</p>
                      </div>
                      {!isMemberFunctionsCollapsed && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddFunctionModalOpen(true);
                          }}
                          className="bg-ibc-teal/10 text-ibc-teal px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center hover:bg-ibc-teal/20 transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          Nova Função
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {!isMemberFunctionsCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-4 sm:px-8 pb-4 sm:pb-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {memberFunctions.map((f) => (
                                <div 
                                  key={f.id} 
                                  onClick={() => {
                                    setSelectedFunction(f);
                                    setIsViewFunctionDetailsModalOpen(true);
                                  }}
                                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] hover:border-ibc-teal/30 hover:bg-gray-50/80 transition-all cursor-pointer select-none group"
                                >
                                  <div className="flex items-center min-w-0 mr-2">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-ibc-teal transition-colors">{f.name}</span>
                                    <Info className="w-3.5 h-3.5 ml-2 text-gray-400 group-hover:text-ibc-teal transition-colors shrink-0" />
                                  </div>
                                  <div className="flex items-center space-x-3 shrink-0">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFunction(f);
                                        setIsEditFunctionModalOpen(true);
                                      }}
                                      className="p-2 text-gray-400 hover:text-ibc-teal hover:bg-ibc-teal/5 rounded-xl transition-all"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFunction(f);
                                      }}
                                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Relationship Types Management Section */}
                  <section className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
                    <div 
                      onClick={() => setIsRelationshipTypesCollapsed(!isRelationshipTypesCollapsed)}
                      className="flex items-center justify-between p-4 sm:p-8 cursor-pointer hover:bg-gray-50 dark:bg-black transition-colors"
                    >
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight flex items-center">
                          Parentesco / Família
                          {isRelationshipTypesCollapsed ? (
                            <ChevronDown className="w-5 h-5 ml-2 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-5 h-5 ml-2 text-gray-400" />
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">Gerencie os graus de parentesco disponíveis para cadastro de membros.</p>
                      </div>
                      {!isRelationshipTypesCollapsed && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddRelationshipTypeModalOpen(true);
                          }}
                          className="bg-ibc-teal/10 text-ibc-teal px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center hover:bg-ibc-teal/20 transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          Novo Grau
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {!isRelationshipTypesCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-4 sm:px-8 pb-4 sm:pb-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {relationshipTypes.map((rt) => (
                                <div key={rt.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] hover:border-ibc-teal/30 transition-all group">
                                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate mr-2">{rt.name}</span>
                                  <div className="flex items-center space-x-3 shrink-0">
                                    <button 
                                      onClick={() => {
                                        setSelectedRelationshipType(rt);
                                        setIsEditRelationshipTypeModalOpen(true);
                                      }}
                                      className="p-2 text-gray-400 hover:text-ibc-teal hover:bg-ibc-teal/5 rounded-xl transition-all"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRelationshipType(rt)}
                                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </>
              ) : (
                <div className="text-center py-20 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm">
                   <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Acesso Restrito</h3>
                   <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">Esta área é destinada apenas para administradores do sistema.</p>
                </div>
              )}
            </div>
          ) : activeTab === 'normativos' ? (
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
              {/* Introduction Card */}
              <section className="bg-gradient-to-br from-white to-gray-50/50 p-6 sm:p-8 rounded-3xl border border-gray-250/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-ibc-teal/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl pointer-events-none" />
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-ibc-teal/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-ibc-teal" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight leading-snug">
                        Você sabe o que é Estatuto e Regimento Interno?
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 font-bold mt-1">
                        Abaixo está a descrição de como cada um funciona:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="p-5 bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] hover:border-ibc-teal/20 hover:shadow-sm transition-all duration-300">
                      <div className="flex items-center space-x-2.5 mb-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-ibc-teal shadow-sm" />
                        <h4 className="font-bold text-gray-900 dark:text-gray-50 text-sm sm:text-base">Estatuto (ou Estatuto Social)</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                        É a "certidão de nascimento" da instituição. Define as regras fundamentais, como os objetivos, direitos e deveres dos membros, cargos da diretoria e como alterar as regras principais.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] hover:border-ibc-teal/20 hover:shadow-sm transition-all duration-300">
                      <div className="flex items-center space-x-2.5 mb-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-ibc-blue shadow-sm" />
                        <h4 className="font-bold text-gray-900 dark:text-gray-50 text-sm sm:text-base">Regimento Interno</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                        É um documento complementar. Ele detalha a rotina, o funcionamento prático, horários, vestimentas, uso de espaços e procedimentos do dia a dia, sempre respeitando o que foi definido no estatuto.
                      </p>
                    </div>
                  </div>

                  <div className="bg-ibc-teal/[0.04] border-l-4 border-ibc-teal p-4 rounded-r-2xl font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm flex items-center space-x-2">
                    <span className="text-base">💡</span>
                    <span><strong>Em resumo:</strong> o estatuto cria as bases e o regimento interno detalha a operação.</span>
                  </div>
                </div>
              </section>

              {/* Document Actions Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Card Estatuto */}
                <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        {appSettings.estatutoUrl ? (
                          <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap flex items-center shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                            Disponível
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-50 dark:bg-black text-gray-400 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-1.5" />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Estatuto Social</h4>
                      <p className="text-xs text-gray-400 font-medium mt-1">
                        Regras fundamentais e objetivos principais da instituição.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    {appSettings.estatutoUrl ? (
                      <a 
                        href={appSettings.estatutoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-ibc-teal to-ibc-blue hover:opacity-95 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-ibc-teal/25 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Estatuto (PDF)</span>
                      </a>
                    ) : (
                      <button 
                        disabled
                        className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 cursor-not-allowed"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Aguardando Publicação</span>
                      </button>
                    )}

                    {appUser?.role === 'admin' && (
                      <div className="relative pt-2 border-t border-gray-100 dark:border-[#222]">
                        <label className="w-full bg-gray-50 dark:bg-black hover:bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 py-3 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer transition-all border border-gray-200 dark:border-[#333] border-dashed active:scale-98">
                          {isUploadingEstatuto ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span>{appSettings.estatutoUrl ? 'Atualizar Estatuto' : 'Importar Estatuto'}</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="application/pdf" 
                            onChange={(e) => handleDocumentUpload(e, 'estatuto')}
                            className="hidden" 
                            disabled={isUploadingEstatuto}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Regimento */}
                <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        {appSettings.regimentoUrl ? (
                          <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap flex items-center shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                            Disponível
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-50 dark:bg-black text-gray-400 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-1.5" />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Regimento Interno</h4>
                      <p className="text-xs text-gray-400 font-medium mt-1">
                        Regulamentos práticos para convivência, rotinas e atividades no dia a dia.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    {appSettings.regimentoUrl ? (
                      <a 
                        href={appSettings.regimentoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-ibc-teal to-ibc-blue hover:opacity-95 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-ibc-teal/25 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Regimento (PDF)</span>
                      </a>
                    ) : (
                      <button 
                        disabled
                        className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 cursor-not-allowed"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Aguardando Publicação</span>
                      </button>
                    )}

                    {appUser?.role === 'admin' && (
                      <div className="relative pt-2 border-t border-gray-100 dark:border-[#222]">
                        <label className="w-full bg-gray-50 dark:bg-black hover:bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 py-3 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer transition-all border border-gray-200 dark:border-[#333] border-dashed active:scale-98">
                          {isUploadingRegimento ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span>{appSettings.regimentoUrl ? 'Atualizar Regimento' : 'Importar Regimento'}</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="application/pdf" 
                            onChange={(e) => handleDocumentUpload(e, 'regimento')}
                            className="hidden" 
                            disabled={isUploadingRegimento}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-10">
              {/* Scale Control Section */}
              <section className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-ibc-teal/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl pointer-events-none group-hover:bg-ibc-teal/10 transition-all duration-700" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal transition-transform group-hover:scale-110">
                      <Maximize2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Tamanho da Interface</h3>
                      <p className="text-sm text-gray-400 font-medium mt-1">Ajuste o zoom do aplicativo para melhor visualização profissional.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-black p-2 rounded-2xl border border-gray-100 dark:border-[#222]">
                    <button 
                      onClick={() => setUiScale(prev => Math.max(prev - 0.1, 0.7))}
                      className="w-12 h-12 bg-white dark:bg-[#111] text-ibc-teal border border-ibc-teal/20 rounded-xl flex items-center justify-center hover:bg-ibc-teal/5 transition-all active:scale-95 shadow-sm"
                      title="Diminuir Zoom"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-col items-center px-4 min-w-[80px]">
                      <span className="text-lg font-black text-ibc-teal tracking-tighter">{Math.round(uiScale * 100)}%</span>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Escala</span>
                    </div>

                    <button 
                      onClick={() => setUiScale(prev => Math.min(prev + 0.1, 1.5))}
                      className="w-12 h-12 bg-ibc-teal text-white rounded-xl flex items-center justify-center hover:bg-ibc-teal/90 transition-all active:scale-95 shadow-lg shadow-ibc-teal/20"
                      title="Aumentar Zoom"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <div className="w-px h-8 bg-gray-200 dark:bg-[#222] mx-1" />

                    <button 
                      onClick={() => setUiScale(1)}
                      className="px-4 h-12 bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:bg-[#222] transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                      title="Resetar para 100%"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </section>

              {/* Sharing Link Section */}
              <section className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-ibc-blue text-white flex items-center justify-center shadow-lg shadow-ibc-blue/20">
                        <Share className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Compartilhar Aplicativo</h4>
                    </div>
                    <button 
                      onClick={handleShareApp}
                      className="w-full sm:w-auto bg-ibc-blue text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-ibc-blue/20 hover:bg-ibc-blue/90 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <Share className="w-4 h-4 mr-2" />
                      Compartilhar Link
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl">
                      Divulgue o acesso à plataforma para outros membros da secretaria ou diretoria. 
                      Este é o link oficial para acesso externo através de qualquer navegador.
                    </p>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-white dark:bg-[#111] border border-blue-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm text-gray-600 dark:text-gray-300 font-bold font-mono outline-none shadow-inner overflow-hidden whitespace-nowrap overflow-ellipsis">
                        {publicAppLink}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(publicAppLink);
                          showAlert("Sucesso", "Link copiado para a área de transferência!");
                        }}
                        className="bg-white dark:bg-[#111] text-ibc-blue p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-100 hover:bg-blue-50 transition-all shadow-sm active:scale-95 shrink-0"
                        title="Copiar Link"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* PWA Install Section */}
              {!isStandalone && showInstallBanner && (
                <section className="bg-gradient-to-br from-ibc-teal to-ibc-blue p-8 rounded-3xl shadow-xl shadow-ibc-teal/20 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-700" />
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Download className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-black tracking-tight">Instalar Aplicativo</h3>
                    </div>
                    <p className="text-sm font-medium text-white/90 mb-6 max-w-md">
                      Instale o sistema da IBC Coqueiral no seu dispositivo para acesso rápido pela área de trabalho ou tela de início, mesmo offline.
                    </p>
                    <button 
                      onClick={handleInstallClick}
                      className="bg-white dark:bg-[#111] text-ibc-teal px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-white/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Instalar Agora
                    </button>
                  </div>
                </section>
              )}

              {/* Visual Settings Section */}
              {appUser?.isFullAdmin && (
                <section className="glass-card p-4 sm:p-8 rounded-[3rem] border border-white/40 shadow-sm">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Identidade Visual & App</h3>
                      <p className="text-sm text-gray-400 font-medium mt-1">Personalize a identidade da sua igreja no sistema.</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 dark:border-[#222]">
                      <div className="w-32 h-32 bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden shadow-sm p-1">
                        <img 
                          src={currentLogo} 
                          alt={appSettings.appName} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-50">Foto de Perfil do Aplicativo</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Esta imagem será utilizada como <strong>ícone oficial do aplicativo (PWA)</strong> em celulares e computadores, 
                          além de aparecer na tela de login e barra lateral. 
                          O sistema ajustará automaticamente para o formato quadrado.
                        </p>
                        <div className="flex items-center gap-3">
                          <label className="bg-ibc-teal text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-ibc-teal/90 transition-all cursor-pointer shadow-lg shadow-ibc-teal/10">
                            Alterar Foto do App
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg" 
                              className="hidden" 
                              onChange={handleLogoUpload}
                            />
                          </label>
                          {appSettings.logoUrl && (
                            <button 
                              onClick={async () => {
                                const oldData = { ...appSettings };
                                await setDoc(doc(db, 'settings', 'app'), { logoUrl: '' }, { merge: true });
                                triggerUndo({
                                  type: 'update',
                                  collection: 'settings',
                                  id: 'app',
                                  data: oldData,
                                  message: "Logotipo removido."
                                });
                                showAlert("Sucesso", "Logotipo removido.");
                              }}
                              className="text-xs font-bold text-red-500 hover:underline"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome da Instituição/App</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            defaultValue={appSettings.appName}
                            onBlur={async (e) => {
                              const newName = e.target.value.trim();
                              if (newName && newName !== appSettings.appName) {
                                const oldData = { ...appSettings };
                                await setDoc(doc(db, 'settings', 'app'), { appName: newName }, { merge: true });
                                triggerUndo({
                                  type: 'update',
                                  collection: 'settings',
                                  id: 'app',
                                  data: oldData,
                                  message: "Nome do aplicativo atualizado."
                                });
                                showAlert("Sucesso", "Nome do aplicativo atualizado!");
                              }
                            }}
                            className="flex-1 p-3 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-ibc-teal/20"
                            placeholder="Ex: IBC Coqueiral"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CNPJ da Igreja (Para Relatórios)</label>
                        <input 
                          type="text" 
                          defaultValue={appSettings.churchCnpj}
                          onBlur={async (e) => {
                            const newCnpj = e.target.value.trim();
                            if (newCnpj !== appSettings.churchCnpj) {
                              const oldData = { ...appSettings };
                              await setDoc(doc(db, 'settings', 'app'), { churchCnpj: newCnpj }, { merge: true });
                              triggerUndo({
                                type: 'update',
                                collection: 'settings',
                                id: 'app',
                                data: oldData,
                                message: "CNPJ atualizado."
                              });
                              showAlert("Sucesso", "CNPJ atualizado!");
                            }
                          }}
                          className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-ibc-teal/20"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {appUser?.isFullAdmin && (
                <section className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Backup de Dados</h3>
                      <p className="text-sm text-gray-400 font-medium mt-1">Baixe uma cópia de todos os dados do sistema.</p>
                    </div>
                    <button 
                      onClick={handleBackup}
                      className="bg-ibc-orange text-white px-6 py-3 rounded-2xl font-bold hover:bg-ibc-orange/90 transition-all flex items-center shadow-lg shadow-ibc-orange/20 active:scale-95"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Exportar JSON
                    </button>
                  </div>
                  <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-start">
                    <AlertCircle className="w-5 h-5 text-ibc-orange mr-4 mt-0.5" />
                    <p className="text-sm text-orange-900 font-medium leading-relaxed">
                      Recomendamos realizar o backup semanalmente para garantir a segurança das informações.
                    </p>
                  </div>
                </section>
              )}

              {/* User Management Section */}
              {appUser?.isFullAdmin && (
                <section className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-[#222] shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">Usuários do Sistema</h3>
                    <p className="text-sm text-gray-400 font-medium mt-1">Gerencie quem tem acesso e níveis de permissão.</p>
                  </div>
                  <div className="flex flex-col items-end space-y-3">
                    {appUser?.role === 'admin' && (
                      <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="text-ibc-teal font-black text-sm uppercase tracking-widest flex items-center hover:opacity-70 transition-opacity"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Novo Usuário
                      </button>
                    )}
                    <a 
                      href="https://console.firebase.google.com/project/gen-lang-client-0749076142/authentication/providers" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-400 font-bold hover:text-ibc-blue flex items-center transition-colors uppercase tracking-widest"
                    >
                      Configurar Métodos de Login
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-10 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 dark:border-[#222]">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Link de Acesso Atual (Ambiente de Desenvolvimento)</h4>
                  <div className="flex items-center space-x-3">
                    <input 
                      readOnly 
                      value={window.location.origin} 
                      className="flex-1 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] p-3 rounded-xl text-sm text-gray-600 dark:text-gray-300 font-medium outline-none focus:ring-2 focus:ring-gray-100 transition-all"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        showAlert("Sucesso", "Link copiado!");
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-300 p-3"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-10 overflow-hidden border border-gray-100 dark:border-[#222] rounded-2xl">
                {/* Table for large screens, Cards for mobile */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Solicitação</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Decisão</th>
                          <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <tr key={u.id} className={cn("hover:bg-gray-50/30 transition-colors", u.status === 'pending' && "bg-amber-50/30")}>
                            <td className="px-8 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{u.email}</span>
                                {u.status === 'pending' && (
                                  <span className="mt-1 w-fit inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-800 uppercase tracking-widest">
                                    Novo Acesso
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                                u.role === 'admin' ? "bg-purple-500 text-white" : "bg-blue-500 text-white"
                              )}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center w-fit",
                                u.status === 'approved' ? "bg-emerald-500 text-white" : 
                                u.status === 'pending' ? "bg-amber-500 text-white animate-pulse" : "bg-rose-500 text-white"
                              )}>
                                {u.status === 'approved' ? <Check className="w-3 h-3 mr-1" /> : u.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                {u.status === 'approved' ? 'Aprovado' : u.status === 'blocked' ? 'Bloqueado' : u.status === 'pending' ? 'Pendente' : 'Ativo'}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                                {u.requestAt?.seconds ? new Date(u.requestAt.seconds * 1000).toLocaleDateString('pt-BR') : '-'}
                              </p>
                              <p className="text-[9px] text-gray-400">
                                {u.requestAt?.seconds ? new Date(u.requestAt.seconds * 1000).toLocaleTimeString('pt-BR') : '-'}
                              </p>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                                  {u.status === 'approved' && u.approvedAt?.seconds ? new Date(u.approvedAt.seconds * 1000).toLocaleDateString('pt-BR') : 
                                   u.status === 'blocked' && u.rejectedAt?.seconds ? new Date(u.rejectedAt.seconds * 1000).toLocaleDateString('pt-BR') : '-'}
                                </p>
                                {u.handledByEmail && (
                                  <p className="text-[9px] text-ibc-teal font-medium mt-1 truncate max-w-[120px]" title={u.handledByEmail}>
                                    Por: {u.handledByEmail.split('@')[0]}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              {appUser?.role === 'admin' && u.email !== 'secretariaibc3@gmail.com' && (
                                <div className="flex justify-end items-center space-x-4">
                                  {u.status === 'pending' && (
                                    <button 
                                      onClick={() => setApprovingUser({ id: u.id, email: u.email })}
                                      className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
                                    >
                                      Aprovar
                                    </button>
                                  )}
                                  <button 
                                    onClick={async () => {
                                      const oldData = { ...u };
                                      const newRole = u.role === 'admin' ? 'user' : 'admin';
                                      await updateDoc(doc(db, 'users', u.id), { 
                                        role: newRole,
                                        isFullAdmin: newRole === 'admin'
                                      });
                                      triggerUndo({
                                        type: 'update',
                                        collection: 'users',
                                        id: u.id,
                                        data: oldData,
                                        message: `Nível de ${u.email} alterado.`
                                      });
                                    }}
                                    className="text-[10px] font-black text-ibc-teal uppercase tracking-widest hover:opacity-70 transition-opacity"
                                  >
                                    Mudar para {u.role === 'admin' ? 'User' : 'Admin'}
                                  </button>
                                  {u.status === 'approved' ? (
                                    <button 
                                      onClick={async () => {
                                        await updateDoc(doc(db, 'users', u.id), { status: 'blocked' });
                                        showAlert("Atenção", `Acesso de ${u.email} bloqueado.`);
                                      }}
                                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:opacity-70 transition-opacity"
                                    >
                                      Bloquear
                                    </button>
                                  ) : u.status === 'blocked' ? (
                                    <button 
                                      onClick={async () => {
                                        await updateDoc(doc(db, 'users', u.id), { status: 'approved' });
                                        showAlert("Sucesso", `Acesso de ${u.email} restaurado.`);
                                      }}
                                      className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
                                    >
                                      Desbloquear
                                    </button>
                                  ) : null}
                                  <button 
                                    onClick={() => {
                                      showConfirm(
                                        'Remover Usuário',
                                        `Deseja remover o acesso de ${u.email}?`,
                                        async () => {
                                          try {
                                            await deleteDoc(doc(db, 'users', u.id));
                                          } catch (error) {
                                            console.error("Delete User Error:", error);
                                            showAlert("Erro", "Não foi possível remover o usuário.");
                                          }
                                        }
                                      );
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: User Cards */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 bg-white/40 hover:bg-white/60 backdrop-blur-md transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0 mr-2">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">{u.email}</p>
                            <span className={cn(
                              "inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm",
                              u.role === 'admin' ? "bg-purple-500 text-white" : "bg-blue-500 text-white"
                            )}>
                              {u.role}
                            </span>
                          </div>
                          {appUser?.role === 'admin' && u.email !== 'secretariaibc3@gmail.com' && (
                            <button 
                              onClick={() => {
                                showConfirm(
                                  'Remover Usuário',
                                  `Deseja remover o acesso de ${u.email}?`,
                                  async () => {
                                    try {
                                      const oldData = { ...u };
                                      await deleteDoc(doc(db, 'users', u.id));
                                      triggerUndo({
                                        type: 'delete',
                                        collection: 'users',
                                        id: u.id,
                                        data: oldData,
                                        message: `Usuário ${u.email} removido.`
                                      });
                                    } catch (error) {
                                      console.error("Delete User Error:", error);
                                      showAlert("Erro", "Não foi possível remover o usuário.");
                                    }
                                  }
                                );
                              }}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {appUser?.role === 'admin' && u.email !== 'secretariaibc3@gmail.com' && (
                          <button 
                            onClick={async () => {
                              const oldData = { ...u };
                              const newRole = u.role === 'admin' ? 'user' : 'admin';
                              await updateDoc(doc(db, 'users', u.id), { 
                                role: newRole,
                                isFullAdmin: newRole === 'admin'
                              });
                              triggerUndo({
                                type: 'update',
                                collection: 'users',
                                id: u.id,
                                data: oldData,
                                message: `Nível de ${u.email} alterado.`
                              });
                            }}
                            className="w-full bg-gray-50 dark:bg-black text-[10px] font-black text-ibc-teal uppercase tracking-widest py-2 rounded-xl border border-gray-100 dark:border-[#222] hover:bg-ibc-teal/5 transition-all"
                          >
                            Tornar {u.role === 'admin' ? 'Usuário Comum' : 'Administrador'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
        </div>
      )}
    </div>
  </main>
</div>

    {/* Modals */}
      {/* Share Modal */}
      <Modal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        title="Compartilhar Aplicativo"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
            Escolha como você deseja compartilhar o link do sistema da {appSettings.appName}.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => {
                const url = `https://wa.me/?text=${encodeURIComponent(`Acesse o sistema da ${appSettings.appName}: ${publicAppLink}`)}`;
                window.open(url, '_blank');
              }}
              className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-3xl border border-green-100 hover:bg-green-100 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest text-center">WhatsApp</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                const url = `mailto:?subject=${encodeURIComponent(`Convite: Sistema ${appSettings.appName}`)}&body=${encodeURIComponent(`Olá,\n\nConvido você a acessar o sistema da ${appSettings.appName} através link:\n${publicAppLink}`)}`;
                window.open(url, '_blank');
              }}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-3xl border border-blue-100 hover:bg-blue-100 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-ibc-blue text-white flex items-center justify-center mb-3 shadow-lg shadow-ibc-blue/20 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-ibc-blue uppercase tracking-widest text-center">E-mail</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicAppLink)}`;
                window.open(url, '_blank');
              }}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-3xl border border-blue-100 hover:bg-blue-100 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-[#1877F2] uppercase tracking-widest text-center">Facebook</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicAppLink);
                showAlert("Sucesso", "Link copiado!");
                setIsShareModalOpen(false);
              }}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-black rounded-3xl border border-gray-100 dark:border-[#222] hover:bg-gray-100 dark:bg-[#1a1a1a] transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-black0 text-white flex items-center justify-center mb-3 shadow-lg shadow-gray-500/20 group-hover:scale-110 transition-transform">
                <Copy className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest text-center">Copiar Link</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* View Ata Modal */}
      <Modal 
        isOpen={isViewAtaModalOpen} 
        onClose={() => { setIsViewAtaModalOpen(false); setSelectedAta(null); }} 
        title={selectedAta ? `Ata nº ${selectedAta.number}` : 'Ata'}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex justify-between items-center text-sm text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50 pb-4">
            <span>Data: {selectedAta && safeFormatDate(selectedAta.date)}</span>
            <button 
              onClick={() => selectedAta && handleExportAtaPDF(selectedAta)}
              className="text-ibc-blue flex items-center hover:opacity-70 transition-opacity"
            >
              <Download className="w-4 h-4 mr-1.5" />
              PDF
            </button>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {selectedAta?.content}
            </p>
          </div>

          {selectedAta?.photoUrl && (
            <div className="mt-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foto Anexada</h4>
              <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-[#222] shadow-sm">
                <img 
                  src={selectedAta.photoUrl} 
                  alt="Foto da Ata" 
                  className="w-full h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 pt-10 border-t border-gray-50">
            <div className="text-center">
              <div className="h-px bg-gray-200 dark:bg-[#222] mb-2"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedAta?.signer1Role || "Pastor Presidente"}</p>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-50 mt-1">{selectedAta?.signer1Name || "____________________"}</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-gray-200 dark:bg-[#222] mb-2"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedAta?.signer2Role || "Secretário"}</p>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-50 mt-1">{selectedAta?.signer2Name || "____________________"}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Ata Modal */}
      <Modal 
        isOpen={isAddAtaModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Nova Ata"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveAta} onInput={() => setIsFormDirty(true)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
              <select required name="type" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm">
                <option value="Assembleia">Assembleia</option>
                <option value="Reunião">Reunião</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nº da Ata</label>
              <input required name="number" type="text" placeholder="001/2026" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data</label>
              <input required name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Conteúdo da Ata</label>
                <textarea required name="content" rows={12} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm leading-relaxed shadow-sm" placeholder="Escreva o conteúdo da ata aqui..."></textarea>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Anexar Foto (Opcional)</label>
                <div className="relative group">
                  <input 
                    name="photo" 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    id="ata-photo-upload"
                    onChange={handlePhotoChange}
                  />
                  <label 
                    htmlFor="ata-photo-upload"
                    className="flex items-center justify-center w-full min-h-[200px] md:min-h-[290px] border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal/40 hover:bg-ibc-teal/5 transition-all group overflow-hidden"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-contain max-h-[300px]" alt="Preview" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <Camera className="w-8 h-8 text-gray-400 group-hover:text-ibc-teal" />
                        <span className="text-sm font-bold text-gray-400 group-hover:text-ibc-teal">Escolher uma foto</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Presidência</label>
                  <select 
                    value={signer1Role}
                    onChange={(e) => setSigner1Role(e.target.value)}
                    className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                  >
                    <option value="Pastor Presidente">Pastor Presidente</option>
                    <option value="Vice-Presidente">Vice-Presidente</option>
                  </select>
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-[#222] text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    Nome: <span className="text-gray-900 dark:text-gray-50">{getMemberNameByFunction(signer1Role) || "Não encontrado"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Secretaria</label>
                  <select 
                    value={signer2Role}
                    onChange={(e) => setSigner2Role(e.target.value)}
                    className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                  >
                    <option value="Secretário 1">Secretário 1</option>
                    <option value="Secretário 2">Secretário 2</option>
                  </select>
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-[#222] text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    Nome: <span className="text-gray-900 dark:text-gray-50">{getMemberNameByFunction(signer2Role) || "Não encontrado"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : "Finalizar e Salvar"}
          </button>
        </form>
      </Modal>

      {/* Edit Ata Modal */}
      <Modal 
        isOpen={isEditAtaModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Ata"
        maxWidth="max-w-4xl"
      >
        {selectedAta && (
          <form onSubmit={handleEditAta} onInput={() => setIsFormDirty(true)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
                <select required name="type" defaultValue={selectedAta.type} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm">
                  <option value="Assembleia">Assembleia</option>
                  <option value="Reunião">Reunião</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nº da Ata</label>
                <input required name="number" type="text" defaultValue={selectedAta.number} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data</label>
                <input required name="date" type="date" defaultValue={selectedAta.date} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Conteúdo da Ata</label>
                  <textarea required name="content" rows={12} defaultValue={selectedAta.content} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm leading-relaxed shadow-sm" placeholder="Escreva o conteúdo da ata aqui..."></textarea>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Alterar Foto (Opcional)</label>
                  <div className="relative group">
                    <input 
                      name="photo" 
                      type="file" 
                      accept="image/png, image/jpeg"
                      className="hidden" 
                      id="edit-ata-photo-upload"
                      onChange={handlePhotoChange}
                    />
                    <label 
                      htmlFor="edit-ata-photo-upload"
                      className="flex items-center justify-center w-full min-h-[200px] md:min-h-[290px] border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal/40 hover:bg-ibc-teal/5 transition-all group overflow-hidden"
                    >
                      {photoPreview || selectedAta.photoUrl ? (
                        <img src={photoPreview || selectedAta.photoUrl} className="w-full h-full object-contain max-h-[300px]" alt="Preview" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center space-y-3">
                          <Camera className="w-8 h-8 text-gray-400 group-hover:text-ibc-teal" />
                          <span className="text-sm font-bold text-gray-400 group-hover:text-ibc-teal">Escolher nova foto</span>
                        </div>
                      )}
                    </label>
                  </div>
                  {(selectedAta.photoUrl && !photoPreview) && (
                    <p className="text-[10px] text-gray-400 mt-1">Já possui uma foto anexada.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Presidência</label>
                    <select 
                      value={signer1Role}
                      onChange={(e) => setSigner1Role(e.target.value)}
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                    >
                      <option value="Pastor Presidente">Pastor Presidente</option>
                      <option value="Vice-Presidente">Vice-Presidente</option>
                    </select>
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-[#222] text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      Nome: <span className="text-gray-900 dark:text-gray-50">{getMemberNameByFunction(signer1Role) || "Não encontrado"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Secretaria</label>
                    <select 
                      value={signer2Role}
                      onChange={(e) => setSigner2Role(e.target.value)}
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                    >
                      <option value="Secretário 1">Secretário 1</option>
                      <option value="Secretário 2">Secretário 2</option>
                    </select>
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-black rounded-xl border border-gray-100 dark:border-[#222] text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      Nome: <span className="text-gray-900 dark:text-gray-50">{getMemberNameByFunction(signer2Role) || "Não encontrado"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      {/* View Presenca Modal */}
      <Modal 
        isOpen={isViewPresencaModalOpen} 
        onClose={() => { setIsViewPresencaModalOpen(false); setSelectedPresenca(null); }} 
        title={selectedPresenca ? `Lista de Presença - Ata nº ${selectedPresenca.ataNumber}` : 'Lista de Presença'}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex justify-between items-center text-sm text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50 pb-4">
            <span>Data: {selectedPresenca && safeFormatDate(selectedPresenca.date)}</span>
            <button 
              onClick={() => selectedPresenca && handlePrintPresenca(selectedPresenca)}
              className="bg-ibc-teal text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Imprimir Lista
            </button>
          </div>
          
          <div>
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Visualização do Modelo (50 linhas)</h4>
            <div className="bg-gray-50 dark:bg-black p-6 rounded-3xl border border-gray-100 dark:border-[#222] space-y-3">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="flex items-center space-x-3 border-b border-gray-200 dark:border-[#333] pb-2">
                  <span className="text-[10px] font-bold text-gray-300">{n}.</span>
                  <div className="h-4 w-full bg-transparent"></div>
                </div>
              ))}
              <div className="text-center py-4">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">... e mais 45 linhas ...</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Presenca Modal */}
      <Modal 
        isOpen={isAddPresencaModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Nova Lista de Presença"
      >
        <form onSubmit={handleAddPresenca} onInput={() => setIsFormDirty(true)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
              <select required name="type" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal">
                <option value="Assembleia">Assembleia</option>
                <option value="Reunião">Reunião</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nº da Ata</label>
              <input required name="ataNumber" type="text" placeholder="001/2026" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data</label>
            <input required name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
          </div>
          <div className="bg-ibc-teal/5 p-4 rounded-2xl border border-ibc-teal/10">
            <p className="text-xs text-ibc-teal font-medium leading-relaxed">
              <strong>Observação:</strong> Esta lista será gerada automaticamente com 50 linhas em branco para preenchimento manual após a impressão.
            </p>
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Gerando...
              </>
            ) : "Gerar Lista"}
          </button>
        </form>
      </Modal>

      {/* Edit Presenca Modal */}
      <Modal 
        isOpen={isEditPresencaModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Lista de Presença"
      >
        {selectedPresenca && (
          <form onSubmit={handleEditPresenca} onInput={() => setIsFormDirty(true)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
                <select required name="type" defaultValue={selectedPresenca.type} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal">
                  <option value="Assembleia">Assembleia</option>
                  <option value="Reunião">Reunião</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nº da Ata</label>
                <input required name="ataNumber" type="text" defaultValue={selectedPresenca.ataNumber} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data</label>
              <input required name="date" type="date" defaultValue={selectedPresenca.date} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
            </div>
            <div className="bg-ibc-teal/5 p-4 rounded-2xl border border-ibc-teal/10">
              <p className="text-xs text-ibc-teal font-medium leading-relaxed">
                <strong>Observação:</strong> Esta lista será gerada automaticamente com 50 linhas em branco para preenchimento manual após a impressão.
              </p>
            </div>
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      {/* Ministry Members Modal */}
      <Modal 
        isOpen={isMinistryMembersModalOpen} 
        onClose={() => { setIsMinistryMembersModalOpen(false); setSelectedMinistry(null); setMinistrySearchQuery(''); }} 
        title={selectedMinistry?.name || 'Participantes'}
        fullscreen={true}
      >
        {isMinistryMembersModalOpen && selectedMinistry && (
          <div className="space-y-6">
          {/* Descrição do Ministério */}
          <div className="pb-4 border-b border-gray-100 dark:border-[#222]">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição do Ministério</h5>
            <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] italic text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              {selectedMinistry?.description || "Descrição não informada"}
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Participantes</h5>
              <div className="relative flex items-center bg-gray-50 dark:bg-black border border-gray-100 dark:border-[#222] rounded-xl px-2 py-1 select-none">
                <Search className="w-3.5 h-3.5 text-gray-400 mr-1 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Buscar participante..." 
                  value={ministrySearchQuery}
                  onChange={(e) => setMinistrySearchQuery(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none text-gray-700 dark:text-gray-200 w-36 placeholder:text-gray-300"
                />
                {ministrySearchQuery && (
                  <button onClick={() => setMinistrySearchQuery('')} className="text-gray-400 hover:text-red-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const activeMinistryMembers = members.filter(m => 
                m.isActive !== false && 
                ((m.ministryIds?.includes(selectedMinistry?.id || '')) || (m.ministryId === selectedMinistry?.id))
              );
              
              const filteredMinistryMembers = activeMinistryMembers.filter(m => 
                normalizeString(m.name || '').includes(normalizeString(ministrySearchQuery)) ||
                normalizeString(m.function || '').includes(normalizeString(ministrySearchQuery))
              );

              if (activeMinistryMembers.length === 0) {
                return (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium">Nenhum participante ativo neste ministério.</p>
                  </div>
                );
              }

              if (filteredMinistryMembers.length === 0) {
                return (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium">Nenhum participante coincide com a busca.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {filteredMinistryMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222]">
                      <div className="w-10 h-10 rounded-xl bg-ibc-blue flex items-center justify-center text-white font-bold overflow-hidden animate-fade-in">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{member.name}</p>
                        <p className="text-[10px] text-ibc-teal font-bold uppercase tracking-widest">{member.function}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          </div>
        )}
      </Modal>

      {/* Add Ministry Modal */}
      <Modal 
        isOpen={isAddMinistryModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Novo Ministério"
        maxWidth="max-w-3xl"
        fullscreen={true}
      >
        <form onSubmit={handleAddMinistry} onInput={() => setIsFormDirty(true)} className="space-y-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nome do Ministério</label>
                <input required name="name" type="text" className="w-full p-3 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm" />
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-[#222]">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Cor de Identificação</label>
                <div className="flex items-center space-x-3 bg-gray-50 dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                  <input required name="color" type="color" defaultValue="#064a8f" className="w-12 h-12 rounded-xl border-none cursor-pointer" />
                  <p className="text-xs text-gray-400 font-medium">Escolha uma cor para representar este ministério.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Imagem de Capa (Opcional)</label>
                <div className="relative group">
                  <input 
                    name="photo" 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    id="add-ministry-photo"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative w-full aspect-[21/9] border-2 border-gray-100 dark:border-[#333] rounded-2xl overflow-hidden group">
                      <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                      
                      {/* Interaction Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 sm:space-x-4">
                        
                        <label 
                          htmlFor="add-ministry-photo"
                          className="p-3 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md cursor-pointer transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Alterar Foto"
                        >
                          <Camera className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
                        </label>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(photoPreview, '_blank');
                          }}
                          className="p-3 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Visualizar Foto"
                        >
                          <Eye className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Visualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm('Tem certeza que deseja remover esta imagem?')) {
                              setPhotoPreview(null);
                              setIsFormDirty(true);
                              const fileInput = document.getElementById('add-ministry-photo') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }
                          }}
                          className="p-3 bg-red-500/80 hover:bg-red-500 rounded-xl text-white backdrop-blur-md transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Remover Foto"
                        >
                          <Trash2 className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Remover</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label 
                      htmlFor="add-ministry-photo"
                      className="flex flex-col items-center justify-center w-full aspect-[21/9] border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal/40 hover:bg-ibc-teal/5 transition-all overflow-hidden"
                    >
                      <Camera className="w-8 h-8 text-gray-400 group-hover:text-ibc-teal mb-2" />
                      <span className="text-sm font-bold text-gray-400 group-hover:text-ibc-teal">Escolher uma imagem</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Descrição do Ministério (Opcional)</label>
              <textarea 
                name="description" 
                placeholder="Descreva as responsabilidades, propósitos e atividades deste ministério..."
                className="w-full p-4 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal resize-y text-sm h-full min-h-[16rem] custom-scrollbar" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3.5 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-ibc-teal/10"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : "Salvar Ministério"}
          </button>
        </form>
      </Modal>

      {/* Edit Ministry Modal */}
      <Modal 
        isOpen={isEditMinistryModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Ministério"
        maxWidth="max-w-3xl"
        fullscreen={true}
      >
        <form onSubmit={handleEditMinistry} onInput={() => setIsFormDirty(true)} className="space-y-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nome do Ministério</label>
                <input required name="name" type="text" defaultValue={selectedMinistry?.name} className="w-full p-3 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm" />
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-[#222]">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Cor de Identificação</label>
                <div className="flex items-center space-x-3 bg-gray-50 dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                  <input required name="color" type="color" defaultValue={selectedMinistry?.color} className="w-12 h-12 rounded-xl border-none cursor-pointer" />
                  <p className="text-xs text-gray-400 font-medium">Escolha uma cor para representar este ministério.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Imagem de Capa (Opcional)</label>
                <div className="relative group">
                  <input 
                    name="photo" 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    id="edit-ministry-photo"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative w-full aspect-[21/9] border-2 border-gray-100 dark:border-[#333] rounded-2xl overflow-hidden group">
                      <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                      
                      {/* Interaction Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 sm:space-x-4">
                        
                        <label 
                          htmlFor="edit-ministry-photo"
                          className="p-3 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md cursor-pointer transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Alterar Foto"
                        >
                          <Camera className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
                        </label>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(photoPreview, '_blank');
                          }}
                          className="p-3 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Visualizar Foto"
                        >
                          <Eye className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Visualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm('Tem certeza que deseja remover esta imagem?')) {
                              setPhotoPreview(null);
                              setIsFormDirty(true);
                              const fileInput = document.getElementById('edit-ministry-photo') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }
                          }}
                          className="p-3 bg-red-500/80 hover:bg-red-500 rounded-xl text-white backdrop-blur-md transition-all flex flex-col items-center justify-center min-w-[70px]"
                          title="Remover Foto"
                        >
                          <Trash2 className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Remover</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label 
                      htmlFor="edit-ministry-photo"
                      className="flex flex-col items-center justify-center w-full aspect-[21/9] border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal/40 hover:bg-ibc-teal/5 transition-all overflow-hidden"
                    >
                      <Camera className="w-8 h-8 text-gray-400 group-hover:text-ibc-teal mb-2" />
                      <span className="text-sm font-bold text-gray-400 group-hover:text-ibc-teal">Escolher uma imagem</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Descrição do Ministério (Opcional)</label>
              <textarea 
                name="description" 
                defaultValue={selectedMinistry?.description || ''}
                placeholder="Descreva as responsabilidades, propósitos e atividades deste ministério..."
                className="w-full p-4 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal resize-y text-sm h-full min-h-[16rem] custom-scrollbar" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-blue text-white py-3.5 rounded-2xl font-bold mt-4 hover:bg-ibc-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-ibc-blue/10"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Atualizando...
              </>
            ) : "Atualizar Ministério"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isAddMemberModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Novo Membro"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleAddMember} onInput={() => setIsFormDirty(true)} className="space-y-6">
          <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nome Completo</label>
                  <input 
                    required 
                    name="name" 
                    type="text" 
                    onChange={(e) => {
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      e.target.value = capitalizeName(e.target.value);
                      e.target.setSelectionRange(start, end);
                    }}
                    className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Função</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingNewFunction(!isAddingNewFunction);
                        setNewFunctionValue("");
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-ibc-teal hover:text-ibc-teal/70 transition-colors"
                    >
                      {isAddingNewFunction ? "Selecionar Existente" : "+ Nova Função"}
                    </button>
                  </div>
                  {isAddingNewFunction ? (
                    <input 
                      required 
                      name="function" 
                      type="text" 
                      value={newFunctionValue}
                      onChange={(e) => setNewFunctionValue(e.target.value)}
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      placeholder="Digite a nova função..."
                      autoFocus
                    />
                  ) : (
                    <select 
                      required 
                      name="function"
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal bg-white dark:bg-[#111] shadow-sm"
                    >
                      <option value="">Selecionar Função...</option>
                      {memberFunctions.map((f) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Sexo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-center p-2 border rounded-2xl cursor-pointer hover:bg-ibc-teal/5 hover:border-ibc-teal transition-all group">
                      <input required type="radio" name="gender" value="Homem" className="sr-only" />
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-[#444] group-has-[:checked]:border-ibc-teal group-has-[:checked]:bg-ibc-teal flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111] opacity-0 group-has-[:checked]:opacity-100" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-has-[:checked]:text-ibc-teal">Homem</span>
                      </div>
                    </label>
                    <label className="flex items-center justify-center p-2 border rounded-2xl cursor-pointer hover:bg-ibc-teal/5 hover:border-ibc-teal transition-all group">
                      <input required type="radio" name="gender" value="Mulher" className="sr-only" />
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-[#444] group-has-[:checked]:border-ibc-teal group-has-[:checked]:bg-ibc-teal flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111] opacity-0 group-has-[:checked]:opacity-100" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-has-[:checked]:text-ibc-teal">Mulher</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nascimento (Opcional)</label>
                  <input name="birthDate" type="date" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data de Batismo (Opcional)</label>
                  <input name="startDate" type="date" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
                </div>

                <div className="md:col-span-2 border-t border-gray-100 dark:border-[#222] pt-4">
                  <h4 className="text-xs font-black text-ibc-teal uppercase tracking-widest mb-3">Celular / Contato</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Celular (com DDD)</label>
                    <input 
                      name="celular" 
                      type="text" 
                      placeholder="(99) 99999-9999" 
                      onChange={(e) => handleMaskedInput(e, formatPhone)}
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                    />
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-gray-100 dark:border-[#222] pt-4">
                  <h4 className="text-xs font-black text-ibc-teal uppercase tracking-widest mb-3">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">CEP</label>
                      <input 
                        name="cep" 
                        type="text" 
                        placeholder="50000-000" 
                        onChange={(e) => {
                          handleMaskedInput(e, formatCEP);
                          handleCEPLookup(e.target.value, false);
                        }}
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Logradouro (Rua/Avenida)</label>
                      <input 
                        name="logradouro" 
                        type="text" 
                        placeholder="Rua Exemplo" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Número</label>
                      <input 
                        name="numero" 
                        type="text" 
                        placeholder="123" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Complemento</label>
                      <input 
                        name="complemento" 
                        type="text" 
                        placeholder="Apto 101" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Bairro</label>
                      <input 
                        name="bairro" 
                        type="text" 
                        placeholder="Bairro" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Cidade</label>
                      <input 
                        name="cidade" 
                        type="text" 
                        placeholder="Cidade" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                      <input 
                        name="estado" 
                        type="text" 
                        placeholder="PE" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">País</label>
                      <input 
                        name="pais" 
                        type="text" 
                        defaultValue="Brasil" 
                        placeholder="Brasil" 
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Foto de Perfil</label>
                <div className="flex flex-col items-center space-y-4">
                  {photoPreview && (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal hover:bg-gray-50 dark:bg-black transition-all">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{photoPreview ? "Alterar Foto" : "Anexar Foto"}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Ministérios</label>
                <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] space-y-4 shadow-inner">
                  {tempMemberMinistries.map((mm, idx) => {
                    const ministry = ministries.find(m => m.id === mm.ministryId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black bg-ibc-teal/10 text-ibc-teal px-2 py-0.5 rounded-lg uppercase">{mm.role}</span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{ministry?.name || "Ministério Removido"}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setTempMemberMinistries(tempMemberMinistries.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    <select 
                      id="ministry-selection-add"
                      className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                    >
                      <option value="">Selecionar Ministério...</option>
                      {ministries.filter(m => !tempMemberMinistries.some(mm => mm.ministryId === m.id)).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    
                    {isAddingNewMinistryRole ? (
                      <div className="w-1/3 flex gap-1">
                        <input 
                          id="ministry-role-input-add"
                          type="text" 
                          value={newMinistryRoleValue}
                          onChange={(e) => setNewMinistryRoleValue(e.target.value)}
                          className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm" 
                          placeholder="Nova função..."
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddingNewMinistryRole(false);
                            setNewMinistryRoleValue("");
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <select 
                        id="ministry-role-selection-add"
                        onChange={(e) => {
                          if (e.target.value === "ADD_NEW") {
                            setIsAddingNewMinistryRole(true);
                            setNewMinistryRoleValue("");
                          }
                        }}
                        className="w-1/3 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm"
                      >
                        <option value="">Função...</option>
                        {ministryRoles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                        <option value="ADD_NEW">+ Nova Função...</option>
                      </select>
                    )}

                    <button 
                      type="button"
                      onClick={() => {
                        const ministryId = (document.getElementById('ministry-selection-add') as HTMLSelectElement).value;
                        const role = isAddingNewMinistryRole 
                          ? newMinistryRoleValue 
                          : (document.getElementById('ministry-role-selection-add') as HTMLSelectElement).value;
                        
                        if (ministryId && role && role !== "ADD_NEW") {
                          setTempMemberMinistries([...tempMemberMinistries, { ministryId, role }]);
                          if (isAddingNewMinistryRole) {
                             setNewMinistryRoleValue("");
                             setIsAddingNewMinistryRole(false);
                          }
                        }
                      }}
                      className="bg-ibc-teal text-white p-2 rounded-xl shadow-md active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Parentesco / Família</label>
                <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] space-y-4 shadow-inner">
                  {tempRelationships.map((rel, idx) => {
                    const relative = members.find(m => m.id === rel.memberId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black bg-ibc-teal/10 text-ibc-teal px-2 py-0.5 rounded-lg uppercase">{getGenderedKinship(rel.type, relative?.gender)}</span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{relative?.name}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setTempRelationships(tempRelationships.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    <select 
                      id="kinship-type"
                      className="w-1/3 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm"
                    >
                        {relationshipTypes.map(rt => (
                          <option key={rt.id} value={rt.name}>{rt.name}</option>
                        ))}
                    </select>
                    <select 
                      id="kinship-member"
                      className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                    >
                      <option value="">Selecionar Membro...</option>
                      {members.filter(m => !tempRelationships.some(r => r.memberId === m.id)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        const type = (document.getElementById('kinship-type') as HTMLSelectElement).value as Relationship['type'];
                        const memberId = (document.getElementById('kinship-member') as HTMLSelectElement).value;
                        if (memberId) {
                          setTempRelationships([...tempRelationships, { memberId, type }]);
                        }
                      }}
                      className="bg-ibc-teal text-white p-2 rounded-xl shadow-md active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : "Salvar Membro"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditMemberModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Membro"
        maxWidth="max-w-4xl"
      >
        {selectedMember && (
          <form onSubmit={handleEditMember} onInput={() => setIsFormDirty(true)} className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nome Completo</label>
                    <input 
                      required 
                      name="name" 
                      type="text" 
                      defaultValue={selectedMember?.name} 
                      onChange={(e) => {
                        const start = e.target.selectionStart;
                        const end = e.target.selectionEnd;
                        e.target.value = capitalizeName(e.target.value);
                        e.target.setSelectionRange(start, end);
                      }}
                      className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Função</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingNewFunction(!isAddingNewFunction);
                          setNewFunctionValue("");
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-ibc-teal hover:text-ibc-teal/70 transition-colors"
                      >
                        {isAddingNewFunction ? "Selecionar Existente" : "+ Nova Função"}
                      </button>
                    </div>
                    {isAddingNewFunction ? (
                      <input 
                        required 
                        name="function" 
                        type="text" 
                        value={newFunctionValue}
                        onChange={(e) => setNewFunctionValue(e.target.value)}
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        placeholder="Digite a nova função..."
                        autoFocus
                      />
                    ) : (
                      <select 
                        required 
                        name="function"
                        defaultValue={selectedMember?.function}
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal bg-white dark:bg-[#111] shadow-sm"
                      >
                        <option value="">Selecionar Função...</option>
                        {memberFunctions.map((f) => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Sexo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center p-2 border rounded-2xl cursor-pointer hover:bg-ibc-teal/5 hover:border-ibc-teal transition-all group">
                        <input required type="radio" name="gender" value="Homem" defaultChecked={selectedMember?.gender === 'Homem'} className="sr-only" />
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-[#444] group-has-[:checked]:border-ibc-teal group-has-[:checked]:bg-ibc-teal flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111] opacity-0 group-has-[:checked]:opacity-100" />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-has-[:checked]:text-ibc-teal">Homem</span>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-2 border rounded-2xl cursor-pointer hover:bg-ibc-teal/5 hover:border-ibc-teal transition-all group">
                        <input required type="radio" name="gender" value="Mulher" defaultChecked={selectedMember?.gender === 'Mulher'} className="sr-only" />
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-[#444] group-has-[:checked]:border-ibc-teal group-has-[:checked]:bg-ibc-teal flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111] opacity-0 group-has-[:checked]:opacity-100" />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-has-[:checked]:text-ibc-teal">Mulher</span>
                        </div>
                      </label>
                    </div>
                  </div>
                   <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nascimento (Opcional)</label>
                    <input name="birthDate" type="date" defaultValue={selectedMember?.birthDate} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data de Batismo (Opcional)</label>
                    <input name="startDate" type="date" defaultValue={selectedMember?.startDate} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" />
                  </div>

                  <div className="md:col-span-2 border-t border-gray-100 dark:border-[#222] pt-4">
                    <h4 className="text-xs font-black text-ibc-teal uppercase tracking-widest mb-3">Celular / Contato</h4>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Celular (com DDD)</label>
                      <input 
                        name="celular" 
                        type="text" 
                        defaultValue={selectedMember?.celular || ''} 
                        placeholder="(99) 99999-9999" 
                        onChange={(e) => handleMaskedInput(e, formatPhone)}
                        className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-gray-100 dark:border-[#222] pt-4">
                    <h4 className="text-xs font-black text-ibc-teal uppercase tracking-widest mb-3">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">CEP</label>
                        <input 
                          name="cep" 
                          type="text" 
                          defaultValue={selectedMember?.cep || ''} 
                          placeholder="50000-000" 
                          onChange={(e) => {
                            handleMaskedInput(e, formatCEP);
                            handleCEPLookup(e.target.value, true);
                          }}
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Logradouro (Rua/Avenida)</label>
                        <input 
                          name="logradouro" 
                          type="text" 
                          defaultValue={selectedMember?.logradouro || ''} 
                          placeholder="Rua Exemplo" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Número</label>
                        <input 
                          name="numero" 
                          type="text" 
                          defaultValue={selectedMember?.numero || ''} 
                          placeholder="123" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Complemento</label>
                        <input 
                          name="complemento" 
                          type="text" 
                          defaultValue={selectedMember?.complemento || ''} 
                          placeholder="Apto 101" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Bairro</label>
                        <input 
                          name="bairro" 
                          type="text" 
                          defaultValue={selectedMember?.bairro || ''} 
                          placeholder="Bairro" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Cidade</label>
                        <input 
                          name="cidade" 
                          type="text" 
                          defaultValue={selectedMember?.cidade || ''} 
                          placeholder="Cidade" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                        <input 
                          name="estado" 
                          type="text" 
                          defaultValue={selectedMember?.estado || ''} 
                          placeholder="PE" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">País</label>
                        <input 
                          name="pais" 
                          type="text" 
                          defaultValue={selectedMember?.pais || 'Brasil'} 
                          placeholder="Brasil" 
                          className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal shadow-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Foto de Perfil</label>
                  <div className="flex flex-col items-center space-y-4">
                    {(photoPreview || selectedMember.photoUrl) && (
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                        <img src={photoPreview || selectedMember.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        {(photoPreview || selectedMember.photoUrl) && (
                          <button 
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null);
                              // We can't easily clear the doc's photoUrl here without a special state, 
                              // but this UI will show the selectedMember.photoUrl is still there unless we overwrite it.
                              // For simplicity in a demo, we'll just allow changing/keeping.
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-gray-200 dark:border-[#333] rounded-2xl cursor-pointer hover:border-ibc-teal hover:bg-gray-50 dark:bg-black transition-all">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{(photoPreview || selectedMember.photoUrl) ? "Alterar Foto" : "Anexar Foto"}</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Ministérios</label>
                  {selectedMember && selectedMember.isActive === false ? (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-700 text-xs font-bold leading-relaxed">
                      Membros negativados/inativos não são elegíveis para inclusão em ministérios.
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] space-y-4 shadow-inner">
                      {tempMemberMinistries.map((mm, idx) => {
                        const ministry = ministries.find(m => m.id === mm.ministryId);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-black bg-ibc-teal/10 text-ibc-teal px-2 py-0.5 rounded-lg uppercase">{mm.role}</span>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{ministry?.name || "Ministério Removido"}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setTempMemberMinistries(tempMemberMinistries.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      
                      <div className="flex gap-2">
                        <select 
                          id="ministry-selection-edit"
                          className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                        >
                          <option value="">Selecionar Ministério...</option>
                          {ministries.filter(m => !tempMemberMinistries.some(mm => mm.ministryId === m.id)).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        
                        {isAddingNewMinistryRole ? (
                          <div className="w-1/3 flex gap-1">
                            <input 
                              id="ministry-role-input-edit"
                              type="text" 
                              value={newMinistryRoleValue}
                              onChange={(e) => setNewMinistryRoleValue(e.target.value)}
                              className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm" 
                              placeholder="Nova função..."
                              autoFocus
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setIsAddingNewMinistryRole(false);
                                setNewMinistryRoleValue("");
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <select 
                            id="ministry-role-selection-edit"
                            onChange={(e) => {
                              if (e.target.value === "ADD_NEW") {
                                setIsAddingNewMinistryRole(true);
                                setNewMinistryRoleValue("");
                              }
                            }}
                            className="w-1/3 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm"
                          >
                            <option value="">Função...</option>
                            {ministryRoles.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                            <option value="ADD_NEW">+ Nova Função...</option>
                          </select>
                        )}

                        <button 
                          type="button"
                          onClick={() => {
                            const ministryId = (document.getElementById('ministry-selection-edit') as HTMLSelectElement).value;
                            const role = isAddingNewMinistryRole 
                              ? newMinistryRoleValue 
                              : (document.getElementById('ministry-role-selection-edit') as HTMLSelectElement).value;
                            
                            if (ministryId && role && role !== "ADD_NEW") {
                              setTempMemberMinistries([...tempMemberMinistries, { ministryId, role }]);
                              if (isAddingNewMinistryRole) {
                                 setNewMinistryRoleValue("");
                                 setIsAddingNewMinistryRole(false);
                              }
                            }
                          }}
                          className="bg-ibc-teal text-white p-2 rounded-xl shadow-md active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Parentesco / Família</label>
                  <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] space-y-4 shadow-inner">
                    {tempRelationships.map((rel, idx) => {
                      const relative = members.find(m => m.id === rel.memberId);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black bg-ibc-teal/10 text-ibc-teal px-2 py-0.5 rounded-lg uppercase">{getGenderedKinship(rel.type, relative?.gender)}</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{relative?.name}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setTempRelationships(tempRelationships.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    
                    <div className="flex gap-2">
                      <select 
                        id="kinship-type-edit"
                        className="w-1/3 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs font-bold shadow-sm"
                      >
                        {relationshipTypes.map(rt => (
                          <option key={rt.id} value={rt.name}>{rt.name}</option>
                        ))}
                      </select>
                      <select 
                        id="kinship-member-edit"
                        className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal text-xs shadow-sm"
                      >
                        <option value="">Selecionar Membro...</option>
                        {members.filter(m => m.id !== selectedMember?.id && !tempRelationships.some(r => r.memberId === m.id)).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => {
                          const type = (document.getElementById('kinship-type-edit') as HTMLSelectElement).value as Relationship['type'];
                          const memberId = (document.getElementById('kinship-member-edit') as HTMLSelectElement).value;
                          if (memberId) {
                            setTempRelationships([...tempRelationships, { memberId, type }]);
                          }
                        }}
                        className="bg-ibc-teal text-white p-2 rounded-xl shadow-md active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      {/* View Member Modal */}
      <Modal 
        isOpen={isViewMemberModalOpen} 
        onClose={() => { setIsViewMemberModalOpen(false); setSelectedMember(null); }} 
        title="Detalhes do Membro"
        maxWidth="max-w-4xl"
      >
        {selectedMember && (
          <div className="space-y-4 sm:space-y-8">
            {/* Seção Superior: Nome e Informações Principais Centralizadas */}
            <div className="flex flex-col items-center">
              {/* Foto de Perfil em destaque */}
              <div className="relative mb-3 sm:mb-6">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white dark:bg-[#111] shadow-xl border-4 border-white overflow-hidden flex items-center justify-center ring-4 ring-gray-50">
                  {selectedMember.photoUrl ? (
                    <img 
                      src={selectedMember.photoUrl} 
                      alt={selectedMember.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <User className="w-16 h-16 sm:w-20 sm:h-20 text-gray-200" />
                  )}
                </div>
                {selectedMember.isActive && !selectedMember.isAbsent && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                )}
                {selectedMember.isAbsent && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-sm" />
                )}
                {!selectedMember.isActive && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-sm" />
                )}
              </div>

              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-50 tracking-tight text-center">{selectedMember.name}</h3>
              <div className="mt-2 text-ibc-teal font-black text-xs uppercase tracking-[0.2em]">{selectedMember.function}</div>
              
              {!selectedMember.isActive && (
                <div className="mt-4 px-4 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-red-500/20">
                  Membro Inativo / Negativado
                </div>
              )}

              {/* Grid de Informações Horizontais - Centralizado e Responsivo */}
              <div className="w-full max-w-3xl mt-4 sm:mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 px-4">
                <div className="p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] flex flex-col items-center text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sexo</div>
                  <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {selectedMember.gender || "—"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] flex flex-col items-center text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                  <div className="flex items-center justify-center">
                    <span className={cn(
                      "w-2 h-2 rounded-full mr-1.5",
                      selectedMember.isActive ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedMember.isActive ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] flex flex-col items-center text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nascimento</div>
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    {selectedMember.birthDate ? safeFormatDate(selectedMember.birthDate) : "—"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222] flex flex-col items-center text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Batismo</div>
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    {selectedMember.startDate ? safeFormatDate(selectedMember.startDate) : "—"}
                  </div>
                </div>
                
                {/* Idade - Centralizada abaixo dos itens */}
                {selectedMember.birthDate && (
                  <div className="col-span-2 md:col-span-4 p-2 bg-ibc-teal/5 rounded-xl border border-ibc-teal/10 flex items-center justify-center mt-1">
                     <span className="text-ibc-teal text-[10px] font-black tracking-widest text-center">
                      {calculateAge(selectedMember.birthDate)} ANOS DE IDADE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Seção Inferior: Detalhes Adicionais em Colunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 sm:gap-6 sm:pt-6 border-t border-gray-100 dark:border-[#222]">
              {/* Ministérios */}
              <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Ministérios</div>
                <div className="space-y-2">
                  {selectedMember.ministries && selectedMember.ministries.length > 0 ? (
                    selectedMember.ministries.map((mm, idx) => {
                      const m = ministries.find(min => min.id === mm.ministryId);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-gray-900 dark:text-gray-50 leading-tight truncate">{m?.name || "Não encontrado"}</p>
                              <p className="text-[9px] font-bold text-ibc-teal uppercase tracking-widest mt-0.5">{mm.role}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : selectedMember.ministryIds && selectedMember.ministryIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.ministryIds.map(mid => {
                        const m = ministries.find(min => min.id === mid);
                        return (
                          <span key={mid} className="px-3 py-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm">
                            {m?.name || "Ministério Removido"}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 italic py-2">Nenhum ministério registrado.</p>
                  )}
                </div>
              </div>

              {/* Família / Parentesco */}
              <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Família / Parentesco</div>
                <div className="space-y-2">
                  {selectedMember.relationships && selectedMember.relationships.length > 0 ? (
                    selectedMember.relationships.map((rel, idx) => {
                      const relative = members.find(m => m.id === rel.memberId);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm hover:border-ibc-blue/30 transition-colors">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                              {relative?.photoUrl ? (
                                <img src={relative.photoUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-300">
                                  {relative?.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-gray-900 dark:text-gray-50 leading-tight truncate">{relative?.name || "Não encontrado"}</p>
                              <p className="text-[9px] font-bold text-ibc-teal uppercase tracking-widest mt-0.5">{getGenderedKinship(rel.type, relative?.gender)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const m = members.find(m => m.id === rel.memberId);
                              if (m) {
                                setSelectedMember(m);
                              }
                            }}
                            className="p-1 px-2 text-ibc-blue hover:bg-ibc-blue/5 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs font-bold text-gray-400 italic py-2">Nenhum parentesco registrado.</p>
                  )}
                </div>
              </div>

              {/* Celular / Contato */}
              <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Contato</div>
                {selectedMember.celular ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2.5 p-3 sm:p-3.5 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm leading-tight">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Número de Celular</div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedMember.celular}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${getRawPhoneNumber(selectedMember.celular)}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 bg-white dark:bg-[#111] hover:bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold text-ibc-teal shadow-sm transition-all"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-ibc-teal" />
                        Ligar
                      </a>
                      <a
                        href={`https://wa.me/${getWhatsAppNumber(selectedMember.celular)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-xs font-bold text-green-600 shadow-sm transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic py-2">Nenhum celular cadastrado.</p>
                )}
              </div>

              {/* Endereço */}
              <div className="p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-[#222]">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Endereço</div>
                {hasAddress(selectedMember) ? (
                  <div className="space-y-3">
                    <div className="p-3 sm:p-3.5 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm text-xs font-bold text-gray-700 dark:text-gray-200 leading-relaxed space-y-1">
                      <p className="font-extrabold text-gray-800 dark:text-gray-100">
                        {selectedMember.logradouro || "Não preenchido"}{selectedMember.numero ? `, nº ${selectedMember.numero}` : ""}
                      </p>
                      {selectedMember.complemento && (
                        <p className="text-gray-500 dark:text-gray-400 text-[11px] font-bold">
                          {selectedMember.complemento}
                        </p>
                      )}
                      {(selectedMember.bairro || selectedMember.cep) && (
                        <p className="text-gray-500 dark:text-gray-400 text-[11px] font-bold">
                          {selectedMember.bairro || "Não preenchido"}{selectedMember.cep ? ` - CEP: ${selectedMember.cep}` : ""}
                        </p>
                      )}
                      {(selectedMember.cidade || selectedMember.estado) && (
                        <p className="text-gray-500 dark:text-gray-400 text-[11px] font-bold">
                          {selectedMember.cidade || "Não preenchido"} - {selectedMember.estado || "Não preenchido"}{selectedMember.pais && `, ${selectedMember.pais}`}
                        </p>
                      )}
                    </div>

                    <a
                      href={getMapsUrl(selectedMember)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 sm:py-2.5 bg-white dark:bg-[#111] hover:bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold text-ibc-teal shadow-sm transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5 text-ibc-teal" />
                      Visualizar no Mapa
                    </a>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic py-2">Nenhum endereço cadastrado.</p>
                )}
              </div>

              {/* Informações de Saída (se inativo) */}
              {!selectedMember.isActive && selectedMember.exitDate && (
                <div className="md:col-span-2 p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3">
                  <div className="flex items-center text-red-600 font-black text-[10px] uppercase tracking-widest">
                    <UserMinus className="w-4 h-4 mr-2" />
                    Informações de Saída
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-0.5">Data de Saída</div>
                      <div className="text-xs font-bold text-red-800">{safeFormatDate(selectedMember.exitDate)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-red-300 uppercase tracking-widest mb-0.5">Motivo</div>
                      <div className="text-[11px] font-bold text-red-800 leading-tight italic">
                        "{selectedMember.exitReason || "S/ Motivo"}"
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4 sm:pt-6 border-t border-gray-100 dark:border-[#222]">
              <button 
                onClick={() => { 
                  setIsViewMemberModalOpen(false); 
                  setTempMinistryIds(selectedMember.ministryIds || (selectedMember.ministryId ? [selectedMember.ministryId] : []));
                  setTempMemberMinistries(selectedMember.ministries || []);
                  setTempRelationships(selectedMember.relationships || []);
                  setIsAddingNewFunction(false);
                  setNewFunctionValue("");
                  setIsEditMemberModalOpen(true); 
                }}
                className="flex-1 bg-ibc-blue text-white py-3 rounded-2xl font-bold flex items-center justify-center hover:bg-ibc-blue/90 transition-all shadow-lg shadow-ibc-blue/20 transform active:scale-95"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar Dados
              </button>
              <button 
                onClick={() => setIsViewMemberModalOpen(false)}
                className="px-8 bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:bg-[#222] transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isDeactivateModalOpen} 
        onClose={() => { setIsDeactivateModalOpen(false); setSelectedMember(null); }} 
        title="Negativar Membro"
      >
        <form onSubmit={handleDeactivateMember} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Você está negativando o membro: <span className="font-bold text-gray-900 dark:text-gray-50">{selectedMember?.name}</span>
          </p>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Data de Saída</label>
            <input required name="exitDate" type="date" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Motivo</label>
            <textarea required name="exitReason" rows={3} className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500" placeholder="Descreva o motivo da saída..."></textarea>
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-red-500 text-white py-3 rounded-2xl font-bold mt-4 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : "Confirmar Negativação"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        title="Novo Usuário"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input required name="email" type="email" placeholder="email@gmail.com" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Senha Inicial</label>
            <input required name="password" type="password" placeholder="Mínimo 6 caracteres" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Nível de Acesso</label>
            <select name="role" defaultValue="admin" className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal">
              <option value="admin">Administrador (Acesso Total)</option>
              <option value="user">Usuário (Apenas Leitura/Edição Membros)</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-blue text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Criando...
              </>
            ) : "Criar Usuário"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => resetModalStates()}
        title={exportStep === 'selection' ? "Exportar em PDF: Seleção" : "Configurar Campos do PDF"}
      >
        <div className="space-y-6">
          {exportStep === 'selection' ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setExportFilter('ativos')}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    exportFilter === 'ativos' ? "border-ibc-teal bg-ibc-teal/5 ring-1 ring-ibc-teal" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/30"
                  )}
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">Apenas Ativos</p>
                    <p className="text-xs text-gray-400">Exportar membros com status Ativo.</p>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", exportFilter === 'ativos' ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {exportFilter === 'ativos' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setExportFilter('ausentes')}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    exportFilter === 'ausentes' ? "border-ibc-teal bg-ibc-teal/5 ring-1 ring-ibc-teal" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/30"
                  )}
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">Apenas Ausentes</p>
                    <p className="text-xs text-gray-400">Exportar membros marcados como Ausentes.</p>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", exportFilter === 'ausentes' ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {exportFilter === 'ausentes' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setExportFilter('inativos')}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    exportFilter === 'inativos' ? "border-ibc-teal bg-ibc-teal/5 ring-1 ring-ibc-teal" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/30"
                  )}
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">Apenas Inativos</p>
                    <p className="text-xs text-gray-400">Exportar membros negativados ou inativos.</p>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", exportFilter === 'inativos' ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {exportFilter === 'inativos' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setExportFilter('todos')}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    exportFilter === 'todos' ? "border-ibc-teal bg-ibc-teal/5 ring-1 ring-ibc-teal" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/30"
                  )}
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">Todos os Membros</p>
                    <p className="text-xs text-gray-400">Exportar a lista completa de membros cadastrados.</p>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", exportFilter === 'todos' ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {exportFilter === 'todos' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setExportFilter('unico')}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                    exportFilter === 'unico' ? "border-ibc-teal bg-ibc-teal/5 ring-1 ring-ibc-teal" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/30"
                  )}
                >
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-gray-50">Escolher um Membro</p>
                    <p className="text-xs text-gray-400">Exportar a ficha individual de um membro específico.</p>
                    {exportFilter === 'unico' && (
                      <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={selectedExportMemberId}
                          onChange={(e) => setSelectedExportMemberId(e.target.value)}
                          className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-ibc-teal bg-white dark:bg-[#111]"
                        >
                          <option value="">Selecionar membro...</option>
                          {members.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-4", exportFilter === 'unico' ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {exportFilter === 'unico' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              </div>

              <button
                onClick={() => setExportStep('fields')}
                disabled={exportFilter === 'unico' && !selectedExportMemberId}
                className="w-full bg-ibc-teal text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-ibc-teal/90 transition-all flex items-center justify-center shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima Etapa
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    const newValue = !selectAllFields;
                    setSelectAllFields(newValue);
                    if (newValue) {
                      setExportFields(availableExportFields.map(f => f.id));
                    } else {
                      setExportFields([]);
                    }
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between",
                    selectAllFields ? "border-ibc-teal bg-ibc-teal/5" : "border-gray-100 dark:border-[#222]"
                  )}
                >
                  <div>
                    <p className="font-black text-gray-900 dark:text-gray-50 uppercase tracking-widest text-xs">Todas as Informações</p>
                    <p className="text-[10px] text-gray-400 font-medium">Exportar todos os campos disponíveis no cadastro.</p>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", selectAllFields ? "bg-ibc-teal border-ibc-teal" : "border-gray-200 dark:border-[#333]")}>
                    {selectAllFields && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <div className="pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ou selecione manualmente:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableExportFields.map((field) => (
                      <label 
                        key={field.id}
                        className={cn(
                          "flex items-center p-3 rounded-xl border transition-all cursor-pointer",
                          exportFields.includes(field.id) ? "border-ibc-teal bg-ibc-teal/5" : "border-gray-100 dark:border-[#222] hover:border-ibc-teal/20"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={exportFields.includes(field.id)}
                          onChange={() => {
                            setSelectAllFields(false);
                            const updated = exportFields.includes(field.id)
                              ? exportFields.filter(id => id !== field.id)
                              : [...exportFields, field.id];
                            setExportFields(updated);
                            if (updated.length === availableExportFields.length) {
                              setSelectAllFields(true);
                            }
                          }}
                        />
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center mr-3 transition-all",
                          exportFields.includes(field.id) ? "bg-ibc-teal border-ibc-teal" : "border-gray-300 dark:border-[#444] bg-white dark:bg-[#111]"
                        )}>
                          {exportFields.includes(field.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={cn("text-xs font-bold", exportFields.includes(field.id) ? "text-ibc-teal" : "text-gray-500 dark:text-gray-400")}>
                          {field.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setExportStep('selection')}
                  className="flex-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 dark:bg-[#222] transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Voltar
                </button>
                <button
                  onClick={handleDetailedExportPDF}
                  disabled={isSaving || exportFields.length === 0}
                  className="flex-[2] bg-ibc-teal text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-ibc-teal/90 transition-all flex items-center justify-center shadow-lg shadow-ibc-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : "Gerar PDF"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isAddFunctionModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Nova Função"
        maxWidth="max-w-3xl"
        fullscreen={true}
      >
        <form onSubmit={handleAddFunction} onInput={() => setIsFormDirty(true)} className="space-y-6 pb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nome da Função</label>
            <input 
              required 
              name="name" 
              type="text" 
              placeholder="Ex: Diácono, Presbítero, etc."
              className="w-full p-3 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Descrição da Função</label>
            <textarea 
              name="description" 
              placeholder="Descreva as responsabilidades e finalidade desta função..."
              rows={12}
              className="w-full p-4 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal resize-y text-sm h-80 sm:h-[28rem] min-h-[16rem] custom-scrollbar" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3.5 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-ibc-teal/10"
          >
            {isSaving ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : "Cadastrar Função"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditFunctionModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Função"
        maxWidth="max-w-3xl"
        fullscreen={true}
      >
        <form onSubmit={handleEditFunction} onInput={() => setIsFormDirty(true)} className="space-y-6 pb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nome da Função</label>
            <input 
              required 
              name="name" 
              type="text" 
              defaultValue={selectedFunction?.name}
              className="w-full p-3 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">Descrição da Função</label>
            <textarea 
              name="description" 
              defaultValue={selectedFunction?.description}
              placeholder="Descreva as responsabilidades e finalidade desta função..."
              rows={12}
              className="w-full p-4 border border-gray-200 dark:border-[#333] rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal resize-y text-sm h-80 sm:h-[28rem] min-h-[16rem] custom-scrollbar" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3.5 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-ibc-teal/10"
          >
            {isSaving ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : "Salvar Alterações"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isViewFunctionDetailsModalOpen}
        onClose={() => setIsViewFunctionDetailsModalOpen(false)}
        title="Detalhes da Função"
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-ibc-teal/10 rounded-2xl flex items-center justify-center text-ibc-teal">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900 dark:text-gray-50">{selectedFunction?.name}</h4>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Função de Membro</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100 dark:border-[#222]">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Descrição da Função</h5>
            <div className="p-5 bg-gray-50 dark:bg-black rounded-3xl border border-gray-100 dark:border-[#222] italic text-gray-600 dark:text-gray-300 leading-relaxed min-h-[120px]">
              {selectedFunction?.description || "Descrição não informada"}
            </div>
          </div>

          <button
            onClick={() => setIsViewFunctionDetailsModalOpen(false)}
            className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 py-3 rounded-2xl font-bold mt-4 hover:bg-gray-200 dark:bg-[#222] transition-all"
          >
            Fechar
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={isAddRelationshipTypeModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Novo Grau de Parentesco"
      >
        <form onSubmit={handleAddRelationshipType} onInput={() => setIsFormDirty(true)} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Grau de Parentesco</label>
            <input 
              required 
              name="name" 
              type="text" 
              placeholder="Ex: Tio, Tia, Primo, etc."
              className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : "Cadastrar Grau"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditRelationshipTypeModalOpen} 
        onClose={() => handleModalCloseWithCheck(() => resetModalStates())} 
        title="Editar Grau de Parentesco"
      >
        <form onSubmit={handleEditRelationshipType} onInput={() => setIsFormDirty(true)} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Grau de Parentesco</label>
            <input 
              required 
              name="name" 
              type="text" 
              defaultValue={selectedRelationshipType?.name}
              className="w-full p-2 border rounded-2xl outline-none focus:ring-2 focus:ring-ibc-teal" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-ibc-teal text-white py-3 rounded-2xl font-bold mt-4 hover:bg-ibc-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : "Salvar Alterações"}
          </button>
        </form>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        isOpen={!!alertConfig?.isOpen}
        onClose={() => setAlertConfig(null)}
        title={alertConfig?.title || 'Aviso'}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{alertConfig?.message}</p>
          <button
            onClick={() => setAlertConfig(null)}
            className="w-full bg-ibc-teal text-white py-2 rounded-2xl font-bold"
          >
            Entendido
          </button>
        </div>
      </Modal>

      {/* Custom Confirm Modal */}
      <Modal
        isOpen={!!confirmConfig?.isOpen}
        onClose={() => setConfirmConfig(null)}
        title={confirmConfig?.title || 'Confirmar'}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{confirmConfig?.message}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => setConfirmConfig(null)}
              className="flex-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 py-2 rounded-2xl font-bold hover:bg-gray-200 dark:bg-[#222] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                confirmConfig?.onConfirm();
                setConfirmConfig(null);
              }}
              className="flex-1 bg-red-500 text-white py-2 rounded-2xl font-bold hover:bg-red-600 transition-all"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal
        isOpen={!!passwordPromptConfig?.isOpen}
        onClose={() => setPasswordPromptConfig(null)}
        title={passwordPromptConfig?.title || 'Segurança'}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{passwordPromptConfig?.message}</p>
          <input 
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && enteredPassword === '123') {
                passwordPromptConfig?.onConfirm();
                setPasswordPromptConfig(null);
              }
            }}
            placeholder="Digite a senha"
            className="w-full p-3 border rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
            autoFocus
          />
          <div className="flex space-x-3">
            <button
              onClick={() => setPasswordPromptConfig(null)}
              className="flex-1 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 py-2 rounded-2xl font-bold hover:bg-gray-200 dark:bg-[#222] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (enteredPassword === '123') {
                  passwordPromptConfig?.onConfirm();
                  setPasswordPromptConfig(null);
                } else {
                  showAlert("Erro", "Senha incorreta.");
                }
              }}
              className="flex-1 bg-red-500 text-white py-2 rounded-2xl font-bold hover:bg-red-600 transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      {/* Undo Toast */}
      <AnimatePresence>
        {undoAction && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-md overflow-hidden"
          >
            <div className="bg-gray-900/85 backdrop-blur-[20px] border border-white/10 p-5 rounded-[2rem] shadow-2xl flex items-center justify-between relative">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-ibc-teal/20 rounded-2xl flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-ibc-teal" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">{undoAction.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincronizado</span>
                    <span className="w-1 h-1 rounded-full bg-ibc-teal" />
                    <span className="text-[10px] text-ibc-teal font-black animate-pulse">UNDO DISPONÍVEL</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleUndo}
                className="bg-ibc-teal text-white h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-ibc-teal/90 transition-all flex items-center shadow-lg active:scale-95 z-10"
              >
                Desfazer
              </button>
              
              {/* Progress Bar Timer */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-ibc-teal"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Update Notification Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[350] w-[calc(100%-2rem)] sm:w-auto sm:max-w-md bg-white/85 dark:bg-gray-900/85 backdrop-blur-[20px] border border-white/40 dark:border-white/10 p-4 rounded-[2rem] shadow-2xl shrink-0"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="w-10 h-10 bg-ibc-teal/10 rounded-2xl flex items-center justify-center shrink-0">
                  <RefreshCcw className={`w-5 h-5 text-ibc-teal ${isUpdating ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 leading-tight">Uma nova atualização está disponível.</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-normal mt-0.5">Versão mais recente pronta para uso.</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  disabled={isUpdating}
                  onClick={() => setShowUpdateBanner(false)}
                  className="px-3 py-2 bg-gray-50 dark:bg-black hover:bg-gray-100 dark:bg-[#1a1a1a] disabled:opacity-50 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold active:scale-95 transition-all text-center"
                >
                  Depois
                </button>
                <button
                  disabled={isUpdating}
                  onClick={handleUpdateNow}
                  className="px-4 py-2 bg-ibc-teal hover:bg-ibc-teal/95 disabled:opacity-50 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-ibc-teal/10 flex items-center justify-center shrink-0"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Atualizando...
                    </>
                  ) : (
                    'Atualizar agora'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 200, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 200, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-br from-ibc-teal to-teal-700 p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-white dark:bg-[#111] rounded-3xl shadow-xl p-2 flex items-center justify-center overflow-hidden">
                   <img 
                     src={appSettings.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/igreja-batista-coqueiral.appspot.com/o/assets%2Flogo_ibc.png?alt=media'} 
                     alt="App Logo"
                     className="w-full h-full object-contain"
                   />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-2xl uppercase tracking-tight">Instalar App</h3>
                  <p className="text-teal-50 text-sm font-medium leading-relaxed">Acesse instantaneamente da sua tela inicial e use como um aplicativo nativo.</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {isIOS ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal text-sm font-black shrink-0">1</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                        Toque no ícone de <span className="inline-flex items-center gap-1 mx-1 px-2 py-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-[#333] font-bold"><Share className="w-4 h-4" /> Compartilhar</span> na barra inferior do Safari.
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal text-sm font-black shrink-0">2</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                        Role para baixo e selecione <span className="inline-flex items-center gap-1 mx-1 px-2 py-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-[#333] font-bold"><Plus className="w-4 h-4" /> Adicionar à Tela de Início</span>.
                      </p>
                    </div>
                  </div>
                ) : deferredPrompt ? (
                  <div className="space-y-4">
                     <button 
                      onClick={handleInstallClick}
                      className="w-full py-5 bg-ibc-teal text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-ibc-teal/20 active:scale-[0.98] transition-all hover:bg-ibc-teal/90"
                    >
                      <Download className="w-5 h-5" />
                      Instalar Agora
                    </button>
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                      Clique acima para instalação rápida
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal text-sm font-black shrink-0">1</div>
                      <p className="text-sm text-gray-650 font-medium leading-relaxed">
                        Toque no ícone de menu <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-[#333] font-black">⋮</span> (três pontinhos) no canto superior direito do Chrome.
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-2xl bg-ibc-teal/10 flex items-center justify-center text-ibc-teal text-sm font-black shrink-0">2</div>
                      <p className="text-sm text-gray-655 font-medium leading-relaxed">
                        Selecione a opção <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-[#333] font-black">Instalar aplicativo</span> ou <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-[#333] font-black">Adicionar à tela inicial</span>.
                      </p>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setShowInstallModal(false);
                    setShowInstallBanner(false);
                    localStorage.setItem('pwa_install_dismissed', 'true');
                    localStorage.setItem('pwa_install_dismissed_time', Date.now().toString());
                  }}
                  className="w-full py-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-gray-600 dark:text-gray-300 transition-colors"
                >
                  Agora não, obrigado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
