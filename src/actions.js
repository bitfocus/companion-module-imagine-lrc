module.exports = {
	initActions: function () {
		let self = this
		let actions = {}

		actions.xpoint_take = {
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
					default: self.state.channels.length ? self.state.channels[0].id : undefined,
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
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
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
					default: self.state.channels.length ? self.state.channels[0].id : undefined,
				},
			],
			callback: async (action) => {
				// ~XPOINT:S${SAT1.SD};D${MON6.SD}\
				let xpoint_args = []

				let button_source = action.options.source
				let source_level = action.options.source_level
				let source = await self.parseTarget('source', button_source)
				let source_type =
					isNaN(source) || (source_level && isNaN(source_level)) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC

				let button_dest = action.options.destination
				let dest_level = action.options.destination_level
				// Destination is an array even if there's just one item since we're using tags
				let dests = []
				for (const target of button_dest) {
					let parsed_target = await self.parseTarget('destination', target)
					dests.push(parsed_target)
				}

				let dest = dests.length > 1 ? dests.join(',') : dests[0]
				let dest_type =
					isNaN(dest) || (dest_level && isNaN(dest_level)) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC

				let source_arg_value =
					!source_level || source_level === undefined || source_level.length == 0 ? source : source + '.' + source_level
				let dest_arg_value =
					!dest_level || dest_level === undefined || dest_level.length == 0 ? dest : dest + '.' + dest_level
				let source_arg = 'S' + source_type + '{' + source_arg_value + '}'
				let dest_arg = 'D' + dest_type + '{' + dest_arg_value + '}'
				xpoint_args.push(source_arg, dest_arg)
				if (source_type !== dest_type) {
					self.log(
						'warn',
						`Crosspoint Source (${source_arg}) and destination (${dest_arg}) argument types don't match, this may result in unpredictable routing results`
					)
				}

				if (!self.config.allow_empty_xpoint_dest && (!dest || (Array.isArray(dest) && dest.length === 0))) {
					// Safeguard to prevent routing the given source to every destination
					// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
					self.log('warn', 'Empty destination safeguard prevented crosspoint take for source ' + source)
					return
				}

				let lrc_type = self.LRC_CMD_TYPE_XPOINT.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let lrc_args = xpoint_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.xbuffer = {
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
				let lrc_type = self.LRC_CMD_TYPE_XBUFFER.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let xbuffer_args = []
				xbuffer_args.push(`F${self.LRC_ARG_TYPE_STRING}{${action.options.action}}`)
				xbuffer_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
				let lrc_args = xbuffer_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.xdisconnect = {
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
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.destinations,
					default: undefined,
				},
			],
			callback: async (action) => {
				// ~XDISCONNECT:D${ALLD 1}\
				let xdisc_args = []

				// Destination is an array even if there's just one item since we're using tags
				let xdisc_dest = []
				for (const target of action.options.destination) {
					let parsed_target = await self.parseTarget('destination', target)
					xdisc_dest.push(parsed_target)
				}

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

				let lrc_type = self.LRC_CMD_TYPE_XDISCONNECT.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let lrc_args = xdisc_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.xpreset = {
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
					default: undefined,
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
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.destinations,
					default: undefined,
				},
			],
			callback: async (action) => {
				// ~XPRESET:D#{2};S#{1};U#{1}\
				let xpreset_args = []
				let xpreset_source = await this.parseTarget('source', action.options.source)
				let xpreset_source_type = isNaN(xpreset_source) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC

				// Destination is an array even if there's just one item since we're using tags
				let xpreset_dests = []
				for (const target of action.options.destination) {
					let parsed_target = await self.parseTarget('destination', target)
					xpreset_dests.push(parsed_target)
				}

				let xpreset_dest = xpreset_dests.length > 1 ? xpreset_dests.join(',') : xpreset_dests[0]
				let xpreset_dest_type =
					xpreset_dest.length > 1 || isNaN(xpreset_dest[0]) ? self.LRC_ARG_TYPE_STRING : self.LRC_ARG_TYPE_NUMERIC
				let xpreset_dest_arg = `D${xpreset_dest_type}{${xpreset_dest}}`
				let xpreset_src_arg = `S${xpreset_source_type}{${xpreset_source}}`
				let xpreset_user_arg = `U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`
				xpreset_args.push(xpreset_dest_arg, xpreset_src_arg, xpreset_user_arg)
				if (xpreset_source_type !== xpreset_dest_type) {
					this.log(
						'warn',
						`Crosspoint Preset Source (${xpreset_src_arg}) and destination (${xpreset_dest_arg}) argument types don't match, this may result in unpredictable routing results`
					)
				}

				if (
					!self.config.allow_empty_xpoint_dest &&
					(!xpreset_dest || (Array.isArray(xpreset_dest) && xpreset_dest.length === 0))
				) {
					// Safeguard to prevent routing the given source to every destination
					// In Query (?) or Change (:) operations, an empty or missing destination list resolves to all logical destinations.
					self.log('warn', 'Empty destination safeguard prevented crosspoint preset for source ' + xpreset_source)
					return
				}

				let lrc_type = self.LRC_CMD_TYPE_XPRESET.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let lrc_args = xpreset_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.salvo_exec = {
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
					default: undefined,
				},
				{
					type: 'multidropdown',
					label: 'Flags',
					id: 'flags',
					tooltip: 'Select all applicable flags',
					choices: self.LRC_CMD_TYPE_XSALVO_FLAGS,
					default: [],
				},
			],
			callback: (action) => {
				let lrc_type = self.LRC_CMD_TYPE_XSALVO.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let salvo_args = []
				let id_type = !isNaN(action.options.salvo_id) ? self.LRC_ARG_TYPE_NUMERIC : self.LRC_ARG_TYPE_STRING
				salvo_args.push(`ID${id_type}{${action.options.salvo_id}}`)
				if (self.config.send_user_id_with_xsalvo === true) {
					salvo_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
				}
				if (Object.prototype.hasOwnProperty.call(action.options, 'flags') && action.options.flags.length > 0) {
					// F${FLAG,FLAG,FLAG}
					salvo_args.push(`F${self.LRC_ARG_TYPE_STRING}{${action.options.flags.join()}}`)
				}
				let lrc_args = salvo_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.dest_lock = {
			name: 'Destination Lock (LOCK)',
			description: 'Secure a destination from further crosspoint status changes by any user including the lock owner',
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
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.destinations,
					default: undefined,
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
			callback: (action) => {
				// ~LOCK:D${MON6};V${ON};U#{20}\
				let lrc_type = self.LRC_CMD_TYPE_LOCK.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let lock_args = []
				let lock_dest_type = !isNaN(action.options.destination) ? self.LRC_ARG_TYPE_NUMERIC : self.LRC_ARG_TYPE_STRING
				lock_args.push(`D${lock_dest_type}{${action.options.destination.join()}}`)
				lock_args.push(`V${self.LRC_ARG_TYPE_STRING}{${action.options.status}}`)

				if (action.options.override) {
					// Undocumented User ID "-1" forces an override. The "O" parameter (apparently) does nothing
					lock_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.LRC_CMD_TYPE_LOCK_OVERRIDE_USER}}`)
				} else {
					lock_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
				}
				let lrc_args = lock_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.dest_protect = {
			name: 'Destination Protect (PROTECT)',
			description: 'Secure a destination from further changes requested by anyone except the lock owner (user)',
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
					allowCustom: true,
					multiple: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.destinations,
					default: undefined,
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
				// ~PROTECT:D${MON6};V${ON};U#{20}\
				let lrc_type = self.LRC_CMD_TYPE_PROTECT.id
				let lrc_op = self.LRC_OP_CHANGE_REQUEST.id
				let protect_args = []
				let protect_dest_type = !isNaN(action.options.destination)
					? self.LRC_ARG_TYPE_NUMERIC
					: self.LRC_ARG_TYPE_STRING
				protect_args.push(`D${protect_dest_type}{${action.options.destination.join()}}`)
				protect_args.push(`V${self.LRC_ARG_TYPE_STRING}{${action.options.status}}`)
				if (action.options.override) {
					// Undocumented User ID "-1" forces an override. The "O" parameter (apparently) does nothing
					protect_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.LRC_CMD_TYPE_LOCK_OVERRIDE_USER}}`)
				} else {
					protect_args.push(`U${self.LRC_ARG_TYPE_NUMERIC}{${self.config.user_id}}`)
				}
				let lrc_args = protect_args.join(';')
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.protocol_query = {
			name: 'Protocol Query (PROTOCOL)',
			description: 'Query protocol version information',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_PROTOCOL_QUERIES,
					default: 'NAME',
				},
			],
			callback: (action) => {
				// ~PROTOCOL?Q${NAME}\
				let lrc_type = self.LRC_CMD_TYPE_PROTOCOL.id
				let lrc_op = self.LRC_OP_QUERY.id
				let lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${action.options.query_item}}`
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.dest_query = {
			name: 'Destination Query (DEST)',
			description: 'Query the system for the list of valid logical destinations',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_DEST_QUERIES,
					default: 'COUNT',
				},
			],
			callback: (action) => {
				// ~DEST?Q${NAME}\
				let lrc_type = self.LRC_CMD_TYPE_DEST.id
				let lrc_op = self.LRC_OP_QUERY.id
				let lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${action.options.query_item}}`
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.source_query = {
			name: 'Source Query (SRC)',
			description: 'Query the system for information about valid logical sources',
			options: [
				{
					type: 'dropdown',
					label: 'Query Item',
					id: 'query_item',
					choices: self.LRC_CMD_TYPE_SOURCE_QUERIES,
					default: 'COUNT',
				},
			],
			callback: (action) => {
				// ~SRC?Q${NAME}\
				let lrc_type = self.LRC_CMD_TYPE_SRC.id
				let lrc_op = self.LRC_OP_QUERY.id
				let lrc_args = `Q${self.LRC_ARG_TYPE_STRING}{${action.options.query_item}}`
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.send_message = {
			name: 'Send a manually-constructed LRC message',
			options: [
				{
					type: 'dropdown',
					label: 'Type',
					id: 'type',
					choices: self.LRC_CMD_TYPES,
					default: 'XPOINT',
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'op',
					choices: self.LRC_OPS,
					default: ':',
				},
				{
					type: 'textinput',
					label: 'Arguments',
					id: 'args',
					tooltip: 'There is NO validation for this field.',
					withVariables: true,
				},
			],
			callback: (action) => {
				let lrc_type = action.options.type
				let lrc_op = action.options.op
				let lrc_args = action.options.args
				self.sendLRCMessage(lrc_type, lrc_op, lrc_args)
			},
		}

		actions.send_raw = {
			name: 'Send a raw message over the socket',
			options: [
				{
					type: 'textinput',
					label: 'Message',
					id: 'message',
					tooltip: 'Only use this if you are absolutely sure of what you are doing. There is NO validation here.',
					withVariables: true,
				},
			],
			callback: (action) => {
				self.sendSocket(action.options.message)
			},
		}

		self.setActionDefinitions(actions)
	},
}
