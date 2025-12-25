import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariables } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { GetPresets } from './presets.js'
import { LRCState } from './LRCState.js'
import { LRCConnection } from './LRCConnection.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	connection!: LRCConnection // Setup in init()
	state: LRCState

	constructor(internal: unknown) {
		super(internal)

		this.state = new LRCState()
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions

		this.connection = new LRCConnection(this.config.host, this.config.port, this)
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.connection.destroy()
		this.connection = new LRCConnection(this.config.host, this.config.port, this)
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresets(): void {
		this.setPresetDefinitions(GetPresets(this.state))
	}

	updateVariables = UpdateVariables
}

runEntrypoint(ModuleInstance, UpgradeScripts)
