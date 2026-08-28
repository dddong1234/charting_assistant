import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './components.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'small' | 'medium'
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  className = '',
  size = 'small',
  type = 'button',
  variant = 'primary',
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
