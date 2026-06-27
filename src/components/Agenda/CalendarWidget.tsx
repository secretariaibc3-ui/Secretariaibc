import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { AgendaItem, AGENDA_CATEGORY_COLORS } from '../../types/Agenda';

interface CalendarWidgetProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  agendaItems: AgendaItem[];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, setSelectedDate, agendaItems }) => {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDate));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-[#111] border-b border-gray-100 dark:border-[#222]">
        <h2 className="text-lg font-black text-gray-900 dark:text-white capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "eeeeee";
    const days = [];
    let startDate = startOfWeek(currentMonth, { weekStartsOn: 0 });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2" key={i}>
          {format(addDays(startDate, i), dateFormat, { locale: ptBR })}
        </div>
      );
    }
    return <div className="grid grid-cols-7 bg-white dark:bg-[#111]">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const now = new Date();

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find events for this day
        const dayString = format(cloneDay, 'yyyy-MM-dd');
        const dayEvents = agendaItems.filter(item => item.date === dayString);

        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, now);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            onClick={() => {
              setSelectedDate(cloneDay);
              if (!isSameMonth(cloneDay, currentMonth)) {
                setCurrentMonth(startOfMonth(cloneDay));
              }
            }}
            className={`
              relative flex flex-col items-center justify-start py-2 min-h-[50px] cursor-pointer transition-all
              ${!isCurrentMonth ? 'opacity-30' : ''}
              ${isSelected ? '' : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'}
            `}
          >
            {/* Selection Highlight */}
            {isSelected && (
              <motion.div 
                layoutId="calendar-selection"
                className="absolute inset-0 m-1 bg-ibc-teal/10 dark:bg-ibc-teal/20 rounded-xl border border-ibc-teal/30 z-0"
              />
            )}

            <span 
              className={`
                relative z-10 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                ${isToday && !isSelected ? 'bg-ibc-teal text-white' : ''}
                ${isSelected && !isToday ? 'text-ibc-teal' : ''}
                ${isSelected && isToday ? 'bg-ibc-teal text-white' : ''}
                ${!isToday && !isSelected ? 'text-gray-700 dark:text-gray-300' : ''}
              `}
            >
              {formattedDate}
            </span>

            {/* Event Indicators */}
            <div className="relative z-10 flex gap-0.5 mt-1">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div 
                  key={idx} 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: event.type === 'event' ? event.color : '#9ca3af' }}
                />
              ))}
              {dayEvents.length > 3 && (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white dark:bg-[#111] pb-2 border-b border-gray-100 dark:border-[#222]">{rows}</div>;
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#111]">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};
