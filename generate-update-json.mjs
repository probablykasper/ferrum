import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const package_json = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))

const update_json = {
	// In the future we can create a stable-1 channel, to avoid notifying users about versions they shouldn't upgrade to. For example if their OS becomes unsupported, or If we decide to drop version migration logic.
	'stable-0': {
		url: package_json.updates_url_prefix + '/v' + package_json.version,
		version: 'v' + package_json.version,
	},
}

console.log('Generating update.json: \n%o', update_json)

const build_dir = path.join(__dirname, 'build')
fs.mkdirSync(build_dir, { recursive: true })
fs.writeFileSync(path.join(build_dir, 'update.json'), JSON.stringify(update_json, null, '\t'))
