module.exports = function (self) {
	self.setActionDefinitions({
		sample_action: {
			name: 'My First Action',
			options: [
				{
					id: 'num',
					type: 'number',
					label: 'Test',
					default: 5,
					min: 0,
					max: 100,
				},
			],
			callback: async (event) => {
				console.log('Hello world!', event.options.num)
			},
		},
		xpoint_take: {
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
			callback: async (event) => {
				console.log('XPOINT_TAKE', event.options.num)
			},
		},
	})
}
