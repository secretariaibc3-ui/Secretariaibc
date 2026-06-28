export interface Escala {
  id: string;
  type: 'domingo' | 'quinta' | 'diaconato';
  date?: string; // For diaconato
  sections?: {
    [key: string]: string[]; // sectionName: memberIds[]
  };
  responsibleIds?: string[]; // For diaconato
  responsibility?: string; // For diaconato
}
