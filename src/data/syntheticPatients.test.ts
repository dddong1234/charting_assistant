import { describe, expect, it } from 'vitest'
import { syntheticPatients } from './syntheticPatients'

describe('syntheticPatients', () => {
  it('provides six clearly synthetic general-surgery patients', () => {
    expect(syntheticPatients).toHaveLength(6)
    expect(syntheticPatients.every((patient) => patient.isSynthetic && patient.service === '일반외과')).toBe(true)
  })

  it('includes the approved selected patient and chart facts used in the demo', () => {
    const selected = syntheticPatients.find((patient) => patient.bed === '1203-2')

    expect(selected).toMatchObject({
      name: '김○○',
      sex: 'F',
      age: 68,
      postoperativeDay: 2,
    })
    expect(
      selected?.notes.map(({ timestamp, category }) => ({ timestamp, category })),
    ).toEqual([
      { timestamp: '19:00', category: '일반' },
      { timestamp: '14:00', category: 'V/S' },
    ])
    expect(selected?.evidence.map((item) => item.id)).toEqual(expect.arrayContaining([
      'kim-vs-1400',
      'kim-prn-2130',
    ]))
  })

  it('provides explicit safe subjective text and signed status for every fixture record', () => {
    const evidence = syntheticPatients.flatMap((patient) => patient.evidence)
    const notes = syntheticPatients.flatMap((patient) => patient.notes)

    expect(evidence.every((item) => item.subjective.trim() && !item.subjective.includes('['))).toBe(true)
    expect(notes.every((note) => note.signatureState === 'signed-fixture')).toBe(true)
  })
})
