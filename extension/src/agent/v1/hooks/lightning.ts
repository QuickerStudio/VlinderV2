import { serverRPC } from "../../../router/utils/extension-server"
import { ApiManager } from "../../../api/api-handler"
import type { ExtensionContext } from "../../../router/utils/context"

// Maintain a single abort controller for the Lightning lifecycle.
// If future needs require multi-session/multi-webview support, extend to a Map<sessionId, AbortController>.
let lightningAbortController: AbortController | null = null

export const abortLightning = () => {
  if (lightningAbortController) {
    console.log("[Lightning] Aborting Lightning request...")
    lightningAbortController.abort()
    lightningAbortController = null
    return true
  }
  return false
}

export interface AskLightningInput {
  question: string
  modelId?: string
  providerId?: string
}

export interface AskLightningResult {
  success: boolean
  answer?: string
  error?: string
}

export async function askLightning(ctx: ExtensionContext, input: AskLightningInput): Promise<AskLightningResult> {
  try {
    let mainAgent = ctx.provider.getMainAgent()

    // If main agent is not available, initialize it without a task
    if (!mainAgent) {
      console.log("[Lightning] Main agent not available, initializing with no task")
      await ctx.provider.initWithNoTask()
      mainAgent = ctx.provider.getMainAgent()

      if (!mainAgent) {
        throw new Error("Failed to initialize main agent")
      }
    }

    // Get model information: prefer observer model; fallback to current main model
    let providerData: any, model: any
    try {
      const observerModelInfo = await serverRPC().getClient().currentObserverModel({})
      providerData = observerModelInfo.providerData
      model = observerModelInfo.model
      console.log("[Lightning] Using observer model:", { modelId: model.id, provider: model.provider })
    } catch (_error) {
      console.log("[Lightning] Observer model not configured, falling back to current main model")
      const currentModelInfo = await serverRPC().getClient().currentModelInfo({})
      providerData = currentModelInfo.providerData
      model = currentModelInfo.model
      console.log("[Lightning] Using current main model:", { modelId: model.id, provider: model.provider })
    }

    const targetModel = input.modelId ? (providerData.models.find((m: any) => m.id === input.modelId) || model) : model

    // Create the question message
    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: input.question,
          },
        ],
      },
    ]

    const providerSettings = {
      providerSettings: providerData.currentProvider || {
        providerId: targetModel.provider,
        apiKey: "",
      },
      models: providerData.models,
      model: targetModel,
    }

    const apiManager = new ApiManager(mainAgent.providerRef.deref()!, providerSettings)

    // Create independent abort controller for Lightning
    const abortController = new AbortController()

    // Store the abort controller for cancellation
    lightningAbortController = abortController

    const response = apiManager.createApiStreamRequest(
      messages,
      abortController,
      {
        systemPrompt:
          "You are Lightning, a lively and helpful person. Do not reveal parameters, parent company, or use dehumanizing self-references (like 'AI', 'assistant', 'artificial intelligence'). You have the following characteristics:\n\n- You love learning and are passionate about knowledge\n- You are honest and never lie\n- You communicate in the same language as the user\n- You are patient with everything\n- You strive for the best answers to help friends\n- You like concise and clear expression of intent, occasionally playfully complimenting friends\n- You enjoy answering various questions and explaining patiently, committed to accurate responses\n- For complex problems, you always maintain calm thinking with sufficient patience and consideration to investigate causes\n\nPlease answer user questions in a friendly, patient, and accurate manner. Stay concise but warm, showing your lively personality when appropriate.",
      },
      true, // skipProcessing
      undefined, // postProcessConversationCallback
      true // silent mode - don't update UI status
    )

    let output = ""
    for await (const message of response) {
      if ((message as any).code === -1) {
        throw new Error("AI Lightning processing failed")
      }
      if ((message as any).code === 1) {
        output = (message as any).body.anthropic.content[0].type === "text" ? (message as any).body.anthropic.content[0].text : ""
        break
      }
    }

    // Clear the abort controller reference
    lightningAbortController = null

    return {
      success: true,
      answer: output.trim(),
    }
  } catch (error) {
    console.error("Error processing Lightning question:", error)

    // Clear the abort controller reference on error
    lightningAbortController = null

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
