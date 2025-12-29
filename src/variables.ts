import type { ModuleInstance } from './main.js'
import { debounce, ImagineLRCDest } from './types.js'
import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'

const DestinationUpdateQueue: ImagineLRCDest[] = []

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const variables: CompanionVariableDefinition[] = []
	const varVals: CompanionVariableValues = {}

	variables.push(
		{ variableId: 'protocol_name', name: 'Protocol Name' },
		{ variableId: 'protocol_version', name: 'Protocol Version' },
	)

	self.state.channels.forEach((channel) => {
		variables.push({
			variableId: `level_${channel.id}_name`,
			name: `Level ${channel.id} Name`,
		})

		varVals[`level_${channel.id}_name`] = channel.label
	})

	self.state.salvos.forEach((salvo) => {
		variables.push({
			variableId: `salvo_${salvo.id}_state`,
			name: `Salvo ${salvo.id} Activation State`,
		})

		varVals[`salvo_${salvo.id}_state`] = salvo.state
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
				name: `Output '${new_dest.label}' Lock State`,
			},
			{
				variableId: `output_${new_dest.id}_protect_state`,
				name: `Output '${new_dest.label}' Protect State`,
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
				name: `Output '${new_dest.label}' Lock State`,
			},
			{
				variableId: `output_${new_dest.label.replaceAll(' ', '_')}_protect_state`,
				name: `Output '${new_dest.label}' Protect State`,
			},
		)

		varVals[`output_${new_dest.id}`] = new_dest.label
	})

	self.setVariableDefinitions(variables)

	self.setVariableValues(varVals)

	self.log('debug', `Published variables for ${variables.length} objects.`)
}

export function UpdateVariables(self: ModuleInstance, updated_dests: ImagineLRCDest[] = []): void {
	if (updated_dests) {
		DestinationUpdateQueue.push(...updated_dests)
	}

	handleVariableUpdates(self)
}

const handleVariableUpdates = debounce(doVariableUpdates, 300)

function doVariableUpdates(module: ModuleInstance): void {
	const variablesToUpdate: CompanionVariableValues = {}

	DestinationUpdateQueue.forEach((target: ImagineLRCDest) => {
		variablesToUpdate[`output_${target.id}_input`] = target.source?.label
		variablesToUpdate[`output_${target.id}_input_id`] = target.source?.id
		variablesToUpdate[`output_${target.id}_lock_state`] = target.lock === 'ON'
		variablesToUpdate[`output_${target.id}_protect_state`] = target.protect === 'ON'
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input`] = target.source?.label
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input_id`] = target.source?.id
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_lock_state`] = target.lock === 'ON'
		variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_protect_state`] = target.protect === 'ON'
	})

	module.setVariableValues(variablesToUpdate)
}
