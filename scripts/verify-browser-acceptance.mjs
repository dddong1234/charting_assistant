import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const targetUrl = process.env.ACCEPTANCE_URL ?? 'http://127.0.0.1:4175/'
const debuggingPort = Number(process.env.ACCEPTANCE_DEBUG_PORT ?? '9335')
const browserCandidates = [
  process.env.BROWSER_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const browserBinary = browserCandidates.find((candidate) => existsSync(candidate))

assert(browserBinary, 'Set BROWSER_BIN to an installed Chromium browser executable.')

const screenshotDirectory = resolve('docs/verification/screenshots')
mkdirSync(screenshotDirectory, { recursive: true })

const userDataDirectory = mkdtempSync(join(tmpdir(), 'charting-copilot-acceptance-'))
const browserProcess = spawn(
  browserBinary,
  [
    '--headless=new',
    `--remote-debugging-port=${debuggingPort}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDirectory}`,
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-features=Translate',
    '--no-default-browser-check',
    '--no-first-run',
    '--force-device-scale-factor=1',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
)

let browserStderr = ''
browserProcess.stderr.on('data', (chunk) => {
  browserStderr = `${browserStderr}${chunk}`.slice(-4000)
})

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

function isLoopbackOrInlineUrl(rawUrl) {
  const url = new URL(rawUrl)

  if (!['http:', 'https:'].includes(url.protocol)) {
    return true
  }

  return ['127.0.0.1', '::1', '[::1]', 'localhost'].includes(url.hostname)
}

async function waitForPageTarget() {
  const deadline = Date.now() + 10000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)
      const targets = await response.json()
      const pageTarget = targets.find((target) => target.type === 'page')

      if (pageTarget?.webSocketDebuggerUrl) {
        return pageTarget
      }
    } catch {
      // Browser startup is polled until the deadline.
    }

    await delay(100)
  }

  throw new Error(`Chromium DevTools did not become ready. ${browserStderr}`)
}

class DevToolsClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl)
    this.nextId = 1
    this.pendingCommands = new Map()
    this.eventListeners = new Map()
  }

  async connect() {
    await new Promise((resolveConnection, rejectConnection) => {
      this.socket.addEventListener('open', resolveConnection, { once: true })
      this.socket.addEventListener(
        'error',
        () => rejectConnection(new Error('Could not connect to Chromium DevTools.')),
        { once: true },
      )
    })

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)

      if (message.id) {
        const pending = this.pendingCommands.get(message.id)
        if (!pending) return

        this.pendingCommands.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }

      for (const listener of this.eventListeners.get(message.method) ?? []) {
        listener(message.params)
      }
    })
  }

  send(method, params = {}) {
    const id = this.nextId
    this.nextId += 1

    return new Promise((resolveCommand, rejectCommand) => {
      this.pendingCommands.set(id, { reject: rejectCommand, resolve: resolveCommand })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, listener) {
    const listeners = this.eventListeners.get(method) ?? []
    listeners.push(listener)
    this.eventListeners.set(method, listeners)
  }

  waitFor(method, timeout = 10000) {
    return new Promise((resolveEvent, rejectEvent) => {
      const listener = (params) => {
        clearTimeout(timeoutId)
        const listeners = this.eventListeners.get(method) ?? []
        this.eventListeners.set(method, listeners.filter((candidate) => candidate !== listener))
        resolveEvent(params)
      }
      const timeoutId = setTimeout(() => {
        const listeners = this.eventListeners.get(method) ?? []
        this.eventListeners.set(method, listeners.filter((candidate) => candidate !== listener))
        rejectEvent(new Error(`Timed out waiting for ${method}.`))
      }, timeout)

      this.on(method, listener)
    })
  }

  close() {
    this.socket.close()
  }
}

const focusExpression = `(() => {
  const element = document.activeElement
  return {
    tag: element?.tagName ?? '',
    id: element?.id ?? '',
    text: element?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
    value: 'value' in element ? element.value : '',
  }
})()`

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })

  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text)
  }

  return response.result.value
}

async function navigate(client, suffix) {
  const loaded = client.waitFor('Page.loadEventFired')
  await client.send('Page.navigate', { url: `${targetUrl}?acceptance=${suffix}` })
  await loaded
  await delay(100)
}

async function setViewport(client, width, height) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await delay(100)
}

async function pressKey(client, key, options = {}) {
  const keyDefinitions = {
    Escape: { code: 'Escape', windowsVirtualKeyCode: 27 },
    Enter: {
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      text: '\r',
      unmodifiedText: '\r',
    },
    Tab: { code: 'Tab', windowsVirtualKeyCode: 9 },
  }
  const definition = keyDefinitions[key]
  const modifiers = options.shift ? 8 : 0

  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    modifiers,
    ...definition,
  })
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    modifiers,
    ...definition,
  })
  await delay(50)
}

async function tabUntil(client, predicate, maximumTabs = 30) {
  for (let count = 1; count <= maximumTabs; count += 1) {
    await pressKey(client, 'Tab')
    const focus = await evaluate(client, focusExpression)

    if (predicate(focus)) {
      return { count, focus }
    }
  }

  throw new Error(`Keyboard focus did not reach the requested control within ${maximumTabs} Tab presses.`)
}

async function saveScreenshot(client, fileName, fullPage = false) {
  const screenshotPath = resolve(screenshotDirectory, fileName)
  const params = { format: 'png', fromSurface: true, captureBeyondViewport: fullPage }

  if (fullPage) {
    const metrics = await client.send('Page.getLayoutMetrics')
    params.clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: metrics.cssContentSize.height,
      scale: 1,
    }
  }

  const screenshot = await client.send('Page.captureScreenshot', params)
  mkdirSync(dirname(screenshotPath), { recursive: true })
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'))
  return screenshotPath
}

const layoutExpression = `(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector)
    const box = element.getBoundingClientRect()
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      clientWidth: element.clientWidth,
    }
  }
  const controls = [...document.querySelectorAll('button, input, select, textarea')].map((element) => {
    const box = element.getBoundingClientRect()
    return {
      label: element.getAttribute('aria-label') || element.innerText || element.getAttribute('placeholder') || element.type,
      left: box.left,
      right: box.right,
      width: box.width,
    }
  })
  return {
    viewport: { width: innerWidth, height: innerHeight },
    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
    header: rect('.app-header'),
    patient: rect('.patient-rail'),
    workspace: rect('.soap-workspace'),
    evidence: rect('.evidence-rail'),
    composer: rect('.note-composer'),
    timeline: rect('.timeline'),
    controls,
  }
})()`

let client
const findings = {}

try {
  const pageTarget = await waitForPageTarget()
  client = new DevToolsClient(pageTarget.webSocketDebuggerUrl)
  await client.connect()
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Log.enable')
  await client.send('Network.enable')

  const browserErrors = []
  const requestsById = new Map()
  const applicationRequests = []
  const networkFailures = []
  const nonLoopbackApplicationRequests = []
  client.on('Runtime.exceptionThrown', (params) => browserErrors.push(params.exceptionDetails.text))
  client.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') {
      browserErrors.push({ source: entry.source, text: entry.text, url: entry.url ?? '' })
    }
  })
  client.on('Network.requestWillBeSent', ({ request, requestId, type }) => {
    const requestRecord = { type, url: request.url }
    requestsById.set(requestId, requestRecord)
    applicationRequests.push(requestRecord)
    if (!isLoopbackOrInlineUrl(request.url)) {
      nonLoopbackApplicationRequests.push(requestRecord)
    }
  })
  client.on('Network.loadingFailed', ({ canceled, errorText, requestId, type }) => {
    networkFailures.push({
      canceled,
      errorText,
      type,
      url: requestsById.get(requestId)?.url ?? '',
    })
  })

  await setViewport(client, 1440, 1024)
  await navigate(client, 'desktop-1440')
  const layout1440 = await evaluate(client, layoutExpression)

  assert.equal(layout1440.header.height, 64)
  assert.equal(layout1440.patient.width, 288)
  assert.equal(layout1440.workspace.width, 816)
  assert.equal(layout1440.evidence.width, 336)
  assert.equal(layout1440.composer.width, 720)
  assert.equal(layout1440.patient.left, 0)
  assert.equal(layout1440.patient.right, layout1440.workspace.left)
  assert.equal(layout1440.workspace.right, layout1440.evidence.left)
  assert.equal(layout1440.evidence.right, layout1440.document.clientWidth)
  assert(Math.abs(
    (layout1440.composer.left + layout1440.composer.width / 2) -
      (layout1440.workspace.left + layout1440.workspace.width / 2),
  ) <= 1, 'The authoring column must be centered in the flexible workspace.')
  assert(layout1440.timeline.top < 1024, 'The timeline must be visible at 1440×1024.')
  assert(layout1440.evidence.left >= 0 && layout1440.evidence.right <= 1440)
  findings.desktop1440 = layout1440
  findings.screenshot1440 = await saveScreenshot(client, 'mvp-1440x1024.png')

  await setViewport(client, 1366, 768)
  await navigate(client, 'desktop-1366')
  const layout1366 = await evaluate(client, layoutExpression)
  const clipped1366 = layout1366.controls.filter(
    (control) => control.left < 0 || control.right > layout1366.document.clientWidth,
  )
  const expectedResponsiveComposerWidth = layout1366.workspace.clientWidth - 48
  const responsiveWorkspaceCenter =
    layout1366.workspace.left + layout1366.workspace.clientWidth / 2
  const responsiveComposerCenter =
    layout1366.composer.left + layout1366.composer.width / 2

  assert.equal(layout1366.patient.width, 288)
  assert.equal(layout1366.evidence.width, 336)
  assert.equal(layout1366.workspace.width, 742)
  assert.equal(layout1366.patient.left, 0)
  assert.equal(layout1366.patient.right, layout1366.workspace.left)
  assert.equal(layout1366.workspace.right, layout1366.evidence.left)
  assert.equal(layout1366.evidence.right, layout1366.document.clientWidth)
  assert.equal(layout1366.composer.width, expectedResponsiveComposerWidth)
  assert.equal(layout1366.composer.left, layout1366.workspace.left + 24)
  assert.equal(
    layout1366.composer.right,
    layout1366.workspace.left + layout1366.workspace.clientWidth - 24,
  )
  assert(
    Math.abs(responsiveComposerCenter - responsiveWorkspaceCenter) <= 1,
    'The responsive composer must be centered in the usable flexible workspace.',
  )
  assert(layout1366.composer.left >= layout1366.workspace.left)
  assert(
    layout1366.composer.right <=
      layout1366.workspace.left + layout1366.workspace.clientWidth,
  )
  assert(layout1366.document.scrollWidth <= layout1366.document.clientWidth)
  assert.deepEqual(clipped1366, [])
  findings.desktop1366 = { ...layout1366, clippedControls: clipped1366 }
  findings.screenshot1366 = await saveScreenshot(client, 'mvp-1366x768.png')

  await setViewport(client, 390, 844)
  await navigate(client, 'narrow-390')
  const narrow = await evaluate(client, `(() => {
    const top = (selector) => document.querySelector(selector).getBoundingClientRect().top
    const withinWidth = (element) => {
      const box = element.getBoundingClientRect()
      return box.left >= 0 && box.right <= document.documentElement.clientWidth
    }
    const actionLabels = ['임시 저장', '기록 저장', '기록 추가', '근거 전체 보기']
    const actions = actionLabels.map((label) => {
      const element = [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === label)
      return { label, present: Boolean(element), withinWidth: element ? withinWidth(element) : false }
    })
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      order: {
        patient: top('.patient-rail'),
        workspace: top('.soap-workspace'),
        evidence: top('.evidence-rail'),
      },
      actions,
      searchPresent: Boolean(document.querySelector('input[type="search"]')),
      editorPresent: Boolean(document.querySelector('textarea')),
      evidencePresent: Boolean(document.querySelector('.evidence-rail__list')),
    }
  })()`)

  assert(narrow.scrollWidth <= narrow.clientWidth)
  assert(narrow.order.patient < narrow.order.workspace)
  assert(narrow.order.workspace < narrow.order.evidence)
  assert(narrow.actions.every((action) => action.present && action.withinWidth))
  assert(narrow.searchPresent && narrow.editorPresent && narrow.evidencePresent)
  findings.narrow = narrow
  findings.screenshotNarrow = await saveScreenshot(client, 'mvp-narrow-390x844-full.png', true)

  await setViewport(client, 1440, 1024)
  await navigate(client, 'keyboard-accept')
  const editorFocus = await tabUntil(client, (focus) => focus.tag === 'TEXTAREA')
  const focusStyle = await evaluate(client, `(() => {
    const style = getComputedStyle(document.activeElement)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor }
  })()`)
  assert.equal(focusStyle.outlineStyle, 'solid')
  assert.equal(focusStyle.outlineWidth, '2px')
  const beforeAccept = await evaluate(client, `document.querySelector('textarea').value`)
  assert(!beforeAccept.includes('\nA:'))
  await pressKey(client, 'Tab')
  const accepted = await evaluate(client, `(() => ({
    value: document.querySelector('textarea').value,
    suggestionPresent: Boolean(document.querySelector('[aria-label="활성 AI 제안"]')),
    keyboardActionsPresent: Boolean(document.querySelector('[aria-label="AI 제안 키보드 동작"]')),
    composerStatuses: [...document.querySelectorAll('.note-composer .status-chip')]
      .map((element) => element.innerText.trim()),
    evidenceStatuses: [...document.querySelectorAll('.evidence-rail .status-chip')]
      .map((element) => element.innerText.trim()),
    evidenceSummary: document.querySelector('.evidence-rail > p')?.innerText ?? '',
    linkageLabels: [...document.querySelectorAll('.evidence-item__linkage')]
      .map((element) => element.innerText.trim()),
    focus: document.activeElement.tagName,
  }))()`)
  assert(accepted.value.includes('\nA:'))
  assert(accepted.value.includes('\nP:'))
  assert.equal(accepted.suggestionPresent, false)
  assert.equal(accepted.keyboardActionsPresent, false)
  assert.deepEqual(accepted.composerStatuses, ['AI 문장 채택됨'])
  assert.deepEqual(accepted.evidenceStatuses, ['AI 문장 채택됨'])
  assert.equal(accepted.evidenceSummary, '채택한 AI 문장 근거 기록 1개')
  assert.deepEqual(accepted.linkageLabels, ['채택한 AI 문장 근거'])
  assert.equal(accepted.focus, 'TEXTAREA')
  findings.keyboardAccept = { editorFocus, focusStyle, accepted }

  await navigate(client, 'keyboard-dismiss')
  await tabUntil(client, (focus) => focus.tag === 'TEXTAREA')
  const beforeDismiss = await evaluate(client, `document.querySelector('textarea').value`)
  await pressKey(client, 'Escape')
  const dismissed = await evaluate(client, `(() => ({
    value: document.querySelector('textarea').value,
    suggestionPresent: Boolean(document.querySelector('[aria-label="활성 AI 제안"]')),
    keyboardActionsPresent: Boolean(document.querySelector('[aria-label="AI 제안 키보드 동작"]')),
    composerStatuses: [...document.querySelectorAll('.note-composer .status-chip')]
      .map((element) => element.innerText.trim()),
    evidenceStatuses: [...document.querySelectorAll('.evidence-rail .status-chip')]
      .map((element) => element.innerText.trim()),
    evidenceSummary: document.querySelector('.evidence-rail > p')?.innerText ?? '',
    evidenceCount: document.querySelectorAll('.evidence-rail__list article').length,
    linkageCount: document.querySelectorAll('.evidence-item__linkage').length,
    focus: document.activeElement.tagName,
  }))()`)
  assert.equal(dismissed.value, beforeDismiss)
  assert.equal(dismissed.suggestionPresent, false)
  assert.equal(dismissed.keyboardActionsPresent, false)
  assert.deepEqual(dismissed.composerStatuses, [])
  assert.deepEqual(dismissed.evidenceStatuses, [])
  assert.equal(dismissed.evidenceSummary, '활성 제안 없음')
  assert.equal(dismissed.evidenceCount, 0)
  assert.equal(dismissed.linkageCount, 0)
  assert.equal(dismissed.focus, 'TEXTAREA')
  findings.keyboardDismiss = dismissed

  await navigate(client, 'keyboard-shift-tab')
  await tabUntil(client, (focus) => focus.tag === 'TEXTAREA')
  await pressKey(client, 'Tab', { shift: true })
  const shifted = await evaluate(client, focusExpression)
  assert.equal(shifted.tag, 'SELECT')
  const pendingAfterShiftTab = await evaluate(
    client,
    `Boolean(document.querySelector('[aria-label="활성 AI 제안"]'))`,
  )
  assert.equal(pendingAfterShiftTab, true)
  findings.keyboardShiftTab = { focus: shifted, suggestionPending: pendingAfterShiftTab }

  await navigate(client, 'keyboard-add-record')
  const patientFocus = await tabUntil(
    client,
    (focus) => focus.tag === 'BUTTON' && focus.text.includes('1204-1'),
  )
  await pressKey(client, 'Enter')
  const selectedHeading = await evaluate(client, `document.querySelector('.patient-context h1').innerText`)
  assert(
    selectedHeading.includes('1204-1'),
    `Patient selection did not update: ${JSON.stringify({ patientFocus, selectedHeading })}`,
  )
  await tabUntil(client, (focus) => focus.tag === 'TEXTAREA')
  await pressKey(client, 'Tab')
  await pressKey(client, 'Tab')
  const addButtonFocus = await evaluate(client, focusExpression)
  assert(addButtonFocus.text.includes('기록 추가'))
  await pressKey(client, 'Enter')
  const addedRecord = await evaluate(client, `(() => ({
    feedback: document.querySelector('[role="status"]')?.innerText ?? '',
    timelineCount: document.querySelector('.timeline__header span')?.innerText ?? '',
    articleCount: document.querySelectorAll('.timeline article').length,
    firstArticle: document.querySelector('.timeline article')?.innerText ?? '',
    firstNarrative: document.querySelector('.timeline article .nursing-note-card__narrative')?.innerText ?? '',
    firstAccessibleName: document.querySelector('.timeline article')?.getAttribute('aria-label') ?? '',
    secondArticle: document.querySelectorAll('.timeline article')[1]?.innerText ?? '',
  }))()`)
  assert(addedRecord.feedback.includes('SOAP 간호기록 1건을 추가했습니다.'))
  assert(addedRecord.timelineCount.includes('2건'))
  assert.equal(addedRecord.articleCount, 2)
  assert.equal(addedRecord.firstAccessibleName, '20:00 일반 간호기록')
  assert(addedRecord.firstArticle.includes('데모 저장 · 서명 전'))
  assert(addedRecord.firstNarrative.includes('S: 수술 부위 당김감 경미하게 호소함.'))
  assert(!/\[[^\]]*(?:확인 필요|TODO)[^\]]*\]/i.test(addedRecord.firstNarrative))
  assert(addedRecord.secondArticle.includes('간호사 최○○ · 서명 완료'))
  findings.keyboardAddRecord = { patientFocus, selectedHeading, addButtonFocus, addedRecord }

  await navigate(client, 'accessibility-copy')
  const accessibilityCopy = await evaluate(client, `(() => ({
    statuses: [...document.querySelectorAll('.status-chip')].map((element) => element.innerText.trim()),
    safety: document.querySelector('.safety-notice').innerText.replace(/\\s+/g, ' ').trim(),
    landmarks: [...document.querySelectorAll('header[aria-label], nav[aria-label], main[aria-label], aside[aria-label]')]
      .map((element) => element.getAttribute('aria-label')),
  }))()`)
  assert(accessibilityCopy.statuses.includes('주의'))
  assert(accessibilityCopy.statuses.includes('AI 제안'))
  assert(accessibilityCopy.safety.includes('데모 환경 · 합성 데이터'))
  assert(accessibilityCopy.safety.includes('확인·수정 후에만'))
  assert.deepEqual(accessibilityCopy.landmarks, [
    'Charting Copilot',
    '환자 목록',
    'SOAP 작성 공간',
    '제안 근거',
  ])
  findings.accessibilityCopy = accessibilityCopy

  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  const reducedMotion = await evaluate(client, `(() => ({
    mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    editorTransition: getComputedStyle(document.querySelector('.narrative-editor')).transitionDuration,
    buttonTransition: getComputedStyle(document.querySelector('.ui-button')).transitionDuration,
  }))()`)
  assert.equal(reducedMotion.mediaMatches, true)
  for (const transition of [reducedMotion.editorTransition, reducedMotion.buttonTransition]) {
    assert(
      transition.split(',').every((duration) => Number.parseFloat(duration) <= 0.00001),
      `Unexpected reduced-motion transition: ${JSON.stringify(reducedMotion)}`,
    )
  }
  findings.reducedMotion = reducedMotion

  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'forced-colors', value: 'active' }],
  })
  const forcedColorEditorFocus = await tabUntil(client, (focus) => focus.tag === 'TEXTAREA')
  const forcedColors = await evaluate(client, `(() => ({
    mediaMatches: matchMedia('(forced-colors: active)').matches,
    focusToken: getComputedStyle(document.documentElement).getPropertyValue('--color-focus-forced').trim(),
    focusedElement: document.activeElement.tagName,
    outlineColor: getComputedStyle(document.activeElement).outlineColor,
    outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
    outlineWidth: getComputedStyle(document.activeElement).outlineWidth,
  }))()`)
  assert.equal(forcedColors.mediaMatches, true)
  assert.equal(forcedColors.focusToken, 'Highlight')
  assert.equal(forcedColors.focusedElement, 'TEXTAREA')
  assert.notEqual(forcedColors.outlineStyle, 'none')
  assert(Number.parseFloat(forcedColors.outlineWidth) > 0)
  assert(!['rgba(0, 0, 0, 0)', 'transparent'].includes(forcedColors.outlineColor))
  findings.forcedColors = { ...forcedColors, forcedColorEditorFocus }

  assert.deepEqual(networkFailures, [])
  assert.deepEqual(nonLoopbackApplicationRequests, [])
  findings.network = {
    applicationRequestCount: applicationRequests.length,
    failures: networkFailures,
    nonLoopbackApplicationRequests,
    urls: [...new Set(applicationRequests.map((request) => request.url))],
  }
  assert.deepEqual(browserErrors, [])
  findings.browserErrors = browserErrors

  console.log('Browser acceptance verification passed.')
  console.log(JSON.stringify(findings, null, 2))
} finally {
  client?.close()
  if (browserProcess.exitCode === null && browserProcess.signalCode === null) {
    const browserExited = new Promise((resolveExit) => browserProcess.once('exit', resolveExit))
    browserProcess.kill()
    await Promise.race([browserExited, delay(5000)])
  }

  const resolvedTemporaryRoot = resolve(tmpdir())
  const resolvedUserDataDirectory = resolve(userDataDirectory)
  assert(
    resolvedUserDataDirectory.startsWith(`${resolvedTemporaryRoot}\\`) &&
      resolvedUserDataDirectory.includes('charting-copilot-acceptance-'),
    'Refusing to remove an unexpected browser profile path.',
  )
  rmSync(resolvedUserDataDirectory, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  })
}
