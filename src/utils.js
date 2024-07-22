const { InstanceStatus, TCPHelper } = require('@companion-module/base')

const LRC_OPENING_FLAG = '~'
const LRC_CLOSING_FLAG = '\\'
const LRC_CMD_TYPE_XPOINT = { id: 'XPOINT', label: 'Crosspoint Control' }
const LRC_CMD_TYPE_LOCK = { id: 'LOCK', label: 'Destination Lock' }
const LRC_CMD_TYPE_PROTECT = { id: 'PROTECT', label: 'Destination Protect' }
const LRC_CMD_TYPE_CHANNELS = { id: 'CHANNELS', label: 'Logical Channel (Level)' }
const LRC_CMD_TYPE_DEST = { id: 'DEST', label: 'Logical Destination' }
const LRC_CMD_TYPE_SRC = { id: 'SRC', label: 'Logical Source' }
const LRC_CMD_TYPE_DBCHANGE = { id: 'DBCHANGE', label: 'Database Change Notification' }
const LRC_CMD_TYPE_CONNECTION = { id: 'CONNECTION', label: 'Connection (Session) Control' }
const LRC_CMD_TYPE_PROTOCOL = { id: 'PROTOCOL', label: 'Protocol Information' }
const LRC_CMD_TYPE_XBUFFER = { id: 'XBUFFER', label: 'Crosspoint Buffer Control' }
const LRC_CMD_TYPE_XDISCONNECT = { id: 'XDISCONNECT', label: 'Disconnect Logical Crosspoint' }
const LRC_CMD_TYPE_XPRESET = { id: 'XPRESET', label: 'Crosspoint Preset' }
const LRC_CMD_TYPE_XSALVO = { id: 'XSALVO', label: 'Crosspoint Salvo' }
const LRC_CMD_TYPES = [
	LRC_CMD_TYPE_XPOINT,
	LRC_CMD_TYPE_LOCK,
	LRC_CMD_TYPE_PROTECT,
	LRC_CMD_TYPE_CHANNELS,
	LRC_CMD_TYPE_DEST,
	LRC_CMD_TYPE_SRC,
	LRC_CMD_TYPE_DBCHANGE,
	LRC_CMD_TYPE_CONNECTION,
	LRC_CMD_TYPE_PROTOCOL,
	LRC_CMD_TYPE_XBUFFER,
	LRC_CMD_TYPE_XDISCONNECT,
	LRC_CMD_TYPE_XPRESET,
	LRC_CMD_TYPE_XSALVO,
]
const LRC_OP_CHANGE_REQUEST = { id: ':', label: 'Change Request' }
const LRC_OP_CHANGE_NOTIFICATION = { id: '!', label: 'Change Notification' }
const LRC_OP_QUERY = { id: '?', label: 'Query' }
const LRC_OP_QUERY_RESPONSE = { id: '%', label: 'Query Response' }
const LRC_OPS = [LRC_OP_CHANGE_REQUEST, LRC_OP_QUERY]
const LRC_ARG_TYPE_STRING = '$'
const LRC_ARG_TYPE_NUMERIC = '#'
const LRC_ARG_TYPE_UTF8 = '&'
const LRC_ARG_TYPES = [LRC_ARG_TYPE_STRING, LRC_ARG_TYPE_NUMERIC, LRC_ARG_TYPE_UTF8]
const LRC_CMD_TYPE_LOCK_OVERRIDE_USER = -1
const LRC_CMD_TYPE_XSALVO_FLAGS = [
	{ id: 'TAKE', label: 'Take salvo (default)' },
	{ id: 'PRESET', label: 'Store salvo in the preset buffer' },
	{ id: 'LOCK', label: 'Lock salvo crosspoints after execution' },
	{ id: 'PROTECT', label: 'Protect salvo crosspoints after execution' },
	{ id: 'UNLOCK', label: 'Unlock salvo crosspoints before execution' },
	{ id: 'NOTAKE', label: 'Inhibit crosspoint take' },
]
const LRC_CMD_TYPE_PROTOCOL_QUERIES = [
	{ id: 'NAME', label: 'Protocol Name' },
	{ id: 'VERSION', label: 'Protocol Version' },
]
const LRC_CMD_TYPE_DEST_QUERIES = [
	{ id: 'COUNT', label: 'Count of logical destinations in the system' },
	{ id: 'NAME', label: 'Name of destination(s)' },
	{ id: 'CHANNELS', label: 'List of valid channels' },
	{ id: 'PHYSICAL', label: 'Physical location of a channel' },
]
const LRC_CMD_TYPE_SOURCE_QUERIES = [
	{ id: 'COUNT', label: 'Count of logical sources in the system' },
	{ id: 'NAME', label: 'Name of source(s)' },
	{ id: 'CHANNELS', label: 'List of valid channels' },
	{ id: 'PHYSICAL', label: 'Physical location of a channel' },
]

module.exports = {
	initConnection: function () {
		let self = this

		try {
			self.log('info', `Opening connection to ${self.config.host}:${self.config.port}`)

			self.socket = new TCPHelper(self.config.host, self.config.port)

			self.socket.on('error', function (err) {
				if (self.config.verbose) {
					self.log('warn', 'Error: ' + err)
				}

				self.updateStatus(InstanceStatus.ConnectionFailure)
			})

			self.socket.on('connect', function () {
				self.updateStatus(InstanceStatus.Ok)
				self.log('info', `Successfully connect to router. Querying data.`)
				self.getData()
			})

			self.socket.on('data', function (buffer) {
				self.processData(buffer.toString())
			})
		} catch (error) {
			self.log('error', `Failed to connect to router: ${error}`)
			self.updateStatus(InstanceStatus.ConnectionFailure)
		}
	},

	getData: function () {
		// Query router for various data to be cached locally for use in UI and within the module
		let self = this

		// Protocol Details
		self.sendLRCMessage(LRC_CMD_TYPE_PROTOCOL.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{NAME}`)
		self.sendLRCMessage(LRC_CMD_TYPE_PROTOCOL.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{VERSION}`)
		// Destinations
		self.sendLRCMessage(LRC_CMD_TYPE_DEST.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{COUNT}`)
		self.sendLRCMessage(LRC_CMD_TYPE_DEST.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{NAME}`)
		// Sources
		self.sendLRCMessage(LRC_CMD_TYPE_SRC.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{COUNT}`)
		self.sendLRCMessage(LRC_CMD_TYPE_SRC.id, LRC_OP_QUERY.id, `Q${LRC_ARG_TYPE_STRING}{NAME}`)
		// Channels
		self.sendLRCMessage(LRC_CMD_TYPE_CHANNELS.id, LRC_OP_QUERY.id)
		// Salvos
		for (const i of [...Array(self.config.salvo_count + 1).keys()]) {
			self.sendLRCMessage(LRC_CMD_TYPE_XSALVO.id, LRC_OP_QUERY.id, `ID${LRC_ARG_TYPE_NUMERIC}{${i}}`)
		}
		// Crosspoints
		self.sendLRCMessage(LRC_CMD_TYPE_XPOINT.id, LRC_OP_QUERY.id)
	},

	processData: function (data) {
		let self = this
		let responseData = data.toString('utf8')
		self.log('debug', `Received data: ${responseData}`)

		const dest_count_match = responseData.matchAll(/~DEST%COUNT#{(\d+)}\\/g)
		const dest_count_matches = [...dest_count_match]
		if (dest_count_matches.length > 0) {
			// Update destination count
			for (const match of dest_count_matches) {
				self.state.destinations_count = match[1]
			}
			self.log('debug', 'Destination Count Updated: ' + self.state.destinations_count)
		}

		const dest_name_match = responseData.matchAll(/~DEST%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
		const dest_name_matches = [...dest_name_match]
		if (dest_name_matches.length > 0) {
			// Update destination list
			let new_dest_names = []
			let upd_dest_names = []
			for (const match of dest_name_matches) {
				let existingDest = self.findTarget('destination', match[1])
				if (existingDest !== undefined) {
					existingDest.label = match[2]
					upd_dest_names.push(match[2])
				} else {
					const new_dest = { id: match[1], label: match[2], source: '', lock: '', protect: '' }
					self.state.destinations.push(new_dest)
					new_dest_names.push(match[2])
				}
			}
			self.log('debug', 'Destinations Created: ' + new_dest_names.join(', '))
			self.log('debug', 'Destinations Updated: ' + upd_dest_names.join(', '))
			self.log('debug', 'Destinations Object: ' + JSON.stringify(self.state.destinations))

			// TODO: Figure out what to replace this with
			//self.saveConfig()
			self.checkFeedbacks('xpoint_state')

			// Query for locks and protects here because these must happen _after_ destinations are loaded into the config
			self.sendLRCMessage(LRC_CMD_TYPE_LOCK.id, LRC_OP_QUERY.id)
			self.sendLRCMessage(LRC_CMD_TYPE_PROTECT.id, LRC_OP_QUERY.id)

			const xpoint_state_match = responseData.matchAll(/~XPOINT[!%]D[#$]{([^~\\{},]+)};S[$#]{([^~\\{},]+)}\\/g)
			const xpoint_state_matches = [...xpoint_state_match]
			if (xpoint_state_matches.length > 0) {
				// Update crosspoint state (for feedback)
				let updated_dests = []
				for (const match of xpoint_state_matches) {
					let target = self.findTarget('destination', match[1])
					if (target) {
						target.source = match[2]
						updated_dests.push(`${target.label}:${target.source}`)
					} else {
						self.log('debug', `Destination '${match[1]}' not found, can't update state`)
					}
				}
				self.log('debug', 'Crosspoint State Updated: ' + updated_dests.join(', '))
				self.checkFeedbacks('xpoint_state')
			}

			const source_count_match = responseData.matchAll(/~SRC%COUNT#{(\d+)}\\/g)
			const source_count_matches = [...source_count_match]
			if (source_count_matches.length > 0) {
				// Update source count
				for (const match of source_count_matches) {
					self.state.sources_count = match[1]
				}
				self.log('debug', 'Source Count Updated: ' + self.state.sources_count)
			}

			const source_name_match = responseData.matchAll(/~SRC%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
			const source_name_matches = [...source_name_match]
			if (source_name_matches.length > 0) {
				// Update source list
				let new_source_names = []
				let upd_source_names = []
				for (const match of source_name_matches) {
					let existingSource = self.findTarget('source', match[1])
					if (existingSource !== undefined) {
						existingSource.label = match[2]
						existingSource.state = match[3]
						upd_source_names.push(match[2])
					} else {
						const new_source = { id: match[1], label: match[2] }
						self.state.sources.push(new_source)
						new_source_names.push(match[2])
					}
				}
				self.log('debug', 'Sources Created: ' + new_source_names.join(', '))
				self.log('debug', 'Sources Updated: ' + upd_source_names.join(', '))
				self.log('debug', 'Sources Object: ' + JSON.stringify(self.state.sources))
				// TODO: Figure out what to replace this with
				//self.saveConfig()
			}

			const salvo_name_match = responseData.matchAll(/~XSALVO%ID[$#]{([^~\\{},]+)};V\${([ON|OF]+)}\\/g)
			const salvo_name_matches = [...salvo_name_match]
			if (salvo_name_matches.length > 0) {
				// Update salvo list
				let new_salvo_names = []
				let upd_salvo_names = []
				for (const match of salvo_name_matches) {
					// TODO: Figure out what to replace this with
					let existingSalvo = self.findTarget('salvo', match[1])
					if (existingSalvo !== undefined) {
						existingSalvo.label = match[1]
						existingSalvo.state = match[2]
						upd_salvo_names.push(match[1])
					} else {
						const new_salvo = { id: match[1], label: match[1], state: match[2] }
						self.state.salvos.push(new_salvo)
						new_salvo_names.push(match[1])
					}
				}
				self.log('debug', 'Salvos Created: ' + new_salvo_names.join(', '))
				self.log('debug', 'Salvos Updated: ' + upd_salvo_names.join(', '))
				self.log('debug', 'Salvos Object: ' + JSON.stringify(self.state.salvos))
				// TODO: Figure out what to replace this with
				//self.saveConfig()
				self.checkFeedbacks('salvo_state')
				// self.init_presets()
			}

			const salvo_state_match = responseData.matchAll(/~XSALVO!ID\${([^~\\{},]+)};V\${(ON|OFF)}\\/g)
			const salvo_state_matches = [...salvo_state_match]
			if (salvo_state_matches.length > 0) {
				// Update Salvo State (for feedback)
				let updated_salvos = []
				for (const match of salvo_state_matches) {
					let target = self.state.salvos.find((salvo) => salvo.id === match[1])
					if (target) {
						target.state = match[2]
						updated_salvos.push(`${target.label}:${target.state}`)
					} else {
						self.log('debug', `Salvo '${match[1]}' not found, can't update state`)
					}
				}
				self.log('debug', 'Salvo State Updated: ' + updated_salvos.join(', '))
				self.checkFeedbacks('salvo_state')
			}

			const channel_name_match = responseData.matchAll(/~CHANNELS%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
			const channel_name_matches = [...channel_name_match]
			if (channel_name_matches.length > 0) {
				// Update channel list
				let new_chan_names = []
				let upd_chan_names = []
				for (const match of channel_name_matches) {
					let existingChan = self.findTarget('channel', match[1])
					if (existingChan !== undefined) {
						existingChan.label = match[1]
						upd_chan_names.push(match[1])
					} else {
						const new_chan = { id: match[1], label: match[1] }
						self.state.channels.push(new_chan)
						new_chan_names.push(match[1])
					}
				}
				self.log('debug', 'Channels Created: ' + new_chan_names.join(', '))
				self.log('debug', 'Channels Updated: ' + upd_chan_names.join(', '))
				self.log('debug', 'Channels Object: ' + JSON.stringify(self.state.channels))
				// TODO: Figure out what to replace this with
				// //self.saveConfig()
			}

			const lock_state_match = responseData.matchAll(/~LOCK[!%]D[#$]{([^~\\{},]+)};V\${(ON|OFF)+};U#{(\d*)}\\/g)
			const lock_state_matches = [...lock_state_match]
			if (lock_state_matches.length > 0) {
				// Update destination lock state (for feedback)
				let updated_dests = []
				for (const match of lock_state_matches) {
					let target = self.findTarget('destination', match[1])
					if (target) {
						target.lock = match[2]
						updated_dests.push(`${target.label}:${target.lock}`)

						if (match[2] === 'OFF') {
							// Unlocking also un-protects, so update that too
							target.protect = match[2]
							self.checkFeedbacks('protect_state')
						}
					} else {
						self.log('debug', `Destination '${match[1]}' not found, can't update lock state`)
					}
				}
				self.log('debug', 'Destination Lock State Updated: ' + updated_dests.join(', '))
				self.checkFeedbacks('lock_state')
			}

			const protect_state_match = responseData.matchAll(/~PROTECT[!%]D[#$]{([^~\\{},]+)};V\${(ON|OFF)+};U#{(\d*)}\\/g)
			const protect_state_matches = [...protect_state_match]
			if (protect_state_matches.length > 0) {
				// Update destination protect state (for feedback)
				let updated_dests = []
				for (const match of protect_state_matches) {
					let target = self.findTarget('destination', match[1])
					if (target) {
						target.protect = match[2]
						updated_dests.push(`${target.label}:${target.protect}`)
					} else {
						self.log('debug', `Destination '${match[1]}' not found, can't update protect state`)
					}
				}
				self.log('debug', 'Destination Protect State Updated: ' + updated_dests.join(', '))
				self.checkFeedbacks('protect_state')
			}

			const protocol_name_match = responseData.matchAll(/~PROTOCOL%NAME\${([^~\\{},]+)}\\/g)
			const protocol_name_matches = [...protocol_name_match]
			if (protocol_name_matches.length > 0) {
				// Update protocol name
				let proto_name = undefined
				for (const match of protocol_name_matches) {
					proto_name = match[1]
				}
				self.log('debug', 'LRC Protocol Name: ' + proto_name)
			}

			const protocol_version_match = responseData.matchAll(/~PROTOCOL%VERSION\${([^~\\{},]+)}\\/g)
			const protocol_version_matches = [...protocol_version_match]
			if (protocol_version_matches.length > 0) {
				// Update protocol version
				let proto_ver = undefined
				for (const match of protocol_version_matches) {
					proto_ver = match[1]
					self.state.protocol_version = match[1]
				}
				if (proto_ver === '1.0') {
					self.log(
						'warn',
						`Connected to a router running old LRC version ${proto_ver}. Not all features may be supported!`
					)
				} else {
					self.log('info', 'Connected to a router running LRC version ' + self.state.protocol_version)
				}
			}

			const db_change_match = responseData.matchAll(/~DBCHANGE!DATA\${ALL}\\/g)
			const db_change_matches = [...db_change_match]
			if (db_change_matches.length > 0) {
				// Router database updated, need to update sources, destinations, and salvos
				self.log('debug', 'Router database has changed, updating all locally-cached data')
				self.getData()
			}
		}
	},

	findTarget: function (target_type, needle) {
		let self = this
		let haystack = undefined
		switch (target_type) {
			case 'source':
				haystack = self.state.sources
				break
			case 'destination':
				haystack = self.state.destinations
				break
			case 'salvo':
				haystack = self.state.salvos
				break
			default:
				return false
		}
		let targetById = haystack.find((i) => i.id === needle)
		if (targetById) {
			return targetById
		}
		let targetByLabel = haystack.find((i) => i.label === needle)
		if (targetByLabel) {
			return targetByLabel
		}
		return undefined
	},

	sendLRCMessage: function (type, op, args) {
		let self = this

		let validation_errors = []
		if (false === LRC_CMD_TYPES.find((o) => o.id === type)) {
			validation_errors.push(`Invalid LRC type "${type}"`)
		}
		if (false === LRC_OPS.find((o) => o.id === op)) {
			validation_errors.push(`Invalid LRC operation "${op}"`)
		}

		if (validation_errors.length === 0) {
			// No validation errors, so request is good to be built and sent
			let message = ''
			if (args === undefined) {
				// Not all messages have arguments
				message = LRC_OPENING_FLAG + type + op + LRC_CLOSING_FLAG
			} else {
				message = LRC_OPENING_FLAG + type + op + args + LRC_CLOSING_FLAG
			}
			self.sendSocket(message)
		} else {
			// One or more validation errors, log to UI and don't send a request
			for (const error of validation_errors) {
				self.log('error', `LRC message validation error: ${error}`)
			}
		}
	},

	sendSocket: function (message) {
		let self = this

		if (self.socket !== undefined) {
			self.log('debug', `Sending data: ${message}`)
			self.socket.send(message)
		} else {
			this.log('error', 'Socket not connected :(')
		}
	},
}
