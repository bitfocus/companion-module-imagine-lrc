import { LRCMessage } from './LRCMessage.js'
import { ModuleInstance } from './main.js'

export class LRCHandlers {
	static handleProtocolUpdate(message: LRCMessage, module: ModuleInstance): void {
		const proto = message.argument('NAME')
		if (proto) {
			module.log('debug', `Connected to host running: ${proto.value}`)
		}

		const ver = message.argument('VERSION')
		if (ver) {
			module.log('debug', `Connected to host conforming to LRC version ${ver.value}`)
			if (ver.value === '1.0') {
				module.log(
					'warn',
					`Connected to a router running old LRC version ${ver.value}. Not all features may be supported!`,
				)
			}
		}
	}

	static handleDestUpdates(message: LRCMessage, module: ModuleInstance): void {
		const count = message.argument('COUNT')
		if (count) {
			module.log('debug', `Destination Count Updated: ${count.value}`)
		}
	}

	static handleSalvoUpdates(message: LRCMessage, module: ModuleInstance): void {
		const count = message.argument('SALVO')
		if (count) {
			module.log('debug', `Destination Count Updated: ${count.value}`)
		}
		module.updatePresets()
	}
}
