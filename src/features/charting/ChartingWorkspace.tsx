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

type SuggestionLifecycle = 'none' | 'active' | 'accepted' | 'dismissed'

function getInitialDraft(patient: Patient, category?: NoteCategory): PatientDraft {
  const selectedCategory = category ?? patient.evidence[0]?.category ?? '일반'
  const evidence = patient.evidence.find((item) => item.category === selectedCategory)

  return {
    category: selectedCategory,
    narrative: evidence
      ? `S: ${evidence.subjective}\nO: ${evidence.detail}`
      : 'S: \nO: ',
    timestamp: evidence?.timestamp ?? '21:45',
  }
}

export function ChartingWorkspace() {
  const [query, setQuery] = useState('')
  const [patientFilter, setPatientFilter] = useState<'all' | 'needs-review'>('all')
  const [selectedPatientId, setSelectedPatientId] = useState(syntheticPatients[0].id)
  const [draft, setDraft] = useState(() => getInitialDraft(syntheticPatients[0]))
  const [suggestionLifecycle, setSuggestionLifecycle] = useState<SuggestionLifecycle>(() =>
    getSuggestion(getInitialDraft(syntheticPatients[0]).category, syntheticPatients[0].evidence)
      ? 'active'
      : 'none',
  )
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
  const activeSuggestion = suggestionLifecycle === 'active' ? suggestion : null
  const acceptedSuggestion = suggestionLifecycle === 'accepted' ? suggestion : null
  const linkedSuggestion = activeSuggestion ?? acceptedSuggestion
  const soapCompletion = activeSuggestion
    ? `A: ${activeSuggestion.completion}\nP: 상태 확인 결과를 간호사가 검토 후 기록함.`
    : ''
  const linkedEvidenceIds = new Set(linkedSuggestion?.evidenceIds ?? [])
  const visibleEvidence = evidenceExpanded
    ? selectedPatient.evidence
    : selectedPatient.evidence.filter((evidence) => linkedEvidenceIds.has(evidence.id))
  const editorDescription = [
    activeSuggestion ? 'active-soap-suggestion' : '',
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
    const nextDraft = getInitialDraft(patient)
    setDraft(nextDraft)
    setSuggestionLifecycle(getSuggestion(nextDraft.category, patient.evidence) ? 'active' : 'none')
    setEvidenceExpanded(false)
    setFeedback('')
    setValidationErrors([])
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape' && activeSuggestion) {
      setSuggestionLifecycle('dismissed')
      return
    }

    if (
      event.key !== 'Tab' ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !activeSuggestion
    ) {
      return
    }

    event.preventDefault()
    setDraft((currentDraft) => ({
      ...currentDraft,
      narrative: `${currentDraft.narrative}\n${soapCompletion}`,
    }))
    setSuggestionLifecycle('accepted')
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
      signatureState: 'unsigned-demo',
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
              {activeSuggestion ? <StatusChip tone="ai" /> : null}
              {acceptedSuggestion ? <StatusChip tone="accepted" /> : null}
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
                    const category = event.target.value as NoteCategory

                    const nextDraft = getInitialDraft(selectedPatient, category)

                    setDraft(nextDraft)
                    setSuggestionLifecycle(
                      getSuggestion(category, selectedPatient.evidence) ? 'active' : 'none',
                    )
                    setEvidenceExpanded(false)
                    setFeedback('')
                    setValidationErrors([])
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
                  if (suggestionLifecycle === 'active') {
                    setSuggestionLifecycle('dismissed')
                  }
                }}
                onKeyDown={handleEditorKeyDown}
                rows={5}
                value={draft.narrative}
              />
              {activeSuggestion ? (
                <div
                  aria-label="활성 AI 제안"
                  className="narrative-editor__suggestion"
                  id="active-soap-suggestion"
                >
                  <span>A: {activeSuggestion.completion}</span>
                  <span>P: 상태 확인 결과를 간호사가 검토 후 기록함.</span>
                </div>
              ) : null}
            </div>
            <div className="note-composer__footer">
              {activeSuggestion ? (
                <div className="note-composer__keyboard" aria-label="AI 제안 키보드 동작">
                  <KeyboardHint action="accept" />
                  <KeyboardHint action="dismiss" />
                </div>
              ) : null}
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
            {activeSuggestion ? <StatusChip tone="ai" /> : null}
            {acceptedSuggestion ? <StatusChip tone="accepted" /> : null}
          </header>
          <p>
            {activeSuggestion
              ? `현재 자동완성 근거 기록 ${activeSuggestion.evidenceIds.length}개`
              : acceptedSuggestion
                ? `채택한 AI 문장 근거 기록 ${acceptedSuggestion.evidenceIds.length}개`
                : '활성 제안 없음'}
          </p>
          <div className="safety-notice">
            <strong>데모 환경 · 합성 데이터</strong>
            <span>제안은 확인·수정 후에만 간호기록에 반영됩니다.</span>
          </div>
          <div className="evidence-rail__list">
            {visibleEvidence.map((evidence) => (
              <EvidenceItem
                evidence={evidence}
                key={evidence.id}
                linkageLabel={
                  linkedEvidenceIds.has(evidence.id)
                    ? activeSuggestion
                      ? '현재 자동완성 근거'
                      : '채택한 AI 문장 근거'
                    : undefined
                }
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
