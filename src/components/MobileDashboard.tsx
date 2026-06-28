import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Briefcase, 
  BarChart3, 
  Settings, 
  FileText,
  Plus,
  UserPlus,
  Home,
  Cake,
  MessageSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Member {
  id: string;
  name: string;
  birthDate: string;
  photoUrl?: string;
  isActive: boolean;
  celular?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DASHBOARD_ITEMS = [
  { id: 'normativos', label: 'Atos normativos', icon: FileText },
  { id: 'members', label: 'Membros', icon: Users },
  { id: 'ministries', label: 'Ministérios', icon: BookOpen },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'rh', label: 'RH', icon: Briefcase },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'adm', label: 'ADM', icon: Settings },
];

export const MobileDashboard = ({ 
  members,
  setActiveTab,
  onAddMember,
  onAddMinistry,
  isAdmin
}: {
  members: Member[];
  setActiveTab: (tab: any) => void;
  onAddMember: () => void;
  onAddMinistry: () => void;
  isAdmin: boolean;
}) => {
  const [isFabOpen, setIsFabOpen] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const birthdayMembers = (members || [])
    .filter(m => {
      if (!m.isActive || !m.birthDate) return false;
      const parts = m.birthDate.split('-');
      return parseInt(parts[1], 10) === currentMonth;
    })
    .sort((a, b) => {
      const dayA = parseInt(a.birthDate.split('-')[2], 10) || 0;
      const dayB = parseInt(b.birthDate.split('-')[2], 10) || 0;
      return dayA - dayB;
    });

  const handleContactMember = (celular: string, name: string) => {
    const cleanNumber = celular.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}! A ${"Igreja Batista Seropédica"} deseja um Feliz Aniversário! 🎉 Que Deus te abençoe ricamente.`);
    window.open(`https://wa.me/55${cleanNumber}?text=${message}`, '_blank');
  };

  const dashboardItems = DASHBOARD_ITEMS.map(item => {
    if (item.id === 'adm' && !isAdmin) {
      return { ...item, label: 'Ajustes' };
    }
    return item;
  });

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-[#0a0a0a] md:hidden">
      {/* Header */}
      <div className="bg-ibc-teal pt-6 pb-2 px-6 rounded-b-[2rem] shadow-lg flex flex-col items-center justify-center relative z-10 h-32">
        <img 
          src="/icon-ibc-branco.png" 
          alt="Igreja Batista Seropédica" 
          className="h-24 w-[90%] max-w-[320px] object-contain drop-shadow-md"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {dashboardItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="bg-ibc-teal rounded-3xl p-5 flex flex-col items-center justify-center gap-3 shadow-lg shadow-ibc-teal/20 transition-transform active:scale-95"
              >
                <Icon className="w-8 h-8 text-white drop-shadow-sm" />
                <span className="text-white font-bold text-xs text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Upcoming Events and Birthdays */}
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-gray-900 dark:text-gray-50 font-black text-lg tracking-tight mb-4">
              Próximos eventos
            </h3>
            <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-3xl p-6 shadow-sm flex items-center justify-center min-h-[180px]">
              <p className="text-gray-400 dark:text-gray-500 font-medium text-sm text-center">
                Nenhum evento próximo.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-gray-50 font-black text-lg tracking-tight">
                Aniversariantes do mês
              </h3>
              <div className="bg-ibc-teal/10 text-ibc-teal px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {birthdayMembers.length} {birthdayMembers.length === 1 ? 'Membro' : 'Membros'}
              </div>
            </div>
            
            <div className="space-y-3">
              {birthdayMembers.length > 0 ? (
                birthdayMembers.map((member) => {
                  const birthdayParts = member.birthDate.split('-');
                  const day = birthdayParts[2] ? parseInt(birthdayParts[2], 10) : 0;
                  const monthIdx = birthdayParts[1] ? parseInt(birthdayParts[1], 10) - 1 : 0;
                  
                  // Calculate age
                  let age = null;
                  if (birthdayParts.length === 3 && birthdayParts[0].length === 4) {
                    const birthYear = parseInt(birthdayParts[0], 10);
                    const currentYear = new Date().getFullYear();
                    age = currentYear - birthYear;
                  }

                  return (
                    <div 
                      key={member.id}
                      className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-[2rem] p-4 shadow-sm flex items-center gap-4 transition-transform active:scale-[0.98]"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-black overflow-hidden shrink-0 border border-gray-100 dark:border-[#222] flex items-center justify-center text-lg font-bold text-gray-400">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} referrerPolicy="no-referrer" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-gray-900 dark:text-gray-50 text-sm truncate">
                          {member.name}
                        </h4>
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[10px] text-ibc-teal font-black uppercase tracking-widest">
                            {day.toString().padStart(2, '0')}/{(monthIdx + 1).toString().padStart(2, '0')}
                          </span>
                          {age !== null && (
                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                              Completa {age} anos
                            </span>
                          )}
                        </div>
                      </div>

                      {member.celular && (
                        <button 
                          onClick={() => handleContactMember(member.celular!, member.name)}
                          className="w-10 h-10 bg-ibc-teal/10 text-ibc-teal rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
                        >
                          <MessageSquare className="w-5 h-5 fill-current" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                  <Cake className="w-8 h-8 text-gray-200 mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                    Nenhum aniversariante encontrado neste mês.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB Overlay Blur */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
            onClick={() => setIsFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Menu */}
      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
          <AnimatePresence>
            {isFabOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex items-end gap-6 pb-2"
              >
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => {
                      setIsFabOpen(false);
                      onAddMember();
                    }}
                    className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-ibc-teal shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                  <span className="text-white text-xs font-bold drop-shadow-md">Membro</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => {
                      setIsFabOpen(false);
                      onAddMinistry();
                    }}
                    className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 text-ibc-teal shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>
                  <span className="text-white text-xs font-bold drop-shadow-md">Ministério</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={cn(
              "w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all duration-300",
              isFabOpen ? "bg-white text-ibc-teal rotate-45" : "bg-ibc-teal text-white"
            )}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
