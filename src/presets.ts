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

	return presets
}
