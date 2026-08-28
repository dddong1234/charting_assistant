import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('exposes the Charting Copilot banner and nurse work landmarks', () => {
    render(<App />)

    expect(screen.getByRole('banner', { name: 'Charting Copilot' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '환자 목록' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'SOAP 작성 공간' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '제안 근거' })).toBeInTheDocument()
  })
})
