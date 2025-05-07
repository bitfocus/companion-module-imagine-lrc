const { InstanceStatus, TCPHelper } = require('@companion-module/base')

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
		self.sendLRCMessage(self.LRC_CMD_TYPE_PROTOCOL.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{NAME}`)
		self.sendLRCMessage(self.LRC_CMD_TYPE_PROTOCOL.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{VERSION}`)
		// Destinations
		self.sendLRCMessage(self.LRC_CMD_TYPE_DEST.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{COUNT}`)
		self.sendLRCMessage(self.LRC_CMD_TYPE_DEST.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{NAME}`)
		// Sources
		self.sendLRCMessage(self.LRC_CMD_TYPE_SRC.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{COUNT}`)
		self.sendLRCMessage(self.LRC_CMD_TYPE_SRC.id, self.LRC_OP_QUERY.id, `Q${self.LRC_ARG_TYPE_STRING}{NAME}`)
		// Channels
		self.sendLRCMessage(self.LRC_CMD_TYPE_CHANNELS.id, self.LRC_OP_QUERY.id)
		// Salvos
		for (const i of [...Array(self.config.salvo_count + 1).keys()]) {
			self.sendLRCMessage(self.LRC_CMD_TYPE_XSALVO.id, self.LRC_OP_QUERY.id, `ID${self.LRC_ARG_TYPE_NUMERIC}{${i}}`)
		}
		// Crosspoints
		self.sendLRCMessage(self.LRC_CMD_TYPE_XPOINT.id, self.LRC_OP_QUERY.id)
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

			// Re-initialize actions to populate the choices for destinations with the latest information
			self.initActions()

			// Re-initialize the variables to make all possible destination statuses available
			self.initVariables();

			// Query for locks and protects here because these must happen _after_ destinations are loaded into the config
			self.sendLRCMessage(self.LRC_CMD_TYPE_LOCK.id, self.LRC_OP_QUERY.id)
			self.sendLRCMessage(self.LRC_CMD_TYPE_PROTECT.id, self.LRC_OP_QUERY.id)
		}

		const xpoint_state_match = responseData.matchAll(/~XPOINT[!%]D[#$]{([^~\\{},]+)};S[$#]{([^~\\{},]+)}\\/g)
		const xpoint_state_matches = [...xpoint_state_match]
		if (xpoint_state_matches.length > 0) {
			// Update crosspoint state (for feedback)
			let varsToUpdate = [];
			for (const match of xpoint_state_matches) {
				let target = self.findTarget('destination', match[1])
				if (target) {
					target.source = match[2]
					varsToUpdate.push(target);
				} else {
					self.log('debug', `Destination '${match[1]}' not found, can't update state`)
				}
			}
			self.updateVariables(varsToUpdate);
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

			// Re-initialize actions to populate the choices for sources with the latest information
			self.initActions()
		}

		const salvo_name_match = responseData.matchAll(/~XSALVO%ID[$#]{([^~\\{},]+)};V\${([ON|OF]+)}\\/g)
		const salvo_name_matches = [...salvo_name_match]
		if (salvo_name_matches.length > 0) {
			// Update salvo list
			let new_salvo_names = []
			let upd_salvo_names = []
			for (const match of salvo_name_matches) {
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

			// Re-initialize all the things to populate the choices for salvos with the latest information
			self.initActions()
			self.initPresets()
			self.initFeedbacks()
			self.checkFeedbacks('salvo_state')
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

			// Re-initialize actions to populate the choices for salvos with the latest information
			self.initActions()
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
	},

	parseTarget: async function (target_type, target_name) {
		let self = this
		let parsed_target = ''
		let target = ''

		// Attempt to parse the provided target_name to translate any variables
		await self.parseVariablesInString(target_name).then(function (value) {
			parsed_target = unescape(value)
		})

		// Check if parsed target is different from original target to try and determine
		// if it was selected from the dropdown or set using a variable
		if (parsed_target == target_name) {
			// Parsed target is equal to button target, so variables weren't used.
			// Translate button target to numbers or names depending on configuration
			let found_target = self.findTarget(target_type, target_name)
			if (found_target) {
				if (self.config.crosspoint_format === 'numbers') {
					target = found_target.id
				} else if (self.config.crosspoint_format === 'names') {
					target = found_target.label
				} else {
					self.log('error', `Unsupported crosspoint format: ${self.config.crosspoint_format}`)
					return
				}
			} else {
				self.log('error', `Could not find target ${target_type} for '${target_name}'`)
			}
		} else {
			// Parsed source is NOT equal to button source, so variables were used.
			// Send whatever was specified in the variable without any modification/translation
			target = parsed_target
		}
		return target
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
		if (false === self.LRC_CMD_TYPES.find((o) => o.id === type)) {
			validation_errors.push(`Invalid LRC type "${type}"`)
		}
		if (false === self.LRC_OPS.find((o) => o.id === op)) {
			validation_errors.push(`Invalid LRC operation "${op}"`)
		}

		if (validation_errors.length === 0) {
			// No validation errors, so request is good to be built and sent
			let message = ''
			if (args === undefined) {
				// Not all messages have arguments
				message = self.LRC_OPENING_FLAG + type + op + self.LRC_CLOSING_FLAG
			} else {
				message = self.LRC_OPENING_FLAG + type + op + args + self.LRC_CLOSING_FLAG
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
