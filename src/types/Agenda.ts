export type AgendaCategory = 'Culto' | 'Reunião' | 'Ministério' | 'Congresso' | 'Batismo' | 'Santa Ceia' | 'Escola Bíblica' | 'Evangelismo' | 'Evento Especial' | 'Administrativo' | 'Outro';

export const AGENDA_CATEGORY_COLORS: Record<AgendaCategory, string> = {
  'Culto': '#3b82f6', 
  'Reunião': '#8b5cf6', 
  'Ministério': '#ec4899', 
  'Congresso': '#f59e0b', 
  'Batismo': '#06b6d4', 
  'Santa Ceia': '#ef4444', 
  'Escola Bíblica': '#10b981', 
  'Evangelismo': '#f97316', 
  'Evento Especial': '#6366f1', 
  'Administrativo': '#64748b', 
  'Outro': '#9ca3af', 
};

export type RepeatType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type TaskPriority = 'baixa' | 'media' | 'alta';
export type TaskStatus = 'pendente' | 'concluida';

export interface BaseAgendaItem {
  id: string;
  type: 'event' | 'task';
  title: string;
  date: string; // YYYY-MM-DD format for easier querying
  time?: string; // HH:mm
  observations?: string;
  createdAt: any; 
  updatedAt: any;
}

export interface AgendaEvent extends BaseAgendaItem {
  type: 'event';
  category: AgendaCategory;
  color: string;
  allDay: boolean;
  endDate: string;
  endTime?: string;
  location?: string;
  ministryId?: string;
  responsibleIds?: string[];
  repeat: RepeatType;
}

export interface AgendaTask extends BaseAgendaItem {
  type: 'task';
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsibleId?: string;
}

export type AgendaItem = AgendaEvent | AgendaTask;
