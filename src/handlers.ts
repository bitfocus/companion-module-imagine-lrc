import { LRCMessage } from './LRCMessage.js'
import { ModuleInstance } from './main.js'
import {
	ImagineLRCChannel,
	ImagineLRCDest,
	ImagineLRCSalvo,
	ImagineLRCSource,
	LRCArgumentType,
	LRCEntityType,
} from './types.js'

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
			module.state.sources_count = parseInt(`${count.value}`, 10)
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
			module.state.destinations_count = parseInt(`${count.value}`, 10)
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
			const existingSalvo = module.state.resolveTarget(LRCEntityType.XSALVO, salvoID.value)
			if (existingSalvo) {
				existingSalvo.state = `${salvoStatus.value}`
				if (salvoID.type === LRCArgumentType.STRING) {
					existingSalvo.label = `${salvoID.value}`
				}
			} else {
				module.state.salvos.push(<ImagineLRCSalvo>{
					id: salvoID.value,
					label: `Salvo ${salvoID.value}`,
					state: `${salvoStatus.value}`,
				})
			}
		}
	}

	static handleChannelUpdates(message: LRCMessage, module: ModuleInstance): void {
		const index = message.argument('I')
		const name = message.argument('NAME')
		if (index && name) {
			const indexVal = index.value.toString()
			const nameVal = name.value.toString()

			if (indexVal.includes(',') || nameVal.includes(',')) {
				const indexVals = indexVal.split(',')
				const nameVals = nameVal.split(',')

				indexVals.forEach((index: string, i: number) => {
					module.state.channels.push(<ImagineLRCChannel>{
						id: parseInt(index, 10),
						label: nameVals[i],
					})
				})
			} else {
				const chan = module.state.resolveTarget(LRCEntityType.CHANNELS, index?.value)
				if (chan) {
					chan.label = `${name?.value}`
				} else {
					module.state.channels.push(<ImagineLRCChannel>{
						id: index.value,
						label: name?.value,
					})
				}
			}
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

	static handleLockUpdates(message: LRCMessage, module: ModuleInstance): void {
		const dest = message.argument('D')
		const state = message.argument('V')
		// const user = message.argument('U')

		if (dest) {
			const existingDest = module.state.resolveTarget(LRCEntityType.DEST, dest.value)
			if (existingDest) {
				existingDest.lock = `${state?.value}`
				module.updateVariables(module, [existingDest])
			}
		}
	}

	static handleProtectUpdates(message: LRCMessage, module: ModuleInstance): void {
		const dest = message.argument('D')
		const state = message.argument('V')
		// const user = message.argument('U')

		if (dest) {
			const existingDest = module.state.resolveTarget(LRCEntityType.DEST, dest.value)
			if (existingDest) {
				existingDest.protect = `${state?.value}`
				module.updateVariables(module, [existingDest])
			}
		}
	}
}
