import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const stylesheetPaths = [
  new URL('../src/styles/tokens.css', import.meta.url),
  new URL('../src/components/components.css', import.meta.url),
  new URL('../src/features/charting/charting-workspace.css', import.meta.url),
]
const stylesheetSource = stylesheetPaths
  .map((stylesheetPath) => readFileSync(stylesheetPath, 'utf8'))
  .join('\n')
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

function readPixelValue(value, tokenRule) {
  const tokenMatch = value.trim().match(/^var\((--[^)]+)\)$/)
  const resolvedValue = tokenMatch
    ? tokenRule.style.getPropertyValue(tokenMatch[1]).trim()
    : value.trim()
  const pixelMatch = resolvedValue.match(/^(\d+)px$/)

  return pixelMatch ? Number(pixelMatch[1]) : null
}

const buttonRule = requireRule('.ui-button')
const hoverRule = requireRule('.ui-button:hover:not(:disabled)')
const disabledRule = requireRule('.ui-button:disabled')
const focusSelector = '.ui-button:focus-visible,\n.patient-list-item:focus-visible'
const focusRule = requireRule(focusSelector)
const tokenRule = requireRule(':root')
const headerRule = requireRule('.app-header')
const mediumButtonRule = requireRule('.ui-button--medium')

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

if (tokenRule && headerRule && buttonRule && mediumButtonRule) {
  const headerHeightToken = tokenRule.style
    .getPropertyValue('--layout-app-header-height')
    .trim()
  const headerHeightDeclaration = headerRule.style.getPropertyValue('height').trim()
  const headerPaddingDeclaration =
    headerRule.style.getPropertyValue('padding').trim().split(/\s+/)[0] ?? ''
  const headerHeight = readPixelValue(headerHeightDeclaration, tokenRule)
  const headerVerticalPadding = readPixelValue(headerPaddingDeclaration, tokenRule)
  const buttonLineHeight = readPixelValue(
    buttonRule.style.getPropertyValue('line-height'),
    tokenRule,
  )
  const buttonVerticalPadding = readPixelValue(
    mediumButtonRule.style.getPropertyValue('padding').trim().split(/\s+/)[0] ?? '',
    tokenRule,
  )
  const strokeWidth = readPixelValue(
    tokenRule.style.getPropertyValue('--stroke-default'),
    tokenRule,
  )

  if (headerRule.style.getPropertyValue('box-sizing') !== 'border-box') {
    failures.push('app header must use border-box geometry.')
  }

  if (headerHeightDeclaration !== 'var(--layout-app-header-height)') {
    failures.push(
      `app header height must use --layout-app-header-height; received ${headerHeightDeclaration || '(empty)'}`,
    )
  }

  if (
    !headerHeightToken ||
    headerHeight === null ||
    headerVerticalPadding === null ||
    buttonLineHeight === null ||
    buttonVerticalPadding === null ||
    strokeWidth === null
  ) {
    failures.push('app header geometry must resolve from pixel-valued semantic tokens.')
  } else {
    const headerContentHeight = headerHeight - (headerVerticalPadding * 2) - strokeWidth
    const mediumButtonHeight = buttonLineHeight + (buttonVerticalPadding * 2) + (strokeWidth * 2)

    if (mediumButtonHeight > headerContentHeight) {
      failures.push(
        `medium button height ${mediumButtonHeight}px exceeds app header content height ${headerContentHeight}px.`,
      )
    }
  }
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
