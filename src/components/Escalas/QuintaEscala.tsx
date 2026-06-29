import React, { useState } from 'react';
import { Escala } from '../../types/escalas';
import { Member } from '../../types/member';
import { EscalaSection } from './EscalaSection';
import { MemberSelector } from './MemberSelector';
import { ChevronLeft } from 'lucide-react';

export const QuintaEscala = ({ members, escala, onUpdate, isAdmin, onBack }: { members: Member[], escala: Escala, onUpdate: (e: Escala) => void, isAdmin: boolean, onBack: () => void }) => {
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const handleUpdate = (section: string, memberIds: string[]) => {
    onUpdate({ ...escala, sections: { ...escala.sections, [section]: memberIds } });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black">Quinta-feira</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(escala.sections || {}).map(([section, memberIds]) => (
          <EscalaSection 
            key={section}
            title={section}
            members={members.filter(m => memberIds.includes(m.id))}
            isAdmin={isAdmin}
            onAdd={() => { setSelectedSection(section); setIsMemberSelectorOpen(true); }}
            onRemove={(id) => handleUpdate(section, (memberIds as string[]).filter(mid => mid !== id))}
          />
        ))}
      </div>
      {isMemberSelectorOpen && selectedSection && (
        <MemberSelector
          members={members}
          selectedMemberIds={(escala.sections![selectedSection] || []) as string[]}
          onToggleMember={(memberId) => {
            const currentMembers = (escala.sections![selectedSection] || []) as string[];
            const newMembers = currentMembers.includes(memberId) 
              ? currentMembers.filter(id => id !== memberId)
              : [...currentMembers, memberId];
            handleUpdate(selectedSection, newMembers);
          }}
          onClose={() => setIsMemberSelectorOpen(false)}
        />
      )}
    </div>
  );
};
