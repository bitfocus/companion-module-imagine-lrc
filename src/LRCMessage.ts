import {
	LRCArgument,
	LRCArgumentType,
	LRCArgumentTypeFromString,
	LRCEntityType,
	LRCOperation,
	LRCOperationFromString,
} from './types.js'

export class LRCMessage {
	OPENING_FLAG = '~'
	CLOSING_FLAG = '\\'

	type: LRCEntityType
	operation: LRCOperation
	arguments: LRCArgument[]
	rawArgs: string
	rawInput?: string

	constructor(type: LRCEntityType, operation: LRCOperation) {
		this.type = type
		this.operation = operation
		this.arguments = []
		this.rawArgs = ''
	}

	addArgument(field: string, type: LRCArgumentType, value: string | number): LRCMessage {
		this.arguments.push(new LRCArgument(field, type, value))
		return this
	}

	addArgumentRaw(rawString: string): LRCMessage {
		this.rawArgs += rawString
		return this
	}

	argument(argName: string): LRCArgument | undefined {
		return this.arguments.find((arg) => arg.field === argName)
	}

	assemble(): string {
		const components = [this.OPENING_FLAG, this.type, this.operation]

		components.push(this.arguments.map((arg) => arg.assemble()).join(';'))

		components.push(this.rawArgs, this.CLOSING_FLAG)

		return components.join('')
	}

	containsUpdate(): boolean {
		return this.operation === LRCOperation.QUERY_RESPONSE || this.operation === LRCOperation.CHANGE_NOTIFICATION
	}

	static parseFromString(stringMessage: string): LRCMessage {
		const tokenizer = stringMessage.matchAll(
			/~(\w+)([%:!?])((?:\w+[$#&]{[^{}\\~\r\n\t\f\v]*})?(?:;\w+[$#&]{[^{}\\~\r\n\t\f\v]*})*)\\/g,
		)
		const tokenizerMatches = [...tokenizer][0]

		if (!(<any>Object).values(LRCEntityType).includes(tokenizerMatches[1])) {
			// Unsupported entity type
			throw new Error(`Cant process LRC message - invalid entity type : ${tokenizerMatches[1]} from : ${stringMessage}`)
		}

		const newMessage = new this(
			(<any>LRCEntityType)[tokenizerMatches[1].toString()],
			LRCOperationFromString(tokenizerMatches[2]),
		)

		newMessage.rawInput = stringMessage

		if (tokenizerMatches.length > 3) {
			// Need to parse Argument List
			const argumentList = tokenizerMatches[3].toString()

			const argumentsMatcher = argumentList.matchAll(/(?:\w+[$#&]{[\w .,-]*})+/g)
			const args = [...argumentsMatcher]

			args.forEach((arg) => {
				const argComponents = arg.toString().match(/(\w+)([$#&]){([\w .,-]*)}/)
				if (argComponents && argComponents.length === 4) {
					newMessage.addArgument(
						argComponents[1].toString(),
						LRCArgumentTypeFromString(argComponents[2]),
						argComponents[3].toString(),
					)
				}
			})
		}

		return newMessage
	}
}
