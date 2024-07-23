const { combineRgb } = require('@companion-module/base')

module.exports = {
	initPresets: function () {
		let self = this
		const presets = {}
		let preset_salvo_names = []

		self.state.salvos.forEach(function (salvo) {
			presets[salvo.id] = {
				category: 'Salvos',
				type: 'button',
				name: salvo.id,
				style: {
					text: salvo.id,
					size: 'auto',
					color: '16777215',
					bgcolor: combineRgb(0, 0, 0),
				},
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
					},
				],
				feedbacks: [
					{
						type: 'salvo_state',
						options: {
							salvo: salvo.id,
						},
						style: {
							bgcolor: combineRgb(0, 204, 0),
						},
					},
				],
			}
			preset_salvo_names.push(salvo.id)
		})
		if (preset_salvo_names.length > 0) {
			self.log('debug', 'Added presets for salvos: ' + preset_salvo_names.join(', '))
		} else {
			self.log('debug', 'No salvos found, no presets added')
		}

		self.setPresetDefinitions(presets)
	},
}
