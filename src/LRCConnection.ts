import { InstanceStatus, TCPHelper } from '@companion-module/base'
import { ModuleInstance } from './main.js'
import { LRCMessage } from './LRCMessage.js'
import { debounce, LRCArgumentType, LRCEntityType, LRCOperation } from './types.js'
import { LRCHandlers } from './handlers.js'

export class LRCConnection {
	socket?: TCPHelper
	moduleInstance: ModuleInstance
	dataQueue: string = ''

	constructor(host: string, port: number, moduleInstance: ModuleInstance) {
		this.moduleInstance = moduleInstance

		moduleInstance.log('info', `Opening connection to ${host}:${port}`)
		moduleInstance.updateStatus(InstanceStatus.UnknownWarning, 'Connection Pending')

		this.socket = new TCPHelper(host, port)

		this.socket.on('error', (err) => {
			moduleInstance.log('error', 'Connection Error: ' + err)
			moduleInstance.updateStatus(InstanceStatus.ConnectionFailure, err.message)
		})

		this.socket.on('connect', () => {
			moduleInstance.updateStatus(InstanceStatus.Ok, 'Connected')
			moduleInstance.log('info', `Successfully connect to LRC Server`)
			this.requestInitialData(moduleInstance.config.salvo_count)
		})

		this.socket.on('data', (buffer) => {
			this.appendReceivedDataToQueue(buffer)
			dataQueueHandler()
		})

		const dataQueueHandler = debounce(() => {
			this.processQueuedData()
		}, 750)
	}

	destroy(): void {
		this.socket?.destroy()
	}

	isConnected(): boolean {
		return !!this.socket?.isConnected
	}

	appendReceivedDataToQueue(data: Buffer): void {
		this.dataQueue += data.toString()
	}

	processQueuedData(): void {
		while (this.dataQueue.length) {
			const messageSelector = this.dataQueue.match(/~\w+[%:!?](?:\w+[$#&]{[^{}\\]*})?(?:;\w+[$#&]{[^{}\\]*})*\\/)
			if (messageSelector) {
				const len = messageSelector[0].length
				this.dataQueue = this.dataQueue.slice(len)
				try {
					this.processReceivedMessage(LRCMessage.parseFromString(messageSelector[0]))
				} catch (e) {
					this.moduleInstance.log('error', `Cant process received LRC message: ${e}`)
				}
			}
		}
	}

	processReceivedMessage(message: LRCMessage): void {
		if (!message.containsUpdate()) {
			// Don't attempt to handle QUERY or CHANGE REQUEST messages inbound
			return
		}

		let regenerate = false

		switch (message.type) {
			case LRCEntityType.DBCHANGE:
				this.moduleInstance.log('info', 'Received DBCHANGE notification...refreshing state data...')
				this.requestInitialData()
				break

			case LRCEntityType.PROTOCOL:
				LRCHandlers.handleProtocolUpdate(message, this.moduleInstance)
				break

			case LRCEntityType.SRC:
				LRCHandlers.handleSourceUpdates(message, this.moduleInstance)
				regenerate = true
				break

			case LRCEntityType.DEST:
				LRCHandlers.handleDestUpdates(message, this.moduleInstance)
				regenerate = true
				break

			case LRCEntityType.XSALVO:
				LRCHandlers.handleSalvoUpdates(message, this.moduleInstance)
				regenerate = true
				break

			case LRCEntityType.CHANNELS:
				LRCHandlers.handleChannelUpdates(message, this.moduleInstance)
				regenerate = true
				break

			case LRCEntityType.XPOINT:
				LRCHandlers.handleXpointUpdates(message, this.moduleInstance)
				this.moduleInstance.evaluateFeedbacks()
				break

			default:
				this.moduleInstance.log(
					'debug',
					`Received LRC Message with no handler: ${message.type} : ${message.operation}.`,
				)
				break
		}

		if (regenerate) {
			this.moduleInstance.reInitialize()
		}
	}

	sendLRCMessage(message: LRCMessage | LRCMessage[]): void {
		if (Array.isArray(message)) {
			message.forEach((msg) => this.sendLRCMessage(msg))
			return
		}

		if (this.socket) {
			const messageText = message.assemble()
			this.socket
				.send(messageText)
				.then(() => {
					this.moduleInstance.log('debug', `Sent data: ${messageText}`)
				})
				.catch((err) => {
					this.moduleInstance.log('error', `Error sending data: ${messageText} - ${err}`)
				})
		} else {
			this.moduleInstance.log('error', 'LRC Server not connected - cant send.')
		}
	}

	sendRaw(message: string): void {
		if (this.socket) {
			this.socket
				.send(message)
				.then(() => {
					this.moduleInstance.log('debug', `Sent raw data: ${message}`)
				})
				.catch((err) => {
					this.moduleInstance.log('error', `Error sending raw data: ${message} - ${err}`)
				})
		} else {
			this.moduleInstance.log('error', 'LRC Server not connected - cant send.')
		}
	}

	requestInitialData(salvoCount?: number): void {
		this.moduleInstance.log('debug', 'Requesting initial state data')

		// Query router for various data to be cached locally for use in UI and within the module
		const messageQueue = []

		// Protocol Details
		messageQueue.push(
			new LRCMessage(LRCEntityType.PROTOCOL, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'NAME'),
			new LRCMessage(LRCEntityType.PROTOCOL, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'VERSION'),
		)

		// Sources
		messageQueue.push(
			new LRCMessage(LRCEntityType.SRC, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'COUNT'),
			new LRCMessage(LRCEntityType.SRC, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'NAME'),
		)

		// Destinations
		messageQueue.push(
			new LRCMessage(LRCEntityType.DEST, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'COUNT'),
			new LRCMessage(LRCEntityType.DEST, LRCOperation.QUERY).addArgument('Q', LRCArgumentType.STRING, 'NAME'),
		)

		// Channels
		messageQueue.push(new LRCMessage(LRCEntityType.CHANNELS, LRCOperation.QUERY))

		// Salvos
		for (const i of [...Array((salvoCount ?? 4) + 1).keys()]) {
			messageQueue.push(
				new LRCMessage(LRCEntityType.XSALVO, LRCOperation.QUERY).addArgument('ID', LRCArgumentType.NUMERIC, i),
			)
		}

		// Crosspoints
		messageQueue.push(new LRCMessage(LRCEntityType.XPOINT, LRCOperation.QUERY))

		// Send Queue
		messageQueue.forEach((message) => this.sendLRCMessage(message))
	}
}
