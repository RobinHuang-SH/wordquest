import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(projectRoot, 'dist')

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = join(directory, entry.name)
      return entry.isDirectory() ? collectFiles(fullPath) : fullPath
    }),
  )
  return files.flat()
}

const files = (await collectFiles(distDir)).filter((file) => !file.endsWith(sep + 'sw.js'))
const hash = createHash('sha256')
for (const file of files) {
  hash.update(relative(distDir, file))
  hash.update(await readFile(file))
}
const version = hash.digest('hex').slice(0, 12)
const urls = Array.from(
  new Set(['/', ...files.map((file) => '/' + relative(distDir, file).split(sep).join('/'))]),
).sort()

const template = await readFile(join(projectRoot, 'scripts/service-worker.template'), 'utf8')
const source = template
  .replace('__WORDQUEST_VERSION__', JSON.stringify(version))
  .replace('__WORDQUEST_APP_SHELL__', JSON.stringify(urls, null, 2))

await writeFile(join(distDir, 'sw.js'), source, 'utf8')
console.log('Generated service worker ' + version + ' with ' + urls.length + ' precached URLs')
