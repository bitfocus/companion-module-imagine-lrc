import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import { LRCState } from './LRCState.js'

export function GetPresets(state: LRCState): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	for (const salvo of state.salvos) {
		presets[`salvo_exec_${salvo.id}`] = {
			category: 'Execute Salvo',
			name: `Salvo Execution button for "${salvo.label}"`,
			type: 'button',
			style: {
				text: `${salvo.label} (${salvo.id})`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: 'salvo_state',
					options: {
						salvo: salvo.id,
					},
					style: {
						bgcolor: combineRgb(0, 204, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'salvo_exec',
							options: {
								salvo_id: salvo.id,
							},
						},
					],
					up: [],
				},
			],
		}
	}

	presets['xpoint_local_var'] = {
		category: 'Crosspoints',
		name: `Crosspoint by Local Variables`,
		type: 'button',
		style: {
			text: '`${$(local:srcName)}\\n-->\\n${$(local:destName)}`',
			textExpression: true,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: 'xpoint_state',
				options: {
					useVariables: true,
					dest_var: '$(local:destName)',
					source_var: '$(local:srcName)',
				},
				style: {
					bgcolor: combineRgb(0, 204, 0),
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'xpoint_take',
						options: {
							useVariables: true,
							destination_var: '$(local:destName)',
							destination_level: '',
							source_var: '$(local:srcName)',
							source_level: '',
						},
					},
				],
				up: [],
			},
		],
	}

	return presets
}
