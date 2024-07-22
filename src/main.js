const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const GetConfigFields = require('./config')
const utils = require('./utils')

class ImagineLRCInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		let self = this

		// Assign the methods from the listed files to this class
		Object.assign(self, {
			...GetConfigFields,
			...utils,
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
		this.updateActions()
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

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ImagineLRCInstance, UpgradeScripts)
