import { Index } from '@upstash/vector'
import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

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
    // Debug: Check environment variables
    const envCheck = {
      UPSTASH_VECTOR_REST_URL: !!process.env.UPSTASH_VECTOR_REST_URL,
      UPSTASH_VECTOR_REST_TOKEN: !!process.env.UPSTASH_VECTOR_REST_TOKEN,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    }
    console.log('[v0] Environment variables check:', envCheck)
    
    const missingVars = Object.entries(envCheck)
      .filter(([, exists]) => !exists)
      .map(([name]) => name)
    
    if (missingVars.length > 0) {
      console.log('[v0] Missing environment variables:', missingVars)
      return Response.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      )
    }

    // Debug: Log partial URL to verify correct env var is being used
    const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL || ''
    console.log('[v0] Vector URL prefix:', vectorUrl.substring(0, 30) + '...')

    const { query, model, history } = (await request.json()) as ChatRequest

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 })
    }
    
    console.log('[v0] Query received:', query.substring(0, 50))

    // Search the vector database for relevant food information
    console.log('[v0] Starting vector search...')
    let searchResults
    try {
      searchResults = await index.query({
        data: query,
        topK: 5,
        includeMetadata: true,
      })
      console.log('[v0] Vector search completed, results count:', searchResults.length)
    } catch (vectorError) {
      console.error('[v0] Vector search error:', vectorError)
      return Response.json(
        { error: `Vector database error: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

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
