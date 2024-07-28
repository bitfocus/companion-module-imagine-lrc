const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function() {
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
					default: ''
				},
			],
			callback: (feedback) => {
				let salvo_id = feedback.options.salvo
				let salvo_target = self.findTarget('salvo', salvo_id)
				if (salvo_target && salvo_target.hasOwnProperty('state')) {
					return salvo_target.state === 'ON'
				} else {
					self.log('warn', `Salvo '${salvo_id}' not found or no state property`)
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
					default: ''
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					choices: self.state.sources,
					default: ''
				},
			],
			callback: (feedback) => {
				let xpoint_dest_id = feedback.options.dest
				let xpoint_dest_target = self.findTarget('destination', xpoint_dest_id)
				if (xpoint_dest_target && xpoint_dest_target.hasOwnProperty('source')) {
					return xpoint_dest_target.source === feedback.options.source
				} else {
					self.log('warn', `Destination '${xpoint_dest_id}' not found or no state property`)
					return false
				}
			}
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
					default: ''
				},
			],
			callback: (feedback) => {
				let lock_dest_id = feedback.options.dest
				let lock_dest_target = self.findTarget('destination', lock_dest_id)
				if (lock_dest_target && lock_dest_target.hasOwnProperty('lock')) {
					return lock_dest_target.lock === 'ON'
				} else {
					self.log('warn', `Destination '${lock_dest_id}' not found or no lock property`)
					return false
				}
			}
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
					default: ''
				},
			],
			callback: (feedback) => {
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

		self.setFeedbackDefinitions(feedbacks);
	}
}