import { LRCArgument, LRCArgumentType, LRCEntityType, LRCOperation } from './types.js'

export class LRCMessage {
	OPENING_FLAG = '~'
	CLOSING_FLAG = '\\'

	type: LRCEntityType
	operation: LRCOperation
	arguments: LRCArgument[]
	rawArgs: string

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

		this.arguments.forEach((arg: LRCArgument) => {
			components.push(arg.assemble())
		})

		components.push(this.rawArgs, this.CLOSING_FLAG)

		return components.join()
	}

	static parseFromString(stringMessage: string): LRCMessage {
		const tokenizer = stringMessage.matchAll(/~(\w+)([%:!?])((?:\w+[$#&]{[\w .,-]*})?(?:;\w+[$#&]{[\w .,-]*})*)\\/g)
		const tokenizerMatches = [...tokenizer]

		if (!(<any>Object).values(LRCEntityType).includes(tokenizerMatches[1])) {
			// Unsupported entity type
			throw new Error(`Cant process LRC message - invalid entity type : ${stringMessage}`)
		}

		if (!(<any>Object).values(LRCOperation).includes(tokenizerMatches[2])) {
			// Unsupported entity type
			throw new Error(`Cant process LRC message - invalid entity type : ${stringMessage}`)
		}

		const newMessage = new this(
			(<any>LRCEntityType)[tokenizerMatches[1].toString()],
			(<any>LRCOperation)[tokenizerMatches[2].toString()],
		)

		if (tokenizerMatches.length > 3) {
			// Need to parse Argument List
			const argumentList = tokenizerMatches[3].toString()

			const argumentsMatcher = argumentList.matchAll(/(?:\w+[$#&]{[\w .,-]*})+/)
			const argumentMatches = [...argumentsMatcher]

			argumentMatches.forEach((arg) => {
				const argCSplitter = arg.toString().matchAll(/(\w+)([$#&])({[\w .,-]*})/)
				const argComponents = [...argCSplitter]
				if (argComponents.length === 4) {
					newMessage.addArgument(
						argComponents[1].toString(),
						(<any>LRCArgumentType)[argComponents[2].toString()],
						argComponents[3].toString(),
					)
				}
			})
		}

		return newMessage
	}
}
