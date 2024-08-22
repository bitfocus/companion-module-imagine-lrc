const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function () {
		let self = this
		let feedbacks = {}

		feedbacks['salvo_state'] = {
			type: 'boolean',
			name: 'Salvo State',
			description: 'If the crosspoints defined in the salvo are active, change the style of the button',
			defaultStyle: {
				bgColor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'salvo',
					type: 'dropdown',
					label: 'Salvo',
					choices: self.state.salvos,
					default: '',
					allowCustom: true,
					useVariables: true,
				},
			],
			callback: async (feedback, context) => {
				let salvo_id = feedback.options.salvo
				const parsed_salvo_id = await context.parseVariablesInString(salvo_id)
				let salvo_target = self.findTarget('salvo', parsed_salvo_id)
				if (salvo_target && Object.prototype.hasOwnProperty.call(salvo_target, 'state')) {
					return salvo_target.state === 'ON'
				} else {
					self.log('warn', `Salvo '${parsed_salvo_id}' not found or no state property`)
					return false
				}
			},
		}

		feedbacks['xpoint_state'] = {
			type: 'boolean',
			name: 'Crosspoint State',
			description: 'If the specified crosspoint is active, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgColor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
					useVariables: true,
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					choices: self.state.sources,
					default: '',
					allowCustom: true,
					useVariables: true,
				},
			],
			callback: async (feedback, context) => {
				let xpoint_dest_id = feedback.options.dest
				const parsed_dest_id = await context.parseVariablesInString(xpoint_dest_id)
				let xpoint_dest_target = self.findTarget('destination', parsed_dest_id)
				if (xpoint_dest_target && Object.prototype.hasOwnProperty.call(xpoint_dest_target, 'source')) {
					return xpoint_dest_target.source === feedback.options.source
				} else {
					self.log('warn', `Destination '${parsed_dest_id}' not found or no state property`)
					return false
				}
			},
		}

		feedbacks['lock_state'] = {
			type: 'boolean',
			name: 'Destination Lock State',
			description: 'If the specified destination is locked, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgColor: combineRgb(255, 0, 0),
			},
			options: [
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
					useVariables: true,
				},
			],
			callback: async (feedback, context) => {
				let lock_dest_id = feedback.options.dest
				const parsed_lock_id = await context.parseVariablesInString(lock_dest_id)
				let lock_dest_target = self.findTarget('destination', parsed_lock_id)
				if (lock_dest_target && Object.prototype.hasOwnProperty.call(lock_dest_target, 'lock')) {
					return lock_dest_target.lock === 'ON'
				} else {
					self.log('warn', `Destination '${parsed_lock_id}' not found or no lock property`)
					return false
				}
			},
		}

		feedbacks['protect_state'] = {
			type: 'boolean',
			name: 'Destination Protect State',
			description: 'If the specified destination is protected, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgColor: combineRgb(255, 0, 0),
			},
			options: [
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
					useVariables: true,
				},
			],
			callback: async (feedback, context) => {
				let protect_dest_id = feedback.options.dest
				const parsed_protect_id = await context.parseVariablesInString(protect_dest_id)
				let protect_dest_target = self.findTarget('destination', parsed_protect_id)
				if (protect_dest_target && Object.prototype.hasOwnProperty.call(protect_dest_target, 'protect')) {
					return protect_dest_target.protect === 'ON'
				} else {
					self.log('warn', `Destination '${parsed_protect_id}' not found or no protect property`)
					return false
				}
			},
		}

		self.setFeedbackDefinitions(feedbacks)
	},
}
