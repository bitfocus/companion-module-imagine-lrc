module.exports = {
	initActions: function () {
		let self = this
		let actions = {}

		actions.xpoint_take = {
			name: 'Crosspoint Take',
			description: 'Sends a XPOINT_TAKE command to the router with the specified options',
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
					type: 'dropdown',
					label: 'Source Channel (Level)',
					id: 'source_level',
					tooltip: 'Specify a source level (e.g. 1, "Level 1")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.channels,
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
				{
					type: 'dropdown',
					label: 'Destination Channel (Level)',
					id: 'destination_level',
					tooltip: 'Specify a destination level (e.g. 1, "Level 1")',
					minChoicesForSearch: 0,
					allowCustom: true,
					regex: '/^[^~\\{},]+$/',
					choices: self.state.channels,
					default: undefined,
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
			name: 'Crosspoint Buffer Control',
			description: 'Sends a XBUFFER command to the router with the specifid options',
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
			}
		}

		self.setActionDefinitions(actions)
	},
}
