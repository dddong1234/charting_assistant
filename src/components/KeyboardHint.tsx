import './components.css'

interface KeyboardHintProps {
  action: 'accept' | 'dismiss'
}

const keyboardActions = {
  accept: { key: 'Tab', label: '채택' },
  dismiss: { key: 'Esc', label: '닫기' },
} as const

export function KeyboardHint({ action }: KeyboardHintProps) {
  const hint = keyboardActions[action]

  return (
    <span className="keyboard-hint">
      <kbd className="keyboard-hint__keycap">{hint.key}</kbd>
      <span className="keyboard-hint__action">{hint.label}</span>
    </span>
  )
}
