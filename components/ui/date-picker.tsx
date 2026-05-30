import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WheelDatePicker } from "./wheel-date-picker"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
  children?: React.ReactNode
}

export function DatePicker({ date, setDate, placeholder, className, children }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleDateChange = (newDate: Date) => {
    setDate(newDate)
    setIsOpen(false)
  }

  return (
    <>
      {children ? (
        <div onClick={() => setIsOpen(true)} className={cn("cursor-pointer", className)}>
          {children}
        </div>
      ) : (
        <Button
          variant={"outline"}
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full justify-start text-left font-bold text-sm bg-surface-container-lowest border-outline-variant/30 rounded-lg px-3 py-1.5 h-auto min-h-[44px] flex items-center min-w-0 overflow-hidden",
            !date && "text-on-surface-variant",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
          <span className="truncate flex-1 min-w-0">
            {date ? format(date, "PPP", { locale: ptBR }) : (placeholder || "Selecione uma data")}
          </span>
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm z-10"
            >
              <WheelDatePicker 
                date={date || new Date()} 
                onChange={handleDateChange}
                onClose={() => setIsOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
