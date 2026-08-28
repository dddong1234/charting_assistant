import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const distDirectory = resolve('dist')
const indexPath = resolve(distDirectory, 'index.html')
const assetsDirectory = resolve(distDirectory, 'assets')
const failures = []

if (!existsSync(indexPath)) {
  failures.push('Missing production entry point: dist/index.html')
}

const assetFiles = existsSync(assetsDirectory)
  ? readdirSync(assetsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  : []

if (assetFiles.length === 0) {
  failures.push('Missing bundled assets: dist/assets must contain production files')
}

if (existsSync(indexPath) && assetFiles.length > 0) {
  const indexSource = readFileSync(indexPath, 'utf8')
  const bundledAssets = assetFiles.filter((fileName) => ['.css', '.js'].includes(extname(fileName)))
  const referencedAssets = bundledAssets.filter((fileName) => indexSource.includes(`/assets/${fileName}`))

  for (const requiredExtension of ['.js', '.css']) {
    if (!bundledAssets.some((fileName) => extname(fileName) === requiredExtension)) {
      failures.push(`Missing ${requiredExtension} production bundle in dist/assets`)
    }
  }

  if (bundledAssets.length === 0 || referencedAssets.length !== bundledAssets.length) {
    failures.push('Bundled JavaScript and CSS assets must be referenced by dist/index.html')
  }
}

if (failures.length > 0) {
  console.error('Build artifact verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log(`Build artifact verification passed: dist/index.html references ${assetFiles.length} bundled assets.`)
}
