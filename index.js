var tcp = require('../../tcp')
var instance_skel = require('../../instance_skel')
var debug
var log

instance.prototype.LRC_OPENING_FLAG = '~'
instance.prototype.LRC_CLOSING_FLAG = '\\'
instance.prototype.LRC_CMD_TYPE_XPOINT = { id: 'XPOINT', label: 'Crosspoint Control' }
instance.prototype.LRC_CMD_TYPE_LOCK = { id: 'LOCK', label: 'Destination Lock' }
instance.prototype.LRC_CMD_TYPE_PROTECT = { id: 'PROTECT', label: 'Destination Protect' }
instance.prototype.LRC_CMD_TYPE_CHANNELS = { id: 'CHANNELS', label: 'Logical Channel (Level)' }
instance.prototype.LRC_CMD_TYPE_DEST = { id: 'DEST', label: 'Logical Destination' }
instance.prototype.LRC_CMD_TYPE_SRC = { id: 'SRC', label: 'Logical Source' }
instance.prototype.LRC_CMD_TYPE_DBCHANGE = { id: 'DBCHANGE', label: 'Database Change Notification' }
instance.prototype.LRC_CMD_TYPE_CONNECTION = { id: 'CONNECTION', label: 'Connection (Session) Control' }
instance.prototype.LRC_CMD_TYPE_PROTOCOL = { id: 'PROTOCOL', label: 'Protocol Information' }
instance.prototype.LRC_CMD_TYPE_XBUFFER = { id: 'XBUFFER', label: 'Crosspoint Buffer Control' }
instance.prototype.LRC_CMD_TYPE_XDISCONNECT = { id: 'XDISCONNECT', label: 'Disconnect Logical Crosspoint' }
instance.prototype.LRC_CMD_TYPE_XPRESET = { id: 'XPRESET', label: 'Crosspoint Preset' }
instance.prototype.LRC_CMD_TYPE_XSALVO = { id: 'XSALVO', label: 'Crosspoint Salvo' }
instance.prototype.LRC_CMD_TYPES = [
	instance.prototype.LRC_CMD_TYPE_XPOINT,
	instance.prototype.LRC_CMD_TYPE_LOCK,
	instance.prototype.LRC_CMD_TYPE_PROTECT,
	instance.prototype.LRC_CMD_TYPE_CHANNELS,
	instance.prototype.LRC_CMD_TYPE_DEST,
	instance.prototype.LRC_CMD_TYPE_SRC,
	instance.prototype.LRC_CMD_TYPE_DBCHANGE,
	instance.prototype.LRC_CMD_TYPE_CONNECTION,
	instance.prototype.LRC_CMD_TYPE_PROTOCOL,
	instance.prototype.LRC_CMD_TYPE_XBUFFER,
	instance.prototype.LRC_CMD_TYPE_XDISCONNECT,
	instance.prototype.LRC_CMD_TYPE_XPRESET,
	instance.prototype.LRC_CMD_TYPE_XSALVO,
]
instance.prototype.LRC_OP_CHANGE_REQUEST = { id: ':', label: 'Change Request' }
instance.prototype.LRC_OP_CHANGE_NOTIFICATION = { id: '!', label: 'Change Notification' }
instance.prototype.LRC_OP_QUERY = { id: '?', label: 'Query' }
instance.prototype.LRC_OP_QUERY_RESPONSE = { id: '%', label: 'Query Response' }
instance.prototype.LRC_OPS = [instance.prototype.LRC_OP_CHANGE_REQUEST, instance.prototype.LRC_OP_QUERY]
instance.prototype.LRC_ARG_TYPE_STRING = '$'
instance.prototype.LRC_ARG_TYPE_NUMERIC = '#'
instance.prototype.LRC_ARG_TYPE_UTF8 = '&'
instance.prototype.LRC_ARG_TYPES = [
	instance.prototype.LRC_ARG_TYPE_STRING,
	instance.prototype.LRC_ARG_TYPE_NUMERIC,
	instance.prototype.LRC_ARG_TYPE_UTF8,
]
instance.prototype.LRC_CMD_TYPE_LOCK_OVERRIDE_USER = -1
instance.prototype.LRC_CMD_TYPE_XSALVO_FLAGS = [
	{ id: 'TAKE', label: 'Take salvo (default)' },
	{ id: 'PRESET', label: 'Store salvo in the preset buffer' },
	{ id: 'LOCK', label: 'Lock salvo crosspoints after execution' },
	{ id: 'PROTECT', label: 'Protect salvo crosspoints after execution' },
	{ id: 'UNLOCK', label: 'Unlock salvo crosspoints before execution' },
	{ id: 'NOTAKE', label: 'Inhibit crosspoint take' },
]
instance.prototype.LRC_CMD_TYPE_PROTOCOL_QUERIES = [
	{ id: 'NAME', label: 'Protocol Name' },
	{ id: 'VERSION', label: 'Protocol Version' },
]
instance.prototype.LRC_CMD_TYPE_DEST_QUERIES = [
	{ id: 'COUNT', label: 'Count of logical destinations in the system' },
	{ id: 'NAME', label: 'Name of destination(s)' },
	{ id: 'CHANNELS', label: 'List of valid channels' },
	{ id: 'PHYSICAL', label: 'Physical location of a channel' },
]
instance.prototype.LRC_CMD_TYPE_SOURCE_QUERIES = [
	{ id: 'COUNT', label: 'Count of logical sources in the system' },
	{ id: 'NAME', label: 'Name of source(s)' },
	{ id: 'CHANNELS', label: 'List of valid channels' },
	{ id: 'PHYSICAL', label: 'Physical location of a channel' },
]
instance.prototype.LRC_SOURCES_COUNT = 0
instance.prototype.LRC_SOURCES = []
instance.prototype.LRC_DESTINATIONS_COUNT = 0
instance.prototype.LRC_DESTINATIONS = []
instance.prototype.LRC_SALVOS = []
instance.prototype.LRC_CHANNELS = []

function instance(system, id, config) {
	let self = this

	// super-constructor
	instance_skel.apply(this, arguments)

	self.actions() // export actions

	return self
}

instance.prototype.updateConfig = function (config) {
	let self = this

	self.config = config

	// Clear everything to avoid duplicates
	self.clearRouterData()

	self.init_tcp()
}

instance.prototype.init = function () {
	let self = this

	debug = self.debug
	log = self.log

	self.init_tcp()
}

instance.prototype.init_tcp = function () {
	let self = this
	let receivebuffer = ''

	if (self.socket !== undefined) {
		self.socket.destroy()
		delete self.socket
	}

	if (self.config.port === undefined) {
		self.config.port = 52116
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port)

		self.socket.on('status_change', function (status, message) {
			self.status(status, message)
		})

		self.socket.on('error', function (err) {
			debug('Network error', err)
			self.log('error', 'Network error: ' + err.message)
		})

		self.socket.on('connect', function () {
			self.log('info', 'Connected')

			// Query protocol name/version, source count/names, destination count/names, and salvos
			self.queryRouterData()
			self.init_feedbacks()
		})

		self.socket.on('data', function (buffer) {
			let indata = buffer.toString('utf8')

			const dest_count_match = indata.matchAll(/~DEST%COUNT#{(\d+)}\\/g)
			const dest_count_matches = [...dest_count_match]
			if (dest_count_matches.length > 0) {
				// Update destination count
				for (const match of dest_count_matches) {
					self.LRC_DESTINATIONS_COUNT = match[1]
				}
				self.log('debug', 'Destination Count Updated: ' + self.LRC_DESTINATIONS_COUNT)
			}

			const dest_name_match = indata.matchAll(/~DEST%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
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
						self.LRC_DESTINATIONS.push(new_dest)
						new_dest_names.push(match[2])
					}
				}
				self.log('debug', 'Destinations Created: ' + new_dest_names.join(', '))
				self.log('debug', 'Destinations Updated: ' + upd_dest_names.join(', '))
				self.saveConfig()
				self.checkFeedbacks('xpoint_state')

				// Query for locks and protects here because these must happen _after_ destinations are loaded into the config
				self.sendLRCMessage(self.LRC_CMD_TYPE_LOCK.id, self.LRC_OP_QUERY.id)
				self.sendLRCMessage(self.LRC_CMD_TYPE_PROTECT.id, self.LRC_OP_QUERY.id)
			}

			const xpoint_state_match = indata.matchAll(/~XPOINT[!%]D[#$]{([^~\\{},]+)};S[$#]{([^~\\{},]+)}\\/g)
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

			const source_count_match = indata.matchAll(/~SRC%COUNT#{(\d+)}\\/g)
			const source_count_matches = [...source_count_match]
			if (source_count_matches.length > 0) {
				// Update source count
				for (const match of source_count_matches) {
					self.LRC_SOURCES_COUNT = match[1]
				}
				self.log('debug', 'Source Count Updated: ' + self.LRC_SOURCES_COUNT)
			}

			const source_name_match = indata.matchAll(/~SRC%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
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
						self.LRC_SOURCES.push(new_source)
						new_source_names.push(match[2])
					}
				}
				self.log('debug', 'Sources Created: ' + new_source_names.join(', '))
				self.log('debug', 'Sources Updated: ' + upd_source_names.join(', '))
				self.saveConfig()
			}

			const salvo_name_match = indata.matchAll(/~XSALVO%ID[$#]{([^~\\{},]+)};V\${([ON|OF]+)}\\/g)
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
						self.LRC_SALVOS.push(new_salvo)
						new_salvo_names.push(match[1])
					}
				}
				self.log('debug', 'Salvos Created: ' + new_salvo_names.join(', '))
				self.log('debug', 'Salvos Updated: ' + upd_salvo_names.join(', '))
				self.saveConfig()
				self.checkFeedbacks('salvo_state')
				self.init_presets()
			}

			const salvo_state_match = indata.matchAll(/~XSALVO!ID\${([^~\\{},]+)};V\${(ON|OFF)}\\/g)
			const salvo_state_matches = [...salvo_state_match]
			if (salvo_state_matches.length > 0) {
				// Update Salvo State (for feedback)
				let updated_salvos = []
				for (const match of salvo_state_matches) {
					let target = self.LRC_SALVOS.find((salvo) => salvo.id === match[1])
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

			const channel_name_match = indata.matchAll(/~CHANNELS%I#{(\d+)};NAME\${([^~\\{},]+)}\\/g)
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
						self.LRC_CHANNELS.push(new_chan)
						new_chan_names.push(match[1])
					}
				}
				self.log('debug', 'Channels Created: ' + new_chan_names.join(', '))
				self.log('debug', 'Channels Updated: ' + upd_chan_names.join(', '))
				self.saveConfig()
			}

			const lock_state_match = indata.matchAll(/~LOCK[!%]D[#$]{([^~\\{},]+)};V\${(ON|OFF)+};U#{(\d*)}\\/g)
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

			const protect_state_match = indata.matchAll(/~PROTECT[!%]D[#$]{([^~\\{},]+)};V\${(ON|OFF)+};U#{(\d*)}\\/g)
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

			const protocol_name_match = indata.matchAll(/~PROTOCOL%NAME\${([^~\\{},]+)}\\/g)
			const protocol_name_matches = [...protocol_name_match]
			if (protocol_name_matches.length > 0) {
				// Update protocol name
				let proto_name = undefined
				for (const match of protocol_name_matches) {
					proto_name = match[1]
				}
				self.log('debug', 'LRC Protocol Name: ' + proto_name)
			}

			const protocol_version_match = indata.matchAll(/~PROTOCOL%VERSION\${([^~\\{},]+)}\\/g)
			const protocol_version_matches = [...protocol_version_match]
			if (protocol_version_matches.length > 0) {
				// Update protocol version
				let proto_ver = undefined
				for (const match of protocol_version_matches) {
					proto_ver = match[1]
				}
				self.log('debug', 'LRC Protocol Version: ' + proto_ver)
				if (proto_ver === '1.0') {
					self.log(
						'warn',
						'Connected to a router running old LRC version ' + proto_ver + '. Not all features may be supported!'
					)
				} else {
					self.log('info', 'Connected to a router running LRC version ' + proto_ver)
				}
			}

			const db_change_match = indata.matchAll(/~DBCHANGE!DATA\${ALL}\\/g)
			const db_change_matches = [...db_change_match]
			if (db_change_matches.length > 0) {
				// Router database updated, need to update sources, destinations, and salvos
				self.log('debug', 'Router database has changed, updating all locally-cached data')
				self.queryRouterData()
			}
		})
	}
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	let self = this

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'This module controls Imagine Communications video routers via Logical Router Control (LRC) protocol.<br/>' +
				'<b><u>Configuration Notes:</u></b><br/>' +
				'<b>User ID:</b> Numeric identifier for any commands requiring this parameter (e.g. LOCK, PROTECT, XBUFFER)<br/>' +
				'<b>Salvo Count:</b> Number of salvos to query from the router (range from 0 to n)<br/>' +
				'<b>Allow Empty Crosspoint Destination:</b> Safeguard to prevent routing a single source to every destination in a single crosspoint command<br/>' +
				'<b>Crosspoint Format:</b> Sets sources/destinations used in crosspoint commands to be sent as either numbers (default) or names.' +
				' If you use a variable in the respective fields, you should set this to the same format as your variable values as the values will be sent unmodified.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.0.100',
			regex: self.REGEX_IP,
			required: true,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Port',
			width: 6,
			default: '52116',
			regex: self.REGEX_PORT,
		},
		{
			type: 'number',
			id: 'user_id',
			label: 'User ID',
			width: 3,
			min: 0,
			max: 65535,
			default: 0,
			required: true,
		},
		{
			type: 'number',
			id: 'salvo_count',
			label: 'Salvo Count',
			width: 3,
			min: 1,
			max: 65535,
			default: 24,
			required: true,
		},
		{
			type: 'checkbox',
			id: 'allow_empty_xpoint_dest',
			label: 'Allow Empty Crosspoint Destination',
			width: 6,
			default: false,
		},
		{
			type: 'dropdown',
			id: 'crosspoint_format',
			label: 'Crosspoint Format',
			width: 6,
			default: 'numbers',
			choices: [
				{ id: 'numbers', label: 'Numbers' },
				{ id: 'names', label: 'Names' },
			]
		}
	]
}

// When module gets deleted
instance.prototype.destroy = function () {
	let self = this

	if (self.socket !== undefined) {
		self.socket.destroy()
	}

	debug('destroy', self.id)
}

instance.prototype.feedback = function (feedback, bank) {
	let self = this

	switch (feedback.type) {
		case 'salvo_state':
			let salvo_id = feedback.options.salvo
			let salvo_target = self.findTarget('salvo', salvo_id)
			if (salvo_target && salvo_target.hasOwnProperty('state')) {
				return salvo_target.state === 'ON'
			} else {
				self.log('warn', `Salvo '${salvo_id}' not found or no state property`)
				return false
			}
		case 'xpoint_state':
			let xpoint_dest_id = feedback.options.dest
			let xpoint_dest_target = self.findTarget('destination', xpoint_dest_id)
			if (xpoint_dest_target && xpoint_dest_target.hasOwnProperty('source')) {
				return xpoint_dest_target.source === feedback.options.source
			} else {
				self.log('warn', `Destination '${xpoint_dest_id}' not found or no state property`)
				return false
			}
		case 'lock_state':
			let lock_dest_id = feedback.options.dest
			let lock_dest_target = self.findTarget('destination', lock_dest_id)
			if (lock_dest_target && lock_dest_target.hasOwnProperty('lock')) {
				return lock_dest_target.lock === 'ON'
			} else {
				self.log('warn', `Destination '${lock_dest_id}' not found or no lock property`)
				return false
			}
		case 'protect_state':
			let protect_dest_id = feedback.options.dest
			let protect_dest_target = self.findTarget('destination', protect_dest_id)
			if (protect_dest_target && protect_dest_target.hasOwnProperty('protect')) {
				return protect_dest_target.protect === 'ON'
			} else {
				self.log('warn', `Destination '${protect_dest_id}' not found or no protect property`)
				return false
			}
	}
}

instance.prototype.init_feedbacks = function () {
	let self = this
	let feedbacks = {}

	feedbacks['salvo_state'] = {
		type: 'boolean',
		label: 'Salvo State',
		description: 'If the crosspoints defined in the salvo are active, change the style of the button',
		style: {
			color: self.rgb(0, 0, 0),
			bgcolor: self.rgb(0, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Salvo',
				id: 'salvo',
				choices: self.LRC_SALVOS,
			},
		],
	}
	feedbacks['xpoint_state'] = {
		type: 'boolean',
		label: 'Crosspoint State',
		description: 'If the specified crosspoint is active, change the style of the button',
		style: {
			color: self.rgb(0, 0, 0),
			bgcolor: self.rgb(0, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'dest',
				choices: self.LRC_DESTINATIONS,
			},
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				choices: self.LRC_SOURCES,
			},
		],
	}
	feedbacks['lock_state'] = {
		type: 'boolean',
		label: 'Destination Lock State',
		description: 'If the specified destination is locked, change the style of the button',
		style: {
			color: self.rgb(0, 0, 0),
			bgcolor: self.rgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'dest',
				choices: self.LRC_DESTINATIONS,
			},
		],
	}
	feedbacks['protect_state'] = {
		type: 'boolean',
		label: 'Destination Protect State',
		description: 'If the specified destination is protected, change the style of the button',
		style: {
			color: self.rgb(0, 0, 0),
			bgcolor: self.rgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'dest',
				choices: self.LRC_DESTINATIONS,
			},
		],
	}

	self.setFeedbackDefinitions(feedbacks)
}

instance.prototype.actions = function () {
	let self = this

	self.setActions({
		xpoint_take: {
			label: 'Crosspoint Take',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					tooltip: 'Specify a source by name (e.g. "SAT 1") or number (e.g. 6)',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_SOURCES,
					default: '1',
				},
				{
					type: 'dropdown',
					label: 'Source Channel (Level)',
					id: 'source_level',
					tooltip: 'Specify a source level (e.g. 1, "Level 1")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_CHANNELS,
					default: [],
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be specified separated by commas (e.g. "MON 6,MON 5,MON 4" or "1,2,3"). ' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_DESTINATIONS,
					default: [],
				},
				{
					type: 'dropdown',
					label: 'Destination Channel (Level)',
					id: 'destination_level',
					tooltip: 'Specify a destination level (e.g. 1, "Level 1")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_CHANNELS,
					default: [],
				},
			],
		},
		xbuffer: {
			label: 'Crosspoint Buffer Control',
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
		},
		xdisconnect: {
			label: 'Crosspoint Disconnect',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be specified separated by commas (e.g. "MON 6,MON 5,MON 4" or "1,2,3"). ' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_DESTINATIONS,
					default: [],
				},
			],
		},
		xpreset: {
			label: 'Crosspoint Preset',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					tooltip: 'Specify one or more sources',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_SOURCES,
					default: [],
					required: true,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify one or more destinations' + '*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_DESTINATIONS,
					default: [],
				},
			],
		},
		salvo_exec: {
			label: 'Salvo Execution',
			options: [
				{
					type: 'dropdown',
					label: 'Salvo',
					id: 'salvo_id',
					tooltip: 'Specify a salvo by name (e.g. "REST") or number (e.g. 6)',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_SALVOS,
					default: '1',
				},
				{
					type: 'multiselect',
					label: 'Flags',
					id: 'flags',
					tooltip: 'Select all applicable flags',
					choices: self.LRC_CMD_TYPE_XSALVO_FLAGS,
					default: [],
				},
			],
		},
		dest_lock: {
			label: 'Destination Lock',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be specified separated by commas (e.g. "MON 6,MON 5,MON 4" or "1,2,3"). ' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_DESTINATIONS,
					default: [],
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					default: 'OFF',
					tooltip: 'Specify the desired status of the lock',
					choices: [
						{ id: 'OFF', label: 'Unlocked (Off)' },
						{ id: 'ON', label: 'Locked (On)' },
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
		},
		dest_protect: {
			label: 'Destination Protect',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					tooltip:
						'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ' +
						'Multiple destinations may be specified separated by commas (e.g. "MON 6,MON 5,MON 4" or "1,2,3"). ' +
						'*WARNING* An empty destination resolves to all logical destinations.',
					minChoicesForSearch: 0,
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.LRC_DESTINATIONS,
					default: [],
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
					label: 'Override (Force Status Change)',
					id: 'override',
					default: false,
				},
			],
		},
		protocol_query: {
			label: 'Protocol Query',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_PROTOCOL_QUERIES,
				},
			],
		},
		dest_query: {
			label: 'Destination Query',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_DEST_QUERIES,
				},
			],
		},
		source_query: {
			label: 'Source Query',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_SOURCE_QUERIES,
				},
			],
		},
		send_message: {
			label: 'Send a manually-constructed LRC message',
			options: [
				{
					type: 'dropdown',
					label: 'Type',
					id: 'type',
					choices: self.LRC_CMD_TYPES,
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'op',
					choices: self.LRC_OPS,
				},
				{
					type: 'textinput',
					label: 'Arguments',
					id: 'args',
					tooltip: 'There is NO validation for this field.',
				},
			],
		},
		send_raw: {
			label: 'Send a raw message over the socket',
			options: [
				{
					type: 'textinput',
					label: 'Message',
					id: 'message',
					tooltip: 'Only use this if you are absolutely sure of what you are doing. There is NO validation here.',
				},
			],
		},
	})
}

instance.prototype.init_presets = function () {
	let self = this;
	let presets = [];

	let preset_salvo_names = []
	self.LRC_SALVOS.forEach(function (salvo) {
		presets.push({
			category: 'Salvos',
			label: salvo.id,
			bank: {
				style: 'text',
				text: salvo.id,
				size: 'auto',
				color: '16777215',
				bgcolor: self.rgb(0,0,0)
			},
			actions: [{
				action: 'salvo_exec',
				options: {
					salvo_id: salvo.id,
				}
			}],
			feedbacks: [{
				type: 'salvo_state',
				options: {
					salvo: salvo.id
				},
				style: {
					bgcolor: self.rgb(0, 204, 0)
				}
			}]
		});
		preset_salvo_names.push(salvo.id);
	});
	if (preset_salvo_names.length > 0) {
		self.log('debug', 'Added presets for salvos: ' + preset_salvo_names.join(', '))
	} else {
		self.log('debug', 'No salvos found, no presets added')
	}

	self.setPresetDefinitions(presets);
}

instance.prototype.sendSocket = function (message) {
	let self = this

	if (self.socket !== undefined && self.socket.connected) {
		self.socket.send(message)
		self.debug(message)
	} else {
		self.log('error', 'Socket not connected :(')
	}
}

instance.prototype.sendLRCMessage = function (type, op, args) {
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
			self.log('error', 'LRC message validation error: ' + error)
		}
	}
}

instance.prototype.clearRouterData = function () {
	let self = this
	self.LRC_SOURCES = []
	self.LRC_SOURCES_COUNT = 0
	self.LRC_DESTINATIONS = []
	self.LRC_DESTINATIONS_COUNT = 0
	self.LRC_CHANNELS = []
	self.LRC_SALVOS = []
	self.log('debug', 'Locally-cached router data cleared')
}

instance.prototype.queryRouterData = function () {
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
}

instance.prototype.findTarget = function (target_type, needle) {
	let self = this
	let haystack = undefined
	switch (target_type) {
		case 'source':
			haystack = self.LRC_SOURCES
			break
		case 'destination':
			haystack = self.LRC_DESTINATIONS
			break
		case 'salvo':
			haystack = self.LRC_SALVOS
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
}

instance.prototype.parseTarget = function(target_type, target_name) {
	let self = this
	let parsed_target = ''
	let target = ''

	// Attempt to parse the provided target_name to translate any variables
	self.parseVariables(target_name, function(value) {
		parsed_target = unescape(value);
	})

	// Check if parsed target is different from original target to try and determine
	// if it was selected from the dropdown or set using a variable
	if (parsed_target == target_name) {
		// Parsed target is equal to button target, so variables weren't used.
		// Translate button target to numbers or names depending on configuration
		let found_target = this.findTarget('target_type', target_name)
		if (self.config.crosspoint_format === 'numbers') {
			target = found_target.id;
		} else if (self.config.crosspoint_format === 'names') {
			target = found_target.label;
		} else {
			self.log('error', `Unsupported crosspoint format: ${self.config.crosspoint_format}`)
			return
		}
	} else {
		// Parsed source is NOT equal to button source, so variables were used.
		// Send whatever was specified in the variable without any modification/translation
		target = parsed_target
	}
	return target
}

instance.prototype.action = function (action) {
	let self = this
	let options = action.options
	let lrc_type = undefined
	let lrc_op = undefined
	let lrc_args = undefined

	switch (action.action) {
		case 'xpoint_take':
			// ~XPOINT:S${SAT1.SD};D${MON6.SD}\
			let xpoint_args = []

			let button_source = options.source
			let source_level = options.source_level
			let source = this.parseTarget('source', button_source)
			let source_type =
				isNaN(source) || (source_level && isNaN(source_level)) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC

			let button_dest = options.destination
			let dest_level = options.destination_level
			let dest = this.parseTarget('destination', button_dest)
			let dest_type =
				isNaN(dest) || (dest_level && isNaN(dest_level)) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC

			let source_arg_value = (!source_level || source_level === undefined || source_level.length == 0) ? source : source + '.' + source_level
			let dest_arg_value = (!dest_level || dest_level === undefined || dest_level.length == 0) ? dest : dest + '.' + dest_level
			xpoint_args.push('S' + source_type + '{' + source_arg_value + '}')
			xpoint_args.push('D' + dest_type + '{' + dest_arg_value + '}')

			if (!self.config.allow_empty_xpoint_dest && (!dest || (Array.isArray(dest) && dest.length === 0))) {
				// Safeguard to prevent routing the given source to every destination
				// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
				this.log('warn', 'Empty destination safeguard prevented crosspoint take for source ' + source)
				return
			}

			lrc_type = self.LRC_CMD_TYPE_XPOINT.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			lrc_args = xpoint_args.join(';')
			break
		case 'xbuffer':
			// ~XBUFFER:F${EXECUTE};U#{1}\
			lrc_type = self.LRC_CMD_TYPE_XBUFFER.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			let xbuffer_args = []
			xbuffer_args.push(`F${self.LRC_ARG_TYPE_STRING}{${options.action}}`)
			xbuffer_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
			lrc_args = xbuffer_args.join(';')
			break
		case 'xdisconnect':
			// ~XDISCONNECT:D${ALLD 1}\
			let xdisc_args = []
			let xdisc_dest = this.parseTarget('destination', options.destination)
			let xdisc_dest_type =
				xdisc_dest.length > 1 || isNaN(xdisc_dest[0]) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC
			xdisc_args.push(`D${xdisc_dest_type}{${xdisc_dest.join()}}`)
			xdisc_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)

			if (
				!self.config.allow_empty_xpoint_dest &&
				(!xdisc_dest || (Array.isArray(xdisc_dest) && xdisc_dest.length === 0))
			) {
				// Safeguard to prevent routing the given source to every destination
				// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
				self.log('warn', 'Empty destination safeguard prevented crosspoint disconnect')
				return
			}

			lrc_type = self.LRC_CMD_TYPE_XDISCONNECT.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			lrc_args = xdisc_args.join(';')
			break
		case 'xpreset':
			// ~XPRESET:D#{2};S#{1};U#{1}\
			let xpreset_args = []
			let xpreset_source = this.parseTarget('source', options.source)
			let xpreset_source_type =
				xpreset_source.length > 1 || isNaN(xpreset_source[0]) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC
			let xpreset_dest = this.parseTarget('destination', options.destination)
			let xpreset_dest_type =
				xpreset_dest.length > 1 || isNaN(xpreset_dest[0]) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC
			xpreset_args.push(`D${xpreset_dest_type}{${xpreset_dest.join()}}`)
			xpreset_args.push(`S${xpreset_source_type}{${xpreset_source.join()}}`)
			xpreset_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)

			if (
				!self.config.allow_empty_xpoint_dest &&
				(!xpreset_dest || (Array.isArray(xpreset_dest) && xpreset_dest.length === 0))
			) {
				// Safeguard to prevent routing the given source to every destination
				// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
				self.log('warn', 'Empty destination safeguard prevented crosspoint preset for source ' + xpreset_source)
				return
			}

			lrc_type = self.LRC_CMD_TYPE_XPRESET.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			lrc_args = xpreset_args.join(';')
			break
		case 'salvo_exec':
			// ~XSALVO:ID#{1};F${PROTECT,NOTAKE}\
			lrc_type = self.LRC_CMD_TYPE_XSALVO.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			let salvo_args = []
			let id_type = !isNaN(options.salvo_id) ? self.LRC_ARG_TYPE_NUMERIC : self.LRC_ARG_TYPE_STRING
			salvo_args.push('ID' + id_type + '{' + options.salvo_id + '}')
			if (options.hasOwnProperty('flags') && options.flags.length > 0) {
				// F${FLAG,FLAG,FLAG}
				salvo_args.push(`F${self.LRC_ARG_TYPE_STRING}{${options.flags.join()}}`)
			}
			lrc_args = salvo_args.join(';')
			break
		case 'dest_lock':
			// ~LOCK:D${MON6};V${ON};U#{20}\
			lrc_type = self.LRC_CMD_TYPE_LOCK.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			let lock_args = []
			let lock_dest_type = !isNaN(options.destination) ? self.LRC_ARG_TYPE_NUMERIC : self.LRC_ARG_TYPE_STRING
			lock_args.push(`D${lock_dest_type}{${options.destination.join()}}`)
			lock_args.push(`V${self.LRC_ARG_TYPE_STRING}{${options.status}}`)

			if (options.override) {
				// Undocumented User ID "-1" forces an override. The "O" parameter (apparently) does nothing
				lock_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.LRC_CMD_TYPE_LOCK_OVERRIDE_USER}}`)
			} else {
				lock_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
			}
			lrc_args = lock_args.join(';')
			break
		case 'dest_protect':
			// ~PROTECT:D${MON6};V${ON};U#{20}\
			lrc_type = self.LRC_CMD_TYPE_PROTECT.id
			lrc_op = self.LRC_OP_CHANGE_REQUEST.id
			let protect_args = []
			let protect_dest_type = !isNaN(options.destination) ? self.LRC_ARG_TYPE_NUMERIC : self.LRC_ARG_TYPE_STRING
			protect_args.push(`D${protect_dest_type}{${options.destination.join()}}`)
			protect_args.push(`V${self.LRC_ARG_TYPE_STRING}{${options.status}}`)
			if (options.override) {
				// Undocumented User ID "-1" forces an override. The "O" parameter (apparently) does nothing
				protect_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.LRC_CMD_TYPE_LOCK_OVERRIDE_USER}}`)
			} else {
				protect_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
			}
			lrc_args = protect_args.join(';')
			break
		case 'protocol_query':
			// ~PROTOCOL?Q${NAME}\
			lrc_type = self.LRC_CMD_TYPE_PROTOCOL.id
			lrc_op = self.LRC_OP_QUERY.id
			lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${options.query_item}}`
			break
		case 'dest_query':
			// ~DEST?Q${NAME}\
			lrc_type = self.LRC_CMD_TYPE_DEST.id
			lrc_op = self.LRC_OP_QUERY.id
			lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${options.query_item}}`
			break
		case 'source_query':
			// ~SRC?Q${NAME}\
			lrc_type = self.LRC_CMD_TYPE_SRC.id
			lrc_op = self.LRC_OP_QUERY.id
			lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${options.query_item}}`
			break
		case 'send_message':
			lrc_type = options.type
			lrc_op = options.op
			lrc_args = options.args
			break
		case 'send_raw':
			self.sendSocket(options.message)
			return
		default:
			self.log('error', `Unknown action '${action.action}'`)
			return
	}

	if (lrc_type !== undefined && lrc_op !== undefined && lrc_args !== undefined) {
		// Allow for specifying variables manually in button config
		self.parseVariables(lrc_args, function(value) {
			lrc_args = unescape(value);
		})
		self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
	} else {
		self.log('error', 'Missing LRC command parameter')
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
