import React, { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Member } from '../../App';

interface MemberSelectorProps {
  members: Member[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onClose: () => void;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({ members, selectedMemberIds, onToggleMember, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    return members.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111] rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
          <h3 className="font-bold">Selecionar Membros</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMembers.map(member => (
            <button
              key={member.id}
              onClick={() => onToggleMember(member.id)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#222] rounded-xl"
            >
              <span>{member.name}</span>
              {selectedMemberIds.includes(member.id) && <Check className="w-4 h-4 text-ibc-teal" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
