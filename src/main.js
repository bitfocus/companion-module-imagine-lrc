const { InstanceBase, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const GetConfigFields = require('./config')
const constants = require('./constants')
const utils = require('./utils')
const actions = require('./actions')
const presets = require('./presets')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

class ImagineLRCInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		let self = this

		// Assign the methods from the listed files to this class
		Object.assign(self, {
			...GetConfigFields,
			...constants,
			...utils,
			...actions,
			...presets,
		})

		this.state = {
			protocol_version: 0,
			sources: [],
			sources_count: 0,
			destinations: [],
			destinations_count: 0,
			channels: [],
			salvos: [],
		}
	}

	async init(config) {
		this.config = config
		this.initConnection()
		this.initActions()
		this.initPresets()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
		this.initConnection()
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ImagineLRCInstance, UpgradeScripts)
