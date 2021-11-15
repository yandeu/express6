import { readFile, writeFile } from 'fs/promises'

const argv = process.argv.splice(2)
const [key, value] = argv

if (typeof key !== 'string' || typeof value !== 'string') {
  console.log('Please do "node script/testing.mjs <key> <value>"')
  process.exit(1)
}

const replace = async (key, value) => {
  const pkg = await readFile('package.json', { encoding: 'utf-8' })
  const json = JSON.parse(pkg)
  json[key] = value
  await writeFile('package.json', JSON.stringify(json, null, 2), { encoding: 'utf-8' })
}
replace(key, value)
