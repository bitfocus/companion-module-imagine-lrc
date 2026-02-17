import { ImagineLRCChannel, ImagineLRCDest, ImagineLRCSalvo, ImagineLRCSource, LRCEntityType } from './types.js'

export class LRCState {
	protocol_version: number = 0
	sources: ImagineLRCSource[] = []
	sources_count: number = 0
	destinations: ImagineLRCDest[] = []
	destinations_count: number = 0
	channels: ImagineLRCChannel[] = []
	salvos: ImagineLRCSalvo[] = []

	constructor() {}

	resolveTarget(targetType: LRCEntityType.SRC, searchTerm: string | number): ImagineLRCSource
	resolveTarget(targetType: LRCEntityType.DEST, searchTerm: string | number): ImagineLRCDest
	resolveTarget(targetType: LRCEntityType.XSALVO, searchTerm: string | number): ImagineLRCSalvo
	resolveTarget(targetType: LRCEntityType.CHANNELS, searchTerm: string | number): ImagineLRCChannel
	resolveTarget(
		targetType: LRCEntityType,
		searchTerm: string | number,
	): ImagineLRCSource | ImagineLRCDest | ImagineLRCSalvo | ImagineLRCChannel | undefined {
		let collection = []

		switch (targetType) {
			case LRCEntityType.SRC:
				collection = this.sources
				break

			case LRCEntityType.DEST:
				collection = this.destinations
				break

			case LRCEntityType.XSALVO:
				collection = this.salvos
				break

			case LRCEntityType.CHANNELS:
				collection = this.channels
				break

			default:
				return undefined
		}

		const targetById = collection.find((i) => i.id === searchTerm)
		if (targetById) {
			return targetById
		}

		const targetByLabel = collection.find((i) => i.label === searchTerm)
		if (targetByLabel) {
			return targetByLabel
		}

		return undefined
	}
}
