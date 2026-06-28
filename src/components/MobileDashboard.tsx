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
  Home
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  setActiveTab,
  onAddMember,
  onAddMinistry
}: {
  setActiveTab: (tab: any) => void;
  onAddMember: () => void;
  onAddMinistry: () => void;
}) => {
  const [isFabOpen, setIsFabOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-[#0a0a0a] md:hidden">
      {/* Header */}
      <div className="bg-ibc-teal pt-14 pb-10 px-6 rounded-b-[2.5rem] shadow-lg flex flex-col items-center justify-center relative z-10">
        <img 
          src="/icon-ibc-branco.png" 
          alt="Igreja Batista Coqueiral" 
          className="h-32 w-auto object-contain drop-shadow-md"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-8 pb-32 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          {DASHBOARD_ITEMS.map((item) => {
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

        {/* Upcoming Events Placeholder */}
        <div className="mt-8">
          <h3 className="text-gray-900 dark:text-gray-50 font-black text-lg tracking-tight mb-4">
            Próximos eventos
          </h3>
          <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-3xl p-6 shadow-sm flex items-center justify-center min-h[120px]">
            <p className="text-gray-400 dark:text-gray-500 font-medium text-sm text-center">
              Nenhum evento próximo.
            </p>
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
    </div>
  );
};
