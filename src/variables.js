module.exports = {
	initVariables: function () {
		let self = this

		const variables = []
		const varVals = []

		self.state.sources.forEach((new_src) => {
			variables.push(
				{
					variableId: `input_${new_src.id}`,
					name: `Input ${new_src.id} Name`,
				},
				{
					variableId: `input_${new_src.label.replaceAll(' ', '_')}_id`,
					name: `Input ${new_src.label} ID`,
				}
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
					name: `Output '${new_dest.label}' Input Lock/Protect State`,
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
				}
			)

			varVals[`output_${new_dest.id}`] = new_dest.label
		})

		self.setVariableDefinitions(variables)

		self.setVariableValues(varVals)

		self.log('debug', `Published variables for ${variables.length} destinations.`)
	},

	updateVariables: function (updated_dests) {
		let self = this

		const variablesToUpdate = {}

		updated_dests.forEach((target) => {
			variablesToUpdate[`output_${target.id}_input`] = target.source
			variablesToUpdate[`output_${target.id}_input_id`] = target.source_id
			variablesToUpdate[`output_${target.id}_lock_state`] = !!(target.lock || target.protect)
			variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input`] = target.source
			variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_input_id`] = target.source_id
			variablesToUpdate[`output_${target.label.replaceAll(' ', '_')}_lock_state`] = !!(target.lock || target.protect)
		})

		self.setVariableValues(variablesToUpdate)
	},
}
