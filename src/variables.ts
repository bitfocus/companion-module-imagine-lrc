import type { ModuleInstance } from './main.js'
import { ImagineLRCDest } from './types.js'
import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const variables: CompanionVariableDefinition[] = []
	const varVals: CompanionVariableValues = {}

	self.state.channels.forEach((channel) => {
		variables.push({
			variableId: `level_${channel.id}_name`,
			name: `Level ${channel.id} Name`,
		})

		varVals[`level_${channel.id}_name`] = channel.label
	})

	self.state.sources.forEach((new_src) => {
		variables.push(
			{
				variableId: `input_${new_src.id}`,
				name: `Input ${new_src.id} Name`,
			},
			{
				variableId: `input_${new_src.label.replaceAll(' ', '_')}_id`,
				name: `Input ${new_src.label} ID`,
			},
		)

		varVals[`input_${new_src.id}`] = new_src.label
		varVals[`input_${new_src.label.replaceAll(' ', '_')}_id`] = new_src.id
	})

	self.state.destinations.forEach((new_dest) => {
		variables.push(
			{
				variableId: `output_${new_dest.id}`,
				name: `Dest ${new_dest.id} Name`,
			},
			{
				variableId: `output_${new_dest.id}_input`,
				name: `Output '${new_dest.label}' Input Name`,
			},
			{
				variableId: `output_${new_dest.id}_input_id`,
				name: `Output '${new_dest.label}' Input ID`,
			},
			{
				variableId: `output_${new_dest.id}_lock_state`,
				name: `Output '${new_dest.label}' Lock/Protect State`,
			},
			{
				variableId: `output_${new_dest.label.replaceAll(' ', '_')}_input`,
				name: `Output '${new_dest.label}' Input Name`,
			},
			{
				variableId: `output_${new_dest.label.replaceAll(' ', '_')}_input_id`,
				name: `Output '${new_dest.label}' Input ID`,
			},
			{
				variableId: `output_${new_dest.label.replaceAll(' ', '_')}_lock_state`,
				name: `Output '${new_dest.label}' Lock/Protect State`,
			},
		)

		varVals[`output_${new_dest.id}`] = new_dest.label
	})

	self.setVariableDefinitions(variables)

	self.setVariableValues(varVals)

	self.log('debug', `Published variables for ${variables.length} destinations.`)
}

export function UpdateVariables(self: ModuleInstance, updated_dests: ImagineLRCDest[] = []): void {
	const variablesToUpdate: CompanionVariableValues = {}

	updated_dests.forEach((target: ImagineLRCDest) => {
		const lock_state = target.lock === 'ON' || target.protect === 'ON'

		variablesToUpdate[`output_${target.id}_input`] = target.source.label
		variablesToUpdate[`output_${target.id}_input_id`] = target.source.id
		variablesToUpdate[`output_${target.id}_lock_state`] = lock_state
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input`] = target.source.label
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input_id`] = target.source.id
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_lock_state`] = lock_state
	})

	self.setVariableValues(variablesToUpdate)
}
