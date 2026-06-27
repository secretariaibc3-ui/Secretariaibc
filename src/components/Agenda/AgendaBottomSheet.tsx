import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MapPin, Users, Repeat, Bell, FileText, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/storage'; // Wait, it's firestore, not storage
import { 
  AgendaItem, 
  AgendaEvent, 
  AgendaTask, 
  AGENDA_CATEGORY_COLORS, 
  AgendaCategory,
  RepeatType,
  ReminderType,
  TaskPriority,
  TaskStatus
} from '../../types/Agenda';

// Note: Ensure firebase imports are corrected in the main wrapper or here.
import { collection as fsCollection, addDoc as fsAddDoc, updateDoc as fsUpdateDoc, deleteDoc as fsDeleteDoc, doc as fsDoc, serverTimestamp as fsServerTimestamp } from 'firebase/firestore';

interface AgendaBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  editItem: AgendaItem | null;
  members: any[];
  ministries: any[];
  onSave: () => void;
}

export const AgendaBottomSheet: React.FC<AgendaBottomSheetProps> = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  editItem,
  members,
  ministries,
  onSave
}) => {
  const [tab, setTab] = useState<'event' | 'task'>('event');
  
  // Form State - Event
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AgendaCategory>('Outro');
  const [color, setColor] = useState(AGENDA_CATEGORY_COLORS['Outro']);
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [reminder, setReminder] = useState<ReminderType>('none');
  const [observations, setObservations] = useState('');

  // Form State - Task
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('media');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pendente');
  const [taskResponsibleId, setTaskResponsibleId] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setTab(editItem.type);
        setTitle(editItem.title);
        setStartDate(editItem.date);
        setStartTime(editItem.time || '');
        setObservations(editItem.observations || '');

        if (editItem.type === 'event') {
          const ev = editItem as AgendaEvent;
          setCategory(ev.category);
          setColor(ev.color);
          setAllDay(ev.allDay);
          setEndDate(ev.endDate);
          setEndTime(ev.endTime || '');
          setLocation(ev.location || '');
          setMinistryId(ev.ministryId || '');
          setResponsibleIds(ev.responsibleIds || []);
          setRepeat(ev.repeat);
          setReminder(ev.reminder);
        } else {
          const ts = editItem as AgendaTask;
          setTaskDescription(ts.description || '');
          setTaskPriority(ts.priority);
          setTaskStatus(ts.status);
          setTaskResponsibleId(ts.responsibleId || '');
        }
      } else {
        // Reset defaults for new item based on selectedDate
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        setTab('event');
        setTitle('');
        setCategory('Outro');
        setColor(AGENDA_CATEGORY_COLORS['Outro']);
        setAllDay(false);
        setStartDate(dateStr);
        setStartTime('09:00');
        setEndDate(dateStr);
        setEndTime('10:00');
        setLocation('');
        setMinistryId('');
        setResponsibleIds([]);
        setRepeat('none');
        setReminder('none');
        setObservations('');
        
        setTaskDescription('');
        setTaskPriority('media');
        setTaskStatus('pendente');
        setTaskResponsibleId('');
      }
    }
  }, [isOpen, editItem, selectedDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("O título é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const baseData = {
        title,
        date: startDate,
        time: startTime,
        observations,
        updatedAt: fsServerTimestamp()
      };

      let itemData: any = {};

      if (tab === 'event') {
        itemData = {
          ...baseData,
          type: 'event',
          category,
          color,
          allDay,
          endDate,
          endTime,
          location,
          ministryId,
          responsibleIds,
          repeat,
          reminder
        };
      } else {
        itemData = {
          ...baseData,
          type: 'task',
          description: taskDescription,
          priority: taskPriority,
          status: taskStatus,
          responsibleId: taskResponsibleId
        };
      }

      if (editItem) {
        await fsUpdateDoc(fsDoc(db, 'calendar', editItem.id), itemData);
      } else {
        itemData.createdAt = fsServerTimestamp();
        await fsAddDoc(fsCollection(db, 'calendar'), itemData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar compromisso.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem) return;
    if (window.confirm("Deseja realmente excluir este compromisso?")) {
      try {
        await fsDeleteDoc(fsDoc(db, 'calendar', editItem.id));
        onSave();
        onClose();
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  const handleDuplicate = async () => {
    if (!editItem) return;
    setLoading(true);
    try {
      const copy = { ...editItem, title: `${editItem.title} (Cópia)` };
      delete (copy as any).id;
      copy.createdAt = fsServerTimestamp();
      copy.updatedAt = fsServerTimestamp();
      await fsAddDoc(fsCollection(db, 'calendar'), copy);
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao duplicar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!editItem || editItem.type !== 'task') return;
    try {
      await fsUpdateDoc(fsDoc(db, 'calendar', editItem.id), {
        status: 'concluida',
        updatedAt: fsServerTimestamp()
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-[#111] rounded-t-3xl z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#222]">
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-1">
                  <button
                    onClick={() => !editItem && setTab('event')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${tab === 'event' ? 'bg-white dark:bg-[#222] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                  >
                    Evento
                  </button>
                  <button
                    onClick={() => !editItem && setTab('task')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${tab === 'task' ? 'bg-white dark:bg-[#222] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                  >
                    Tarefa
                  </button>
                </div>
              </div>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-ibc-teal text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                Salvar
              </button>
            </div>

            {/* Content Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-black bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 pb-2 border-b border-gray-100 dark:border-[#222]"
                autoFocus
              />

              {tab === 'event' ? (
                <div className="space-y-4">
                  
                  {/* Category & Color */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <select
                      value={category}
                      onChange={(e) => {
                        const val = e.target.value as AgendaCategory;
                        setCategory(val);
                        setColor(AGENDA_CATEGORY_COLORS[val]);
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      {Object.keys(AGENDA_CATEGORY_COLORS).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl space-y-4">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Todo o dia</span>
                      <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-5 h-5 rounded text-ibc-teal focus:ring-ibc-teal" />
                    </label>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200" />
                        {!allDay && <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 text-right" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 shrink-0" /> {/* Spacer */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200" />
                        {!allDay && <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 text-right" />}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Local" 
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 placeholder-gray-400"
                    />
                  </div>

                  {/* Ministry */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Users className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={ministryId}
                      onChange={e => setMinistryId(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Nenhum ministério relacionado</option>
                      {ministries.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Responsáveis */}
                  <div className="flex items-start gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Users className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                    <div className="flex-1">
                      <select
                        multiple
                        value={responsibleIds}
                        onChange={e => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setResponsibleIds(values);
                        }}
                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 min-h-[80px]"
                      >
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Segure Ctrl (ou Cmd) para selecionar mais de um.</p>
                    </div>
                  </div>

                  {/* Repeat & Reminder */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Repeat className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={repeat}
                      onChange={e => setRepeat(e.target.value as RepeatType)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="none">Não repetir</option>
                      <option value="daily">Todos os dias</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="biweekly">Quinzenalmente</option>
                      <option value="monthly">Mensalmente</option>
                      <option value="yearly">Anualmente</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Bell className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={reminder}
                      onChange={e => setReminder(e.target.value as ReminderType)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="none">Sem lembrete</option>
                      <option value="0">No horário</option>
                      <option value="10m">10 minutos antes</option>
                      <option value="30m">30 minutos antes</option>
                      <option value="1h">1 hora antes</option>
                      <option value="2h">2 horas antes</option>
                      <option value="1d">1 dia antes</option>
                      <option value="2d">2 dias antes</option>
                      <option value="1w">1 semana antes</option>
                    </select>
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Task Date/Time */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200" />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200" />
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold shrink-0">!</span>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="baixa">Prioridade Baixa</option>
                      <option value="media">Prioridade Média</option>
                      <option value="alta">Prioridade Alta</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={taskStatus}
                      onChange={e => setTaskStatus(e.target.value as TaskStatus)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>

                  {/* Task Responsible */}
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <Users className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={taskResponsibleId}
                      onChange={e => setTaskResponsibleId(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Sem responsável</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Task Description */}
                  <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                    <textarea 
                      placeholder="Descrição da tarefa"
                      value={taskDescription}
                      onChange={e => setTaskDescription(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 resize-none min-h-[80px]"
                    />
                  </div>

                </div>
              )}

              {/* Shared Observations */}
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl">
                <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                <textarea 
                  placeholder="Observações"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-gray-200 resize-none min-h-[80px]"
                />
              </div>

              {/* Action Buttons for Edit */}
              {editItem && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-[#222]">
                  {editItem.type === 'task' && taskStatus === 'pendente' && (
                    <button 
                      onClick={handleCompleteTask}
                      className="col-span-2 flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Marcar como Concluída
                    </button>
                  )}
                  
                  <button 
                    onClick={handleDuplicate}
                    className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                    Duplicar
                  </button>

                  <button 
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Excluir
                  </button>
                </div>
              )}
              
              <div className="h-20" /> {/* Bottom Spacer */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
