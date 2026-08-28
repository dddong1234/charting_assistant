import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: process.cwd() })

describe('domain lint boundary', () => {
  it('rejects browser globals in domain source', async () => {
    const [result] = await eslint.lintText(
      'export const viewportWidth = window.innerWidth\n',
      { filePath: 'src/domain/browser-global.lint-fixture.ts' },
    )

    expect(result.errorCount).toBe(1)
  })

  it('rejects browser bootstrap imports in domain source', async () => {
    const [result] = await eslint.lintText(
      "import '../main'\nexport const recordKind = 'SOAP'\n",
      { filePath: 'src/domain/browser-bootstrap.lint-fixture.ts' },
    )

    expect(result.errorCount).toBe(1)
  })
})
