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
    expect(selected?.notes).toEqual(expect.arrayContaining([
      expect.objectContaining({ timestamp: '21:30', category: 'PRN' }),
      expect.objectContaining({ timestamp: '14:00', category: 'V/S' }),
    ]))
    expect(selected?.evidence.map((item) => item.id)).toEqual(expect.arrayContaining([
      'kim-vs-1400',
      'kim-prn-2130',
    ]))
  })
})
