'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onValueChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CurrencyInput({ 
  value, 
  onValueChange, 
  placeholder = 'R$ 0,00',
  className,
  disabled = false
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    if (value === 0 && displayValue === '') return
    setDisplayValue(formatCurrency(value))
  }, [value])

  const formatCurrency = (val: number): string => {
    if (val === 0) return ''
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseCurrency = (str: string): number => {
    // Remove tudo exceto números
    const numbers = str.replace(/\D/g, '')
    if (!numbers) return 0
    // Converte centavos para reais
    return parseInt(numbers) / 100
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const numericValue = parseCurrency(inputValue)
    setDisplayValue(formatCurrency(numericValue))
    onValueChange(numericValue)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder.replace('R$ ', '')}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
    </div>
  )
}
