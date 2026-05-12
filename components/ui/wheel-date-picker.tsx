import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronUp, ChevronDown, Calendar as CalendarIcon, Check } from "lucide-react"
import { format, setYear, setMonth, setDate, getDaysInMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface WheelPickerProps {
  date: Date
  onChange: (date: Date) => void
  onClose: () => void
}

export function WheelDatePicker({ date, onChange, onClose }: WheelPickerProps) {
  const [tempDate, setTempDate] = React.useState(new Date(date))
  
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 20 }, (_, i) => currentYear - 10 + i)
  }, [])

  const months = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR })
    }))
  }, [])

  const days = React.useMemo(() => {
    const daysInMonth = getDaysInMonth(tempDate)
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [tempDate])

  const handleYearChange = (year: number) => {
    setTempDate(prev => setYear(prev, year))
  }

  const handleMonthChange = (month: number) => {
    setTempDate(prev => setMonth(prev, month))
  }

  const handleDayChange = (day: number) => {
    setTempDate(prev => setDate(prev, day))
  }

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-[2rem] shadow-2xl border border-outline-variant/20 overflow-hidden w-full max-w-sm mx-auto">
      <div className="p-6 border-b border-outline-variant/10 bg-primary/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Selecionar Data</p>
          <h3 className="text-xl font-black font-headline text-on-surface capitalize">
            {format(tempDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <CalendarIcon size={24} />
        </div>
      </div>

      <div className="flex p-4 gap-2 h-80 relative">
        {/* Day Column */}
        <WheelColumn 
          items={days} 
          value={tempDate.getDate()} 
          onChange={handleDayChange} 
          label="Dia"
        />
        
        {/* Month Column */}
        <WheelColumn 
          items={months.map(m => m.label)} 
          value={months[tempDate.getMonth()].label} 
          onChange={(val) => handleMonthChange(months.find(m => m.label === val)!.value)} 
          label="Mês"
          className="flex-[2]"
        />

        {/* Year Column */}
        <WheelColumn 
          items={years} 
          value={tempDate.getFullYear()} 
          onChange={handleYearChange} 
          label="Ano"
        />

        {/* Selection Highlight Overlay */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-12 border-y-2 border-primary/20 pointer-events-none bg-primary/5 rounded-lg" />
        
        {/* Gradient Overlays for Wheel Effect */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-surface-container-lowest to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none z-10" />
      </div>

      <div className="p-4 bg-surface-container-low flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={() => {
            onChange(tempDate)
            onClose()
          }}
          className="flex-1 py-4 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[0.98] transition-all"
        >
          <Check size={18} />
          Confirmar
        </button>
      </div>
    </div>
  )
}

interface WheelColumnProps {
  items: (string | number)[]
  value: string | number
  onChange: (val: any) => void
  label: string
  className?: string
}

function WheelColumn({ items, value, onChange, label, className }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const itemHeight = 48
    const scrollTop = container.scrollTop
    const index = Math.round(scrollTop / itemHeight)
    if (items[index] !== undefined && items[index] !== value) {
      onChange(items[index])
    }
  }

  const handleUp = () => {
    const index = items.indexOf(value)
    if (index > 0) {
      onChange(items[index - 1])
    }
  }

  const handleDown = () => {
    const index = items.indexOf(value)
    if (index < items.length - 1) {
      onChange(items[index + 1])
    }
  }

  React.useEffect(() => {
    const index = items.indexOf(value)
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTop = index * 48
    }
  }, [value, items])

  return (
    <div className={cn("flex-1 flex flex-col items-center relative group", className)}>
      <span className="text-[8px] font-black uppercase tracking-tighter text-on-surface-variant/40 mb-1">{label}</span>
      
      <button 
        onClick={handleUp}
        className="p-2 text-black hover:text-primary transition-colors disabled:opacity-10 z-20"
        disabled={items.indexOf(value) <= 0}
      >
        <ChevronUp size={28} strokeWidth={3.5} />
      </button>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-48 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory py-20"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => (
          <div 
            key={i}
            className={cn(
              "h-12 flex items-center justify-center snap-center transition-all duration-200",
              item === value 
                ? "text-primary font-black text-lg scale-110" 
                : "text-on-surface-variant/40 font-bold text-sm"
            )}
          >
            {item}
          </div>
        ))}
      </div>

      <button 
        onClick={handleDown}
        className="p-2 text-black hover:text-primary transition-colors disabled:opacity-10 z-20"
        disabled={items.indexOf(value) >= items.length - 1}
      >
        <ChevronDown size={28} strokeWidth={3.5} />
      </button>
    </div>
  )
}
