export interface Relationship {
  memberId: string;
  type: string;
}

export interface MemberMinistry {
  ministryId: string;
  role: string;
}

export interface RelationshipType {
  id: string;
  name: string;
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
  photoUrl?: string;
  isActive: boolean;
  isAbsent?: boolean;
  exitDate?: string;
  exitReason?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  coordinates?: { lat: number, lng: number };
  distanceToChurch?: number;
  createdAt: any;
  updatedAt: any;
}
