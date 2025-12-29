import { LRCMessage } from './LRCMessage.js'
import { ModuleInstance } from './main.js'
import { ImagineLRCDest, ImagineLRCSalvo, ImagineLRCSource, LRCEntityType } from './types.js'

export class LRCHandlers {
	static handleProtocolUpdate(message: LRCMessage, module: ModuleInstance): void {
		const proto = message.argument('NAME')
		if (proto) {
			module.log('info', `Connected to host running: ${proto.value}`)
			module.setVariableValues({ protocol_name: proto.value })
		}

		const ver = message.argument('VERSION')
		if (ver) {
			module.log('info', `Connected to host conforming to LRC version ${ver.value}`)
			module.setVariableValues({ protocol_version: ver.value })
			if (ver.value === '1.0') {
				module.log(
					'warn',
					`Connected to a router running old LRC version ${ver.value}. Not all features may be supported!`,
				)
			}
		}
	}

	static handleSourceUpdates(message: LRCMessage, module: ModuleInstance): void {
		const count = message.argument('COUNT')
		if (count) {
			module.log('info', `Source Count Updated: ${count.value}`)
		}

		const id = message.argument('I')
		const name = message.argument('NAME')
		if (id) {
			const existSrcByID = module.state.resolveTarget(LRCEntityType.SRC, id.value)
			if (existSrcByID) {
				existSrcByID.label = `${name?.value}`
			} else {
				module.state.sources.push(<ImagineLRCSource>{
					id: id.value,
					label: name ? name.value : '',
				})
			}
		}
	}

	static handleDestUpdates(message: LRCMessage, module: ModuleInstance): void {
		const count = message.argument('COUNT')
		if (count) {
			module.log('info', `Destination Count Updated: ${count.value}`)
		}

		const id = message.argument('I')
		const name = message.argument('NAME')
		if (id) {
			const existDestByID = module.state.resolveTarget(LRCEntityType.DEST, id.value)
			if (existDestByID) {
				existDestByID.label = `${name?.value}`
			} else {
				module.state.destinations.push(<ImagineLRCDest>{
					id: id.value,
					label: name ? name.value : '',
				})
			}
		}
	}

	static handleSalvoUpdates(message: LRCMessage, module: ModuleInstance): void {
		const salvoID = message.argument('ID')
		const salvoStatus = message.argument('V')

		if (salvoID && salvoStatus) {
			module.state.salvos.push(<ImagineLRCSalvo>{
				id: salvoID.value,
				label: salvoID.value,
				state: salvoStatus.value,
			})

			module.log('debug', `Added Salvo: ${salvoID.value}`)
		}
	}

	static handleXpointUpdates(message: LRCMessage, module: ModuleInstance): void {
		const dest = message.argument('D')
		const src = message.argument('S')
		if (dest && src) {
			const existingDest = module.state.resolveTarget(LRCEntityType.DEST, dest.value)
			const existingSrc = module.state.resolveTarget(LRCEntityType.SRC, src.value)
			if (existingDest && existingSrc) {
				existingDest.source = {
					id: existingSrc.id,
					label: existingSrc.label,
				}
				module.updateVariables(module, [existingDest])
			}
		}
	}
}
