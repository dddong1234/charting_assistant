import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/Button'
import { EvidenceItem } from '../../components/EvidenceItem'
import { KeyboardHint } from '../../components/KeyboardHint'
import { NursingNoteCard } from '../../components/NursingNoteCard'
import { PatientListItem } from '../../components/PatientListItem'
import { StatusChip } from '../../components/StatusChip'
import { syntheticPatients } from '../../data/syntheticPatients'
import {
  getSuggestion,
  insertChronologically,
  validateDraft,
  type NoteCategory,
  type NursingNote,
  type Patient,
} from '../../domain/charting'
import './charting-workspace.css'

interface PatientDraft {
  category: NoteCategory
  narrative: string
  timestamp: string
}

function getInitialDraft(patient: Patient): PatientDraft {
  const evidence = patient.evidence[0]

  return {
    category: evidence?.category ?? '일반',
    narrative: evidence
      ? `S: [간호사 확인 필요]\nO: ${evidence.detail}`
      : 'S: [간호사 확인 필요]\nO: [객관적 차트 사실 확인 필요]',
    timestamp: evidence?.timestamp ?? '21:45',
  }
}

export function ChartingWorkspace() {
  const [query, setQuery] = useState('')
  const [patientFilter, setPatientFilter] = useState<'all' | 'needs-review'>('all')
  const [selectedPatientId, setSelectedPatientId] = useState(syntheticPatients[0].id)
  const [draft, setDraft] = useState(() => getInitialDraft(syntheticPatients[0]))
  const [suggestionVisible, setSuggestionVisible] = useState(true)
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const validationRef = useRef<HTMLDivElement>(null)
  const [notesByPatient, setNotesByPatient] = useState<Record<string, NursingNote[]>>(() =>
    Object.fromEntries(syntheticPatients.map((patient) => [patient.id, patient.notes])),
  )
  const selectedPatient =
    syntheticPatients.find((patient) => patient.id === selectedPatientId) ?? syntheticPatients[0]
  const selectedNotes = notesByPatient[selectedPatient.id] ?? []
  const suggestion = getSuggestion(draft.category, selectedPatient.evidence)
  const soapCompletion = suggestion
    ? `A: ${suggestion.completion}\nP: 상태 확인 결과를 간호사가 검토 후 기록함.`
    : ''
  const linkedEvidenceIds = new Set(suggestion?.evidenceIds ?? [])
  const visibleEvidence = evidenceExpanded
    ? selectedPatient.evidence
    : selectedPatient.evidence.filter((evidence) => linkedEvidenceIds.has(evidence.id))
  const editorDescription = [
    suggestion && suggestionVisible ? 'active-soap-suggestion' : '',
    validationErrors.length > 0 ? 'draft-validation-feedback' : '',
  ].filter(Boolean).join(' ') || undefined
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')

    return syntheticPatients.filter((patient) => {
      const matchesQuery =
        !normalizedQuery ||
        `${patient.bed} ${patient.name}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      const matchesFilter = patientFilter === 'all' || patient.status !== 'stable'

      return matchesQuery && matchesFilter
    })
  }, [patientFilter, query])

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationRef.current?.focus()
    }
  }, [validationErrors])

  function selectPatient(patientId: Patient['id']) {
    const patient = syntheticPatients.find((candidate) => candidate.id === patientId)

    if (!patient) {
      return
    }

    setSelectedPatientId(patientId)
    setDraft(getInitialDraft(patient))
    setSuggestionVisible(true)
    setEvidenceExpanded(false)
    setFeedback('')
    setValidationErrors([])
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape' && suggestion && suggestionVisible) {
      setSuggestionVisible(false)
      return
    }

    if (event.key !== 'Tab' || !suggestion || !suggestionVisible) {
      return
    }

    event.preventDefault()
    setDraft((currentDraft) => ({
      ...currentDraft,
      narrative: `${currentDraft.narrative}\n${soapCompletion}`,
    }))
    setSuggestionVisible(false)
  }

  function addNote() {
    const validation = validateDraft(draft)

    if (!validation.valid) {
      setFeedback('')
      setValidationErrors(validation.errors)
      return
    }

    const newNote: NursingNote = {
      id: `${selectedPatient.id}-${draft.timestamp}-${selectedNotes.length + 1}`,
      timestamp: draft.timestamp,
      category: draft.category,
      narrative: draft.narrative,
      nurseSignature: 'RN 김하늘',
    }

    setNotesByPatient((currentNotes) => ({
      ...currentNotes,
      [selectedPatient.id]: insertChronologically(
        currentNotes[selectedPatient.id] ?? [],
        newNote,
      ),
    }))
    setValidationErrors([])
    setFeedback(`${draft.timestamp} SOAP 간호기록 1건을 추가했습니다.`)
  }

  function saveDraft() {
    setValidationErrors([])
    setFeedback(`${selectedPatient.bed} 환자의 작성 중인 기록을 임시 저장했습니다.`)
  }

  function saveRecords() {
    setValidationErrors([])
    setFeedback(
      `${selectedPatient.bed} 환자의 간호기록 ${selectedNotes.length}건을 저장했습니다.`,
    )
  }

  return (
    <div className="charting-workspace">
      <header aria-label="Charting Copilot" className="app-header">
        <div className="app-header__brand">
          <span aria-hidden="true" className="app-header__mark" />
          <span>Charting Copilot</span>
        </div>
        <div className="app-header__shift">
          <strong>일반외과 12병동 · Evening 근무 · 간호기록</strong>
          <span>합성 환자 6명 · 데모 기준 21:45</span>
        </div>
        <div className="app-header__actions">
          <Button onClick={saveDraft} size="medium" variant="secondary">임시 저장</Button>
          <Button onClick={saveRecords} size="medium">기록 저장</Button>
        </div>
      </header>

      <div className="workspace-body">
        <nav aria-label="환자 목록" className="patient-rail">
          <h2>환자 목록</h2>
          <label className="field-label" htmlFor="patient-search">환자 검색</label>
          <input
            id="patient-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="환자명 또는 병상 검색"
            type="search"
            value={query}
          />
          <div className="patient-rail__filters" aria-label="환자 필터">
            <button
              aria-pressed={patientFilter === 'all'}
              onClick={() => setPatientFilter('all')}
              type="button"
            >
              전체 6
            </button>
            <button
              aria-pressed={patientFilter === 'needs-review'}
              onClick={() => setPatientFilter('needs-review')}
              type="button"
            >
              확인 필요 3
            </button>
          </div>
          <div className="patient-rail__list">
            {visiblePatients.map((patient) => (
              <PatientListItem
                key={patient.id}
                onSelect={selectPatient}
                patient={patient}
                selected={patient.id === selectedPatient.id}
              />
            ))}
          </div>
        </nav>

        <main aria-label="SOAP 작성 공간" className="soap-workspace">
          <section className="patient-context" aria-labelledby="patient-context-title">
            <div>
              <h1 id="patient-context-title">
                {selectedPatient.bed} · {selectedPatient.name} · {selectedPatient.sex}/{selectedPatient.age}
              </h1>
              <p>
                POD#{selectedPatient.postoperativeDay} · {selectedPatient.surgery} · 담당 RN 김하늘
              </p>
            </div>
            <StatusChip tone={selectedPatient.status} />
          </section>

          <div className="record-tabs" aria-label="기록 보기">
            <span aria-current="page">간호기록</span>
            <span>인계 요약</span>
          </div>

          <section className="note-composer" aria-labelledby="composer-title">
            <header className="note-composer__header">
              <h2 id="composer-title">새 SOAP 간호기록</h2>
              <StatusChip tone="ai" />
            </header>
            <div className="note-composer__metadata">
              <label>
                <span className="field-label">기록 시간</span>
                <input
                  onChange={(event) =>
                    setDraft((currentDraft) => ({ ...currentDraft, timestamp: event.target.value }))
                  }
                  type="time"
                  value={draft.timestamp}
                />
              </label>
              <label>
                <span className="field-label">기록 분류</span>
                <select
                  onChange={(event) => {
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      category: event.target.value as NoteCategory,
                    }))
                    setSuggestionVisible(true)
                    setEvidenceExpanded(false)
                  }}
                  value={draft.category}
                >
                  <option value="V/S">SOAP · V/S 및 일반 상태 변화</option>
                  <option value="PRN">SOAP · PRN 투약</option>
                  <option value="일반">SOAP · 일반 상태</option>
                </select>
              </label>
            </div>
            <label className="field-label" htmlFor={`narrative-${selectedPatient.id}`}>
              SOAP 간호기록 내용
            </label>
            <div className="narrative-editor">
              <textarea
                aria-describedby={editorDescription}
                aria-invalid={validationErrors.length > 0}
                id={`narrative-${selectedPatient.id}`}
                onChange={(event) => {
                  setDraft((currentDraft) => ({ ...currentDraft, narrative: event.target.value }))
                  setSuggestionVisible(false)
                }}
                onKeyDown={handleEditorKeyDown}
                rows={5}
                value={draft.narrative}
              />
              {suggestion && suggestionVisible ? (
                <div
                  aria-label="활성 AI 제안"
                  className="narrative-editor__suggestion"
                  id="active-soap-suggestion"
                >
                  <span>A: {suggestion.completion}</span>
                  <span>P: 상태 확인 결과를 간호사가 검토 후 기록함.</span>
                </div>
              ) : null}
            </div>
            <div className="note-composer__footer">
              <div className="note-composer__keyboard" aria-label="AI 제안 키보드 동작">
                <KeyboardHint action="accept" />
                <KeyboardHint action="dismiss" />
              </div>
              <Button onClick={addNote}>기록 추가</Button>
            </div>
            {validationErrors.length > 0 ? (
              <div
                className="validation-feedback"
                id="draft-validation-feedback"
                ref={validationRef}
                role="alert"
                tabIndex={-1}
              >
                {validationErrors.map((error) => <p key={error}>{error}</p>)}
              </div>
            ) : null}
            {feedback ? <p className="demo-feedback" role="status">{feedback}</p> : null}
          </section>

          <section aria-labelledby="timeline-title" className="timeline">
            <header className="timeline__header">
              <h2 id="timeline-title">오늘 간호기록</h2>
              <span>최근 기록순 · {selectedNotes.length}건</span>
            </header>
            <div className="timeline__list">
              {selectedNotes.map((note) => <NursingNoteCard key={note.id} note={note} />)}
            </div>
          </section>
        </main>

        <aside aria-label="제안 근거" className="evidence-rail">
          <header className="evidence-rail__header">
            <h2>제안 근거</h2>
            <StatusChip tone="ai" />
          </header>
          <p>현재 자동완성 문장에 사용된 기록 {suggestion?.evidenceIds.length ?? 0}개</p>
          <div className="safety-notice">
            <strong>데모 환경 · 합성 데이터</strong>
            <span>제안은 확인·수정 후에만 간호기록에 반영됩니다.</span>
          </div>
          <div className="evidence-rail__list">
            {visibleEvidence.map((evidence) => (
              <EvidenceItem
                evidence={evidence}
                key={evidence.id}
                linked={linkedEvidenceIds.has(evidence.id)}
                provenance={`간호기록 > ${evidence.label}`}
              />
            ))}
          </div>
          <Button
            onClick={() => setEvidenceExpanded((expanded) => !expanded)}
            size="medium"
            variant="secondary"
          >
            {evidenceExpanded ? '근거 접기' : '근거 전체 보기'}
          </Button>
        </aside>
      </div>
    </div>
  )
}
