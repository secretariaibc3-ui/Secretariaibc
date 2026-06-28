export interface Relationship {
  memberId: string;
  type: string;
}

export interface MemberMinistry {
  ministryId: string;
  role: string;
}

export interface Member {
  id: string;
  name: string;
  function: string;
  ministryId?: string; // Mantido para compatibilidade
  ministryIds?: string[]; // Múltiplos ministérios
  ministries?: MemberMinistry[];
  relationships?: Relationship[];
  gender?: 'Homem' | 'Mulher';
  birthDate: string;
  startDate: string;
}
