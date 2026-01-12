import type { ModuleInstance } from './main.js'
import { combineRgb } from '@companion-module/base'
import { LRCEntityType } from './types.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		salvo_state: {
			name: 'Salvo State',
			type: 'boolean',
			description: 'If the crosspoints defined in the salvo are active, change the style of the button',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
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
				},
			],
			callback: async (feedback, context) => {
				if (!self.connection.isConnected()) {
					return false
				}
				const salvo_id = feedback.options.salvo
				const parsed_salvo_id = await context.parseVariablesInString(salvo_id + '')
				const salvo_target = self.state.resolveTarget(LRCEntityType.XSALVO, parsed_salvo_id)
				if (salvo_target && Object.prototype.hasOwnProperty.call(salvo_target, 'state')) {
					return salvo_target.state === 'ON'
				} else {
					self.log('warn', `Salvo '${parsed_salvo_id}' not found or no state property`)
					return false
				}
			},
		},
		xpoint_state: {
			name: 'Crosspoint State',
			type: 'boolean',
			description: 'If the specified crosspoint is active, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					type: 'checkbox',
					label: 'Use Variables?',
					id: 'useVariables',
					tooltip: 'Use variables to define targets instead of dropdowns/selections',
					default: false,
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					choices: self.state.sources,
					default: '',
					allowCustom: true,
					isVisibleExpression: '!$(options:useVariables)',
				},
				{
					id: 'source_var',
					type: 'textinput',
					label: 'Source',
					tooltip: 'Specify a source by name (e.g. "SAT 1") or number (e.g. 6)',
					regex: '/^[^~\\{},]+$/',
					useVariables: true,
					default: '',
					isVisibleExpression: '$(options:useVariables)',
				},
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
					isVisibleExpression: '!$(options:useVariables)',
				},
				{
					id: 'dest_var',
					type: 'textinput',
					label: 'Destination',
					tooltip: 'Specify a destination by name (e.g. "MON 6") or number (e.g. 1). ',
					default: '',
					useVariables: true,
					isVisibleExpression: '$(options:useVariables)',
				},
			],
			callback: async (feedback, context) => {
				if (!self.connection.isConnected()) {
					return false
				}

				const parsed_dest_id = feedback.options.useVariables
					? await context.parseVariablesInString(`${feedback.options.dest_var}`)
					: `${feedback.options.dest}`
				const parsed_src_id = feedback.options.useVariables
					? await context.parseVariablesInString(`${feedback.options.source_var}`)
					: `${feedback.options.source}`

				const xpoint_dest_target = self.state.resolveTarget(LRCEntityType.DEST, parsed_dest_id)
				const xpoint_src_target = self.state.resolveTarget(LRCEntityType.SRC, parsed_src_id)

				if (!xpoint_dest_target || !xpoint_src_target) {
					return false
				}
				if (Object.prototype.hasOwnProperty.call(xpoint_dest_target, 'source')) {
					return (
						xpoint_dest_target.source.id === xpoint_src_target.id ||
						xpoint_dest_target.source.label === xpoint_src_target.label
					)
				} else {
					self.log('warn', `Destination '${parsed_dest_id}' not found or no source status present`)
					return false
				}
			},
		},
		lock_state: {
			name: 'Destination Lock State',
			type: 'boolean',
			description: 'If the specified destination is locked, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 0, 0),
			},
			options: [
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
				},
			],
			callback: async (feedback, context) => {
				if (!self.connection.isConnected()) {
					return false
				}
				const lock_dest_id = feedback.options.dest
				const parsed_lock_id = await context.parseVariablesInString(lock_dest_id + '')
				const lock_dest_target = self.state.resolveTarget(LRCEntityType.DEST, parsed_lock_id)
				if (lock_dest_target && Object.prototype.hasOwnProperty.call(lock_dest_target, 'lock')) {
					return lock_dest_target.lock === 'ON'
				} else {
					self.log('warn', `Destination '${parsed_lock_id}' not found or no lock property`)
					return false
				}
			},
		},
		protect_state: {
			name: 'Destination Protect State',
			type: 'boolean',
			description: 'If the specified destination is protected, change the style of the button',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 0, 0),
			},
			options: [
				{
					id: 'dest',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.destinations,
					default: '',
					allowCustom: true,
				},
			],
			callback: async (feedback, context) => {
				if (!self.connection.isConnected()) {
					return false
				}
				const protect_dest_id = feedback.options.dest
				const parsed_protect_id = await context.parseVariablesInString(protect_dest_id + '')
				const protect_dest_target = self.state.resolveTarget(LRCEntityType.DEST, parsed_protect_id)
				if (protect_dest_target && Object.prototype.hasOwnProperty.call(protect_dest_target, 'protect')) {
					return protect_dest_target.protect === 'ON'
				} else {
					self.log('warn', `Destination '${parsed_protect_id}' not found or no protect property`)
					return false
				}
			},
		},
	})
}
