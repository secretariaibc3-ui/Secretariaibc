import React, { useState, useEffect } from 'react';
import { CalendarWidget } from './CalendarWidget';
import { AgendaList } from './AgendaList';
import { AgendaBottomSheet } from './AgendaBottomSheet';
import { AgendaItem } from '../../types/Agenda';
import { Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

interface AgendaTabProps {
  members: any[];
  ministries: any[];
}

export const AgendaTab: React.FC<AgendaTabProps> = ({ members, ministries }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<AgendaItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'calendar'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AgendaItem[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as AgendaItem);
      });
      setAgendaItems(items);
    }, (error) => {
      console.error("Erro ao carregar agenda:", error);
    });

    return () => unsubscribe();
  }, []);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return agendaItems;
    
    const lowerQuery = searchQuery.toLowerCase();
    return agendaItems.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
      const descMatch = item.type === 'task' && (item as any).description?.toLowerCase().includes(lowerQuery);
      const locMatch = item.type === 'event' && (item as any).location?.toLowerCase().includes(lowerQuery);
      const obsMatch = item.observations?.toLowerCase().includes(lowerQuery);
      
      return titleMatch || descMatch || locMatch || obsMatch;
    });
  }, [agendaItems, searchQuery]);

  const handleAddNew = () => {
    setEditItem(null);
    setIsBottomSheetOpen(true);
  };

  const handleEditItem = (item: AgendaItem) => {
    setEditItem(item);
    setIsBottomSheetOpen(true);
  };

  const handleClose = React.useCallback(() => {
    setIsBottomSheetOpen(false);
  }, []);

  const handleSave = React.useCallback(() => {
    setIsBottomSheetOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black relative">
      {/* Top Search Bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md border-b border-gray-100 dark:border-[#222]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquisar eventos e tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-[#1a1a1a] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-ibc-teal/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Calendar Widget */}
        <CalendarWidget 
          selectedDate={selectedDate} 
          setSelectedDate={setSelectedDate} 
          agendaItems={agendaItems} // Use all items for indicators
        />

        {/* Agenda List for Selected Date */}
        <AgendaList 
          selectedDate={selectedDate} 
          agendaItems={filteredItems}
          onItemClick={handleEditItem}
        />
      </div>

      {/* Floating Action Button / Bottom Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-sm">
        <button 
          onClick={handleAddNew}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-black">
            Adicionar em {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </span>
        </button>
      </div>

      <AgendaBottomSheet 
        isOpen={isBottomSheetOpen}
        onClose={handleClose}
        selectedDate={selectedDate}
        editItem={editItem}
        members={members}
        ministries={ministries}
        onSave={handleSave}
      />
    </div>
  );
};
