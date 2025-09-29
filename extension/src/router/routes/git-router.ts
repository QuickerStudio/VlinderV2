import { z } from "zod"
import { procedure } from "../utils"
import { router } from "../utils/router"

const gitRouter = router({
	toggleGitHandler: procedure.input(z.object({ enabled: z.boolean() })).resolve(async (ctx, input) => {
		ctx.provider?.getStateManager()?.setGitHandlerEnabled(input.enabled)
		return { success: true }
	}),
	revertToCommit: procedure.input(z.object({ commitHash: z.string() })).resolve(async (ctx, input) => {
		const mainAgent = ctx.provider?.getMainAgent()
		if (!mainAgent) {
			return { success: false, error: "No active agent" }
		}

		const result = await mainAgent.gitHandler.revertToCommit(input.commitHash)
		return result
	}),
	revertConversationToMessage: procedure.input(z.object({
		messageId: z.number(),
		messageText: z.string().optional()
	})).resolve(async (ctx, input) => {
		const mainAgent = ctx.provider?.getMainAgent()
		if (!mainAgent) {
			return { success: false, error: "No active agent" }
		}

		try {
			// Truncate message history, remove specified message node and all messages after it
			await mainAgent.getStateManager().claudeMessagesManager.removeEverythingFromMessage(input.messageId)

			return {
				success: true,
				messageText: input.messageText
			}
		} catch (error) {
			console.error(`Error reverting conversation to message ${input.messageId}: ${error}`)
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			}
		}
	}),
})

export default gitRouter
