import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const stylesheetPath = new URL('../src/components/components.css', import.meta.url)
const stylesheetSource = readFileSync(stylesheetPath, 'utf8')
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
const styleElement = dom.window.document.createElement('style')
styleElement.textContent = stylesheetSource
dom.window.document.head.append(styleElement)

const stylesheet = styleElement.sheet

if (!stylesheet) {
  throw new Error('Component stylesheet did not parse into CSSOM.')
}

const failures = []

function findStyleRule(rules, selector) {
  const normalizedSelector = selector.replace(/\s+/g, ' ').trim()

  for (const rule of Array.from(rules)) {
    if (
      'selectorText' in rule &&
      rule.selectorText.replace(/\s+/g, ' ').trim() === normalizedSelector
    ) {
      return rule
    }

    if ('cssRules' in rule) {
      const nestedRule = findStyleRule(rule.cssRules, selector)

      if (nestedRule) {
        return nestedRule
      }
    }
  }

  return null
}

function findMediaRule(conditionText) {
  return Array.from(stylesheet.cssRules).find(
    (rule) => 'conditionText' in rule && rule.conditionText === conditionText,
  )
}

function requireRule(selector, rules = stylesheet.cssRules) {
  const rule = findStyleRule(rules, selector)

  if (!rule) {
    failures.push(`Missing CSS rule: ${selector}`)
  }

  return rule
}

function requireToken(property, value, tokenPrefix) {
  if (!new RegExp(`^var\\(--${tokenPrefix}[^)]*\\)$`).test(value)) {
    failures.push(`${property} must use a --${tokenPrefix} semantic token; received ${value || '(empty)'}`)
  }
}

const buttonRule = requireRule('.ui-button')
const hoverRule = requireRule('.ui-button:hover:not(:disabled)')
const disabledRule = requireRule('.ui-button:disabled')
const focusSelector = '.ui-button:focus-visible,\n.patient-list-item:focus-visible'
const focusRule = requireRule(focusSelector)

if (buttonRule) {
  const transition = buttonRule.style.transition
  const tokenizedTransition =
    /^filter var\(--motion-duration-[^)]+\) var\(--motion-easing-[^)]+\)$/.test(transition)

  if (!tokenizedTransition) {
    failures.push(`button transition duration and easing must use semantic tokens; received ${transition}`)
  }
}

if (hoverRule) {
  requireToken('button hover filter', hoverRule.style.filter, 'filter-')
}

if (disabledRule) {
  requireToken('button disabled opacity', disabledRule.style.opacity, 'opacity-')
}

if (focusRule) {
  const outline = focusRule.style.outline

  if (
    !outline.includes('var(--focus-outline-width)') ||
    !outline.includes('var(--color-border-focus)')
  ) {
    failures.push(`focus outline must use semantic width and color tokens; received ${outline || '(empty)'}`)
  }

  requireToken(
    'focus outline offset',
    focusRule.style.getPropertyValue('outline-offset'),
    'focus-outline-offset',
  )
}

const forcedColorsRule = findMediaRule('(forced-colors: active)')

if (!forcedColorsRule) {
  failures.push('Missing @media (forced-colors: active) focus treatment.')
} else {
  const forcedFocusRule = requireRule(focusSelector, forcedColorsRule.cssRules)

  if (forcedFocusRule) {
    requireToken(
      'forced-colors focus outline color',
      forcedFocusRule.style.getPropertyValue('outline-color'),
      'color-focus-forced',
    )
  }
}

if (failures.length > 0) {
  console.error('Component CSS verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log('Component CSS verification passed.')
}
