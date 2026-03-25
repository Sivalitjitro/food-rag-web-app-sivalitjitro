import { Index } from '@upstash/vector'
import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  query: string
  model: string
  history: ChatMessage[]
}

export async function POST(request: Request) {
  try {
    // Validate required environment variables
    const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
    const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN
    const groqApiKey = process.env.GROQ_API_KEY

    if (!vectorUrl || !vectorToken || !groqApiKey) {
      const missing = [
        !vectorUrl && 'UPSTASH_VECTOR_REST_URL',
        !vectorToken && 'UPSTASH_VECTOR_REST_TOKEN',
        !groqApiKey && 'GROQ_API_KEY',
      ].filter(Boolean)
      return Response.json(
        { error: `Missing environment variables: ${missing.join(', ')}` },
        { status: 500 }
      )
    }

    // Create Index and Groq client
    const index = new Index({
      url: vectorUrl,
      token: vectorToken,
    })

    const groq = createGroq({
      apiKey: groqApiKey,
    })

    const { query, model, history } = (await request.json()) as ChatRequest

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 })
    }

    // Search the vector database for relevant food information
    const searchResults = await index.query({
      data: query,
      topK: 5,
      includeMetadata: true,
    })

    // Filter results with score > 0.5
    const relevantResults = searchResults.filter(
      (result) => result.score && result.score > 0.5
    )

    // Extract context and sources from metadata
    const contexts: string[] = []
    const sources: string[] = []

    for (const result of relevantResults) {
      const metadata = result.metadata as Record<string, unknown> | undefined
      if (metadata) {
        // Extract context text
        const contextText =
          metadata.text || metadata.content || metadata.description
        if (contextText && typeof contextText === 'string') {
          contexts.push(contextText)
        }

        // Extract source name
        const sourceName =
          metadata.name || metadata.title || metadata.food_name
        if (sourceName && typeof sourceName === 'string' && !sources.includes(sourceName)) {
          sources.push(sourceName)
        }
      }
    }

    const contextString = contexts.length > 0
      ? contexts.join('\n\n')
      : 'No specific food information found in the database for this query.'

    // Build the system prompt with retrieved context
    const systemPrompt = `You are FoodMind AI, a knowledgeable and friendly food and nutrition assistant. You have access to a curated database of 35+ foods with detailed nutritional information.

Use the following retrieved food information to answer the user's question. If the information is relevant, incorporate it into your response. If the retrieved information doesn't directly answer the question, use your general knowledge about food and nutrition while being clear about what comes from the database vs general knowledge.

Retrieved Food Information:
${contextString}

Guidelines:
- Be helpful, accurate, and conversational
- Provide specific nutritional facts when available
- Suggest practical tips and recipes when relevant
- If you're unsure about something, say so
- Keep responses concise but informative`

    // Build messages for the AI
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history
    for (const msg of history.slice(-6)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add the current query
    messages.push({ role: 'user', content: query })

    // Call Groq API
    const { text } = await generateText({
      model: groq(model || 'llama-3.1-8b-instant'),
      messages,
    })

    return Response.json({
      answer: text,
      sources,
      model: model || 'llama-3.1-8b-instant',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    )
  }
}
