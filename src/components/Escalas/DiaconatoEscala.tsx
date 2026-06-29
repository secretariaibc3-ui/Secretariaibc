import React, { useState } from 'react';
import { Escala } from '../../types/escalas';
import { Member } from '../../types/member';
import { Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { MemberSelector } from './MemberSelector';

export const DiaconatoEscala = ({ members, escalas, onUpdate, onBack }: { members: Member[], escalas: Escala[], onUpdate: (e: Escala) => void, onBack: () => void }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newEscala, setNewEscala] = useState<Partial<Escala>>({ type: 'diaconato', responsibleIds: [], date: '', responsibility: '' });

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black">Diaconato</h2>
      </div>
      <button 
        onClick={() => setIsFormOpen(true)}
        className="flex items-center gap-2 p-3 bg-ibc-teal text-white rounded-xl font-bold text-sm"
      >
        <Plus className="w-4 h-4" /> Nova Escala
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {escalas.map(escala => (
          <div key={escala.id} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222]">
            <p className="font-bold">{escala.date}</p>
            <p className="text-sm text-gray-500">{escala.responsibility}</p>
            <p className="text-sm">Responsáveis: {escala.responsibleIds?.map(id => members.find(m => m.id === id)?.name).join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
