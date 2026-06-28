import React, { useState } from 'react';
import { Member } from '../../types/member';
import { Escala } from '../../types/escalas';
import { ChevronRight } from 'lucide-react';
// I will need to create separate management components
import { DomingoEscala } from './DomingoEscala';
import { QuintaEscala } from './QuintaEscala';
import { DiaconatoEscala } from './DiaconatoEscala';

interface EscalasTabProps {
  members: Member[];
  escalas: Escala[];
  isAdmin: boolean;
  onUpdateEscala: (escala: Escala) => void;
}

export const EscalasTab: React.FC<EscalasTabProps> = ({ members, escalas, isAdmin, onUpdateEscala }) => {
  const [activeManager, setActiveManager] = useState<'domingo' | 'quinta' | 'diaconato' | null>(null);

  if (activeManager === 'domingo') return <DomingoEscala members={members} escala={escalas.find(e => e.type === 'domingo') || { id: '', type: 'domingo', sections: { 'Pátio': [], 'Café': [], 'Recepção': [] } }} onUpdate={onUpdateEscala} isAdmin={isAdmin} />;
  if (activeManager === 'quinta') return <QuintaEscala members={members} escala={escalas.find(e => e.type === 'quinta') || { id: '', type: 'quinta', sections: { 'Dirigente': [], 'Proletariado': [], 'Participação': [] } }} onUpdate={onUpdateEscala} isAdmin={isAdmin} />;
  if (activeManager === 'diaconato') return <DiaconatoEscala members={members} escalas={escalas.filter(e => e.type === 'diaconato')} onUpdate={onUpdateEscala} />;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-black">Escalas</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['domingo', 'quinta', 'diaconato'].map(type => (
          <button 
            key={type}
            onClick={() => setActiveManager(type as any)}
            className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#222] transition-all"
          >
            <span className="font-bold capitalize">{type}</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};
