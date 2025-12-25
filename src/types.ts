export type ImagineLRCSource = {
	id: number
	label: string
}

export type ImagineLRCDest = {
	id: number
	label: string
	source: ImagineLRCSource
	lock: string
	protect: string
}

export type ImagineLRCChannel = {
	id: number
	label: string
}

export type ImagineLRCSalvo = {
	id: number
	label: string
	state: string
}

export enum LRCEntityType {
	XPOINT = 'XPOINT',
	LOCK = 'LOCK',
	PROTECT = 'PROTECT',
	CHANNELS = 'CHANNELS',
	DEST = 'DEST',
	SRC = 'SRC',
	DBCHANGE = 'DBCHANGE',
	CONNECTION = 'CONNECTION',
	PROTOCOL = 'PROTOCOL',
	XBUFFER = 'XBUFFER',
	XDISCONNECT = 'XDISCONNECT',
	XPRESET = 'XPRESET',
	XSALVO = 'XSALVO',
}

export const LRCEntityTypeLabels = [
	{ id: 'XPOINT', label: 'Crosspoint Control' },
	{ id: 'LOCK', label: 'Destination Lock' },
	{ id: 'PROTECT', label: 'Destination Protect' },
	{ id: 'CHANNELS', label: 'Logical Channel (Level)' },
	{ id: 'DEST', label: 'Logical Destination' },
	{ id: 'SRC', label: 'Logical Source' },
	{ id: 'DBCHANGE', label: 'Database Change Notification' },
	{ id: 'CONNECTION', label: 'Connection (Session) Control' },
	{ id: 'PROTOCOL', label: 'Protocol Information' },
	{ id: 'XBUFFER', label: 'Crosspoint Buffer Control' },
	{ id: 'XDISCONNECT', label: 'Disconnect Logical Crosspoint' },
	{ id: 'XPRESET', label: 'Crosspoint Preset' },
	{ id: 'XSALVO', label: 'Crosspoint Salvo' },
]

export enum LRCOperation {
	QUERY = '?',
	QUERY_RESPONSE = '%',
	CHANGE_REQUEST = ':',
	CHANGE_NOTIFICATION = '!',
}

export const LRCOperationLabels = [
	{ id: '?', label: 'Query' },
	{ id: '%', label: 'Query Response' },
	{ id: ':', label: 'Change Request' },
	{ id: '!', label: 'Change Notification' },
]

export function LRCOperationFromString(string: string): LRCOperation {
	switch (string) {
		case '?':
			return LRCOperation.QUERY
		case '%':
			return LRCOperation.QUERY_RESPONSE
		case ':':
			return LRCOperation.CHANGE_REQUEST
		case '!':
			return LRCOperation.CHANGE_NOTIFICATION
	}

	throw new Error('Unknown operation type')
}

export class LRCArgument {
	field: string
	type: LRCArgumentType
	value: string | number

	/**
	 * Argument within an LRC Message
	 * @param field As specified in the LRC Documentation, valid field choices vary per entity type
	 * @param type Argument Type, valid choices are string, number, UTF8
	 * @param value Argument value
	 */
	constructor(field: string, type: LRCArgumentType, value: string | number) {
		this.field = field
		this.type = type
		this.value = value
	}

	assemble(): string {
		return `${this.field}${this.type}{${this.value}}`
	}
}

export enum LRCArgumentType {
	STRING = '$',
	NUMERIC = '#',
	UTF8 = '&',
}

export enum CrosspointFormat {
	Names = 'Names',
	Numbers = 'Numbers',
}

export enum LRCConstants {
	OVERRIDE_USER = -1,
}
