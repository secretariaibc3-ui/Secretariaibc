import React from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { MapPin, Clock, CheckCircle, Circle } from 'lucide-react';
import { AgendaItem, AgendaEvent, AgendaTask } from '../../types/Agenda';

interface AgendaListProps {
  selectedDate: Date;
  agendaItems: AgendaItem[];
  onItemClick: (item: AgendaItem) => void;
}

export const AgendaList: React.FC<AgendaListProps> = ({ selectedDate, agendaItems, onItemClick }) => {
  const dayString = format(selectedDate, 'yyyy-MM-dd');
  
  // Filter and sort items for the selected day
  const dayItems = agendaItems
    .filter(item => item.date === dayString)
    .sort((a, b) => {
      // Sort by time, if no time, put at top
      if (!a.time && !b.time) return 0;
      if (!a.time) return -1;
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });

  if (dayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center">
          <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Sem compromissos</h3>
        <p className="text-xs text-gray-500">Nenhum evento ou tarefa para esta data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-3">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
        {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
      </h3>
      
      {dayItems.map((item, idx) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          key={item.id}
          onClick={() => onItemClick(item)}
          className="flex flex-col bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-2xl p-4 cursor-pointer hover:border-gray-200 dark:hover:border-[#333] transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            {/* Color Indicator */}
            <div 
              className="w-1 rounded-full shrink-0 self-stretch min-h-[40px]"
              style={{ backgroundColor: item.type === 'event' ? (item as AgendaEvent).color : '#9ca3af' }}
            />
            
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.type === 'task' && (
                    <span className="inline-block mr-2 align-middle">
                      {(item as AgendaTask).status === 'concluida' ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <Circle className="w-4 h-4 text-gray-300" />
                      }
                    </span>
                  )}
                  {item.title}
                </h4>
                
                <span className="text-xs font-bold text-gray-500 shrink-0 ml-2">
                  {item.type === 'event' && (item as AgendaEvent).allDay ? 'Todo o dia' : item.time || ''}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {item.type === 'event' && (item as AgendaEvent).location && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{(item as AgendaEvent).location}</span>
                  </div>
                )}
                
                {item.type === 'event' && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 dark:bg-[#1a1a1a]" style={{ color: (item as AgendaEvent).color }}>
                    {(item as AgendaEvent).category}
                  </div>
                )}
                
                {item.type === 'task' && (
                  <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    (item as AgendaTask).priority === 'alta' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                    (item as AgendaTask).priority === 'media' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                  }`}>
                    Prioridade {(item as AgendaTask).priority}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
