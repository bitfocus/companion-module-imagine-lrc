import type { ModuleInstance } from './main.js'
import {
	CrosspointFormat,
	LRCArgumentType,
	LRCConstants,
	LRCEntityType,
	LRCEntityTypeLabels,
	LRCOperation,
	LRCOperationLabels,
} from './types.js'
import { LRCMessage } from './LRCMessage.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		xpoint_take: {
			name: 'Crosspoint Take (XPOINT)',
			description: 'Request a crosspoint take for specified source, destination(s), and level(s)/channel(s)',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					tooltip: 'Specify a source by name (e.g. "SAT 1") or number (e.g. 6)',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.sources,
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Source Channel (Level)',
					id: 'source_level',
					tooltip: 'Specify a source level by index (e.g. 1) or name (e.g. "Video")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.channels,
					default: self.state.channels.length ? self.state.channels[0].id : '',
				},
				{
					type: 'multidropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be selected/entered if desired.' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					choices: self.state.destinations,
					default: [],
				},
				{
					type: 'dropdown',
					label: 'Destination Channel (Level)',
					id: 'destination_level',
					tooltip: 'Specify a destination level by index (e.g. 1) or name (e.g. "Video")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.channels,
					default: self.state.channels.length ? self.state.channels[0].id : '',
				},
			],
			callback: async (action) => {
				const message = new LRCMessage(LRCEntityType.XPOINT, LRCOperation.CHANGE_REQUEST)

				// Source
				const source = self.state.resolveTarget(LRCEntityType.SRC, `${action.options.source}`)

				if (!source) {
					self.log('warn', "Couldn't resolve source from input provided.")
					return
				}

				// Source Level
				const source_lvl = self.state.resolveTarget(LRCEntityType.CHANNELS, `${action.options.source_level}`)

				// Source + Level
				message.addArgument(
					'S',
					self.config.crosspoint_format === CrosspointFormat.Names ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					self.config.crosspoint_format === CrosspointFormat.Names
						? `${source.label}${source_lvl ? '.' + source_lvl.label : ''}`
						: `${source.id}${source_lvl ? '.' + source_lvl.id : ''}`,
				)

				// Destination(s)
				const dests = []
				if (action.options.destination && Array.isArray(action.options.destination)) {
					for (const target of action.options.destination) {
						const parsed_target = self.state.resolveTarget(LRCEntityType.DEST, target)
						dests.push(parsed_target)
					}
				}

				if (!self.config.allow_empty_xpoint_dest && dests.length === 0) {
					// Safeguard to prevent routing the given source to every destination
					// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
					self.log(
						'warn',
						"Empty destination safeguard prevented crosspoint preset. Couldn't resolve any destinations from input provided.",
					)
					return
				}

				// Dest Level
				const dest_level = self.state.resolveTarget(LRCEntityType.CHANNELS, `${action.options.destination_level}`)

				const destsParsed = dests.map((dest) =>
					self.config.crosspoint_format === CrosspointFormat.Numbers ? dest.id : dest.label,
				)

				let destsWithLevel

				if (dest_level) {
					destsWithLevel = destsParsed.map((dest) => {
						return self.config.crosspoint_format === CrosspointFormat.Numbers
							? `${dest}.${dest_level.id}`
							: `${dest}.${dest_level.label}`
					})
				}

				message.addArgument(
					'D',
					self.config.crosspoint_format === CrosspointFormat.Names ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					destsWithLevel ? destsWithLevel.join(',') : destsParsed.join(','),
				)

				self.connection.sendLRCMessage(message)
			},
		},
		xbuffer: {
			name: 'Crosspoint Buffer Control (XBUFFER)',
			description: 'Execute or clear crosspoint commands stored in the system buffer',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					tooltip: 'Select an action',
					minChoicesForSearch: 0,
					choices: [
						{ id: 'EXECUTE', label: 'Execute stored crosspoint commands' },
						{ id: 'CLEAR', label: 'Clear command crosspoint buffer' },
					],
					default: 'EXECUTE',
				},
			],
			callback: (action) => {
				const message = new LRCMessage(LRCEntityType.XBUFFER, LRCOperation.CHANGE_REQUEST)

				message.addArgument('F', LRCArgumentType.STRING, `${action.options.action}`)

				message.addArgument('U', LRCArgumentType.NUMERIC, self.config.user_id)

				self.connection.sendLRCMessage(message)
			},
		},
		xdisconnect: {
			name: 'Crosspoint Disconnect (XDISCONNECT)',
			description: 'Disconnect logical crosspoints',
			options: [
				{
					type: 'multidropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be selected/entered if desired.' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					choices: self.state.destinations,
					default: [],
				},
			],
			callback: async (action) => {
				const message = new LRCMessage(LRCEntityType.XDISCONNECT, LRCOperation.CHANGE_REQUEST)

				const xpreset_dests = []
				if (action.options.destination && Array.isArray(action.options.destination)) {
					for (const target of action.options.destination) {
						const parsed_target = self.state.resolveTarget(LRCEntityType.DEST, target)
						xpreset_dests.push(parsed_target)
					}
				}

				if (!self.config.allow_empty_xpoint_dest && xpreset_dests.length === 0) {
					// Safeguard to prevent routing the given source to every destination
					// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
					self.log(
						'warn',
						"Empty destination safeguard prevented crosspoint preset. Couldn't resolve any destinations from input provided.",
					)
					return
				}

				const destsParsed = xpreset_dests
					.map((dest) => (self.config.crosspoint_format === CrosspointFormat.Numbers ? dest.id : dest.label))
					.join(',')

				message.addArgument(
					'D',
					self.config.crosspoint_format === CrosspointFormat.Names ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					destsParsed,
				)

				message.addArgument('U', LRCArgumentType.NUMERIC, self.config.user_id)

				self.connection.sendLRCMessage(message)
			},
		},
		xpreset: {
			name: 'Crosspoint Preset (XPRESET)',
			description: 'Preset a crosspoint command in the system buffer',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					tooltip: 'Specify a source by name (e.g. "SAT 1") or number (e.g. 6)',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.sources,
					default: '',
				},
				{
					type: 'multidropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be selected/entered if desired.' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					choices: self.state.destinations,
					default: [],
				},
			],
			callback: async (action) => {
				const message = new LRCMessage(LRCEntityType.XPRESET, LRCOperation.CHANGE_REQUEST)

				const xpreset_source = self.state.resolveTarget(LRCEntityType.SRC, `${action.options.source}`)

				// TODO - Add validation that this resolves correctly

				message.addArgument(
					'S',
					self.config.crosspoint_format === CrosspointFormat.Names ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					self.config.crosspoint_format === CrosspointFormat.Names ? xpreset_source.label : xpreset_source.id,
				)

				const xpreset_dests = []
				if (action.options.destination && Array.isArray(action.options.destination)) {
					for (const target of action.options.destination) {
						const parsed_target = self.state.resolveTarget(LRCEntityType.DEST, target)
						xpreset_dests.push(parsed_target)
					}
				}

				if (!self.config.allow_empty_xpoint_dest && xpreset_dests.length === 0) {
					// Safeguard to prevent routing the given source to every destination
					// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
					self.log(
						'warn',
						"Empty destination safeguard prevented crosspoint preset. Couldn't resolve any destinations from input provided.",
					)
					return
				}

				const destsParsed = xpreset_dests
					.map((dest) => (self.config.crosspoint_format === CrosspointFormat.Numbers ? dest.id : dest.label))
					.join(',')

				message.addArgument(
					'D',
					self.config.crosspoint_format === CrosspointFormat.Names ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					destsParsed,
				)

				message.addArgument('U', LRCArgumentType.NUMERIC, self.config.user_id)

				self.connection.sendLRCMessage(message)
			},
		},
		salvo_exec: {
			name: 'Salvo Execution (XSALVO)',
			description: 'Execute crosspoint salvos',
			options: [
				{
					type: 'dropdown',
					label: 'Salvo',
					id: 'salvo_id',
					tooltip: 'Specify a salvo by name (e.g. "REST") or number (e.g. 6)',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.salvos,
					default: '',
				},
				{
					type: 'multidropdown',
					label: 'Flags',
					id: 'flags',
					tooltip: 'Select all applicable flags. If left empty, the system will execute a TAKE operation.',
					choices: [
						{ id: 'TAKE', label: 'Take salvo (default)' },
						{ id: 'PRESET', label: 'Store salvo in the preset buffer' },
						{ id: 'LOCK', label: 'Lock salvo crosspoints after execution' },
						{ id: 'PROTECT', label: 'Protect salvo crosspoints after execution' },
						{ id: 'UNLOCK', label: 'Unlock salvo crosspoints before execution' },
						{ id: 'NOTAKE', label: 'Inhibit crosspoint take' },
					],
					default: ['TAKE'],
				},
			],
			callback: (action) => {
				const salvo = self.state.resolveTarget(LRCEntityType.XSALVO, `${action.options.salvo_id}`)

				if (salvo) {
					const message = new LRCMessage(LRCEntityType.XSALVO, LRCOperation.CHANGE_REQUEST)

					message.addArgument('ID', LRCArgumentType.NUMERIC, salvo.id)

					if (self.config.send_user_id_with_xsalvo) {
						message.addArgument('U', LRCArgumentType.NUMERIC, self.config.user_id)
					}

					if (Object.prototype.hasOwnProperty.call(action.options, 'flags') && action.options.flags) {
						if (Array.isArray(action.options.flags)) {
							message.addArgument('F', LRCArgumentType.STRING, `${[...action.options.flags].join(',')}`)
						}
					}

					self.connection.sendLRCMessage(message)
				}
			},
		},
		dest_lock: {
			name: 'Destination Lock (LOCK)',
			description: 'Secure a destination from further crosspoint status changes by any user including the lock owner',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be selected/entered if desired.' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					choices: self.state.destinations,
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					default: 'OFF',
					tooltip: 'Specify the desired status of the protection',
					choices: [
						{ id: 'OFF', label: 'Not Protected (Off)' },
						{ id: 'ON', label: 'Protected (On)' },
					],
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Override (Force Lock Status Change)',
					id: 'override',
					default: false,
				},
			],
			callback: (action) => {
				const dest = self.state.resolveTarget(LRCEntityType.DEST, `${action.options.destination}`)

				const message = new LRCMessage(LRCEntityType.LOCK, LRCOperation.CHANGE_REQUEST)

				message.addArgument(
					'D',
					self.config.crosspoint_format ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					self.config.crosspoint_format ? dest.label : dest.id,
				)

				message.addArgument('V', LRCArgumentType.STRING, `${action.options.status}`)

				message.addArgument(
					'U',
					LRCArgumentType.NUMERIC,
					action.options.override ? LRCConstants.OVERRIDE_USER : self.config.user_id,
				)

				self.connection.sendLRCMessage(message)
			},
		},
		dest_protect: {
			name: 'Destination Protect (PROTECT)',
			description: 'Secure a destination from further changes requested by anyone except the lock owner (user)',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be selected/entered if desired.' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					choices: self.state.destinations,
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					default: 'OFF',
					tooltip: 'Specify the desired status of the protection',
					choices: [
						{ id: 'OFF', label: 'Not Protected (Off)' },
						{ id: 'ON', label: 'Protected (On)' },
					],
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Override (Force Lock Status Change)',
					id: 'override',
					default: false,
				},
			],
			callback: (action) => {
				const dest = self.state.resolveTarget(LRCEntityType.DEST, `${action.options.destination}`)

				const message = new LRCMessage(LRCEntityType.PROTECT, LRCOperation.CHANGE_REQUEST)

				message.addArgument(
					'D',
					self.config.crosspoint_format ? LRCArgumentType.STRING : LRCArgumentType.NUMERIC,
					self.config.crosspoint_format ? dest.label : dest.id,
				)

				message.addArgument('V', LRCArgumentType.STRING, `${action.options.status}`)

				message.addArgument(
					'U',
					LRCArgumentType.NUMERIC,
					action.options.override ? LRCConstants.OVERRIDE_USER : self.config.user_id,
				)

				self.connection.sendLRCMessage(message)
			},
		},
		protocol_query: {
			name: 'Protocol Query (PROTOCOL)',
			description: 'Query protocol version information',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: [
						{ id: 'NAME', label: 'Protocol Name' },
						{ id: 'VERSION', label: 'Protocol Version' },
					],
					default: 'NAME',
				},
			],
			callback: (action) => {
				const message = new LRCMessage(LRCEntityType.PROTOCOL, LRCOperation.QUERY)
				message.addArgument('Q', LRCArgumentType.STRING, `${action.options.query_item}`)
				self.connection.sendLRCMessage(message)
			},
		},
		dest_query: {
			name: 'Destination Query (DEST)',
			description: 'Query the system for the list of valid logical destinations',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: [
						{ id: 'COUNT', label: 'Count of logical sources in the system' },
						{ id: 'NAME', label: 'Name of source(s)' },
						{ id: 'CHANNELS', label: 'List of valid channels' },
						{ id: 'PHYSICAL', label: 'Physical location of a channel' },
					],
					default: 'COUNT',
				},
			],
			callback: (action) => {
				const message = new LRCMessage(LRCEntityType.DEST, LRCOperation.QUERY)
				message.addArgument('Q', LRCArgumentType.STRING, `${action.options.query_item}`)
				self.connection.sendLRCMessage(message)
			},
		},
		source_query: {
			name: 'Source Query (SRC)',
			description: 'Query the system for information about valid logical sources',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: [
						{ id: 'COUNT', label: 'Count of logical destinations in the system' },
						{ id: 'NAME', label: 'Name of destination(s)' },
						{ id: 'CHANNELS', label: 'List of valid channels' },
						{ id: 'PHYSICAL', label: 'Physical location of a channel' },
					],
					default: 'COUNT',
				},
			],
			callback: (action) => {
				const message = new LRCMessage(LRCEntityType.SRC, LRCOperation.QUERY)
				message.addArgument('Q', LRCArgumentType.STRING, `${action.options.query_item}`)
				self.connection.sendLRCMessage(message)
			},
		},
		send_message: {
			name: 'Send a manually-constructed LRC message',
			options: [
				{
					type: 'dropdown',
					label: 'Type',
					id: 'type',
					choices: LRCEntityTypeLabels,
					default: 'XPOINT',
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'op',
					choices: LRCOperationLabels,
					default: ':',
				},
				{
					type: 'textinput',
					label: 'Arguments',
					id: 'args',
					tooltip: 'There is NO validation for this field.',
					useVariables: true,
				},
			],
			callback: (action) => {
				const message = new LRCMessage(
					(<any>LRCEntityType)[`${action.options.type}`],
					(<any>LRCOperation)[`${action.options.op}`],
				).addArgumentRaw(`${action.options.args}`)

				self.connection.sendLRCMessage(message)
			},
		},
		send_raw: {
			name: 'Send a raw message over the socket',
			options: [
				{
					type: 'textinput',
					label: 'Message',
					id: 'message',
					tooltip: 'Only use this if you are absolutely sure of what you are doing. There is NO validation here.',
					useVariables: true,
				},
			],
			callback: (action) => {
				self.connection.sendRaw(`${action.options.message}`)
			},
		},
	})
}
