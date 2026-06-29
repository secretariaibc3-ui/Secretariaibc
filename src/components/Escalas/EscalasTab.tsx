import React, { useState } from 'react';
import { Member } from '../../types/member';
import { Escala } from '../../types/escalas';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
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
  const [activeManager, setActiveManager] = useState<'domingo' | 'quinta' | 'diaconato' | 'semana' | null>(null);

  if (activeManager === 'domingo') return <DomingoEscala members={members} escala={escalas.find(e => e.type === 'domingo') || { id: '', type: 'domingo', sections: { 'Pátio': [], 'Café': [], 'Recepção': [] } }} onUpdate={onUpdateEscala} isAdmin={isAdmin} onBack={() => setActiveManager(null)} />;
  if (activeManager === 'quinta') return <QuintaEscala members={members} escala={escalas.find(e => e.type === 'quinta') || { id: '', type: 'quinta', sections: { 'Dirigente': [], 'Proletariado': [], 'Participação': [] } }} onUpdate={onUpdateEscala} isAdmin={isAdmin} onBack={() => setActiveManager(null)} />;
  if (activeManager === 'diaconato') return <DiaconatoEscala members={members} escalas={escalas.filter(e => e.type === 'diaconato')} onUpdate={onUpdateEscala} onBack={() => setActiveManager(null)} />;

  const domingo = escalas.find(e => e.type === 'domingo') || { id: '', type: 'domingo', sections: { 'Pátio': [], 'Café': [], 'Recepção': [] } };
  const quinta = escalas.find(e => e.type === 'quinta') || { id: '', type: 'quinta', sections: { 'Dirigente': [], 'Proletariado': [], 'Participação': [] } };
  const diaconato = escalas.filter(e => e.type === 'diaconato');

  if (activeManager === 'semana') {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveManager(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black">Escala da Semana</h2>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-xl font-bold text-ibc-teal mb-4 uppercase tracking-wider border-b border-ibc-teal/20 pb-2">Domingo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(domingo.sections || {}).map(([section, memberIds]) => (
                <div key={section} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                  <h4 className="font-bold text-sm text-gray-500 mb-2">{section}</h4>
                  <ul className="space-y-1">
                    {(memberIds as string[]).map(id => (
                      <li key={id} className="text-sm font-medium">{members.find(m => m.id === id)?.name || 'Membro não encontrado'}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-ibc-teal mb-4 uppercase tracking-wider border-b border-ibc-teal/20 pb-2">Quinta-feira</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(quinta.sections || {}).map(([section, memberIds]) => (
                <div key={section} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                  <h4 className="font-bold text-sm text-gray-500 mb-2">{section}</h4>
                  <ul className="space-y-1">
                    {(memberIds as string[]).map(id => (
                      <li key={id} className="text-sm font-medium">{members.find(m => m.id === id)?.name || 'Membro não encontrado'}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {diaconato.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-ibc-teal mb-4 uppercase tracking-wider border-b border-ibc-teal/20 pb-2">Diaconato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diaconato.map(escala => (
                  <div key={escala.id} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-gray-500 uppercase">{escala.responsibility}</h4>
                      <span className="text-[10px] bg-ibc-teal/10 text-ibc-teal px-2 py-0.5 rounded-full font-bold">{escala.date}</span>
                    </div>
                    <ul className="space-y-1">
                      {escala.responsibleIds?.map(id => (
                        <li key={id} className="text-sm font-medium">{members.find(m => m.id === id)?.name || 'Membro não encontrado'}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-black">Escalas</h2>
        <button 
          onClick={() => setActiveManager('semana')}
          className="bg-ibc-teal text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-ibc-teal/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Escala da Semana
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['domingo', 'quinta', 'diaconato'].map(type => (
          <button 
            key={type}
            onClick={() => setActiveManager(type as any)}
            className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#222] transition-all group"
          >
            <span className="font-bold capitalize group-hover:text-ibc-teal transition-colors">{type}</span>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-ibc-teal group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};
