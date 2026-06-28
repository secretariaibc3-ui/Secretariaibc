import React from 'react';
import { Plus, X } from 'lucide-react';
import { Member } from '../../App';

interface EscalaSectionProps {
  title: string;
  members: Member[];
  onAdd: () => void;
  onRemove: (memberId: string) => void;
  isAdmin: boolean;
}

export const EscalaSection: React.FC<EscalaSectionProps> = ({ title, members, onAdd, onRemove, isAdmin }) => {
  return (
    <div className="bg-gray-50 dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-[#222]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200">{title}</h4>
        {isAdmin && (
            <button onClick={onAdd} className="p-1 rounded-full bg-ibc-teal/10 text-ibc-teal hover:bg-ibc-teal/20">
              <Plus className="w-4 h-4" />
            </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#222] rounded-lg text-xs font-medium border border-gray-100 dark:border-[#333]">
            {member.name}
            {isAdmin && (
                <button onClick={() => onRemove(member.id)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
