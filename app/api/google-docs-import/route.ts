import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  try {
    const { accessToken, documentId } = await request.json()

    if (!accessToken || !documentId) {
      return NextResponse.json(
        { error: 'Access token and document ID are required' },
        { status: 400 }
      )
    }

    // Initialize Google Docs API client with the access token
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const docs = google.docs({ version: 'v1', auth })

    // Fetch the Google Doc
    const doc = await docs.documents.get({
      documentId: documentId,
    })

    // Extract document title
    const title = doc.data.title || 'Untitled Document'

    // Extract document content as plain text
    let content = ''
    const extractText = (element: any): string => {
      if (element.paragraph) {
        return element.paragraph.elements
          .map((elem: any) => elem.textRun?.content || '')
          .join('')
      } else if (element.table) {
        return element.table.tableRows
          .map((row: any) =>
            row.tableCells
              .map((cell: any) =>
                cell.content.map((elem: any) => extractText(elem)).join('')
              )
              .join(' ')
          )
          .join('\n')
      } else if (element.sectionBreak) {
        return '\n'
      }
      return ''
    }

    if (doc.data.body?.content) {
      content = doc.data.body.content
        .map((element: any) => extractText(element))
        .join('')
        .trim()
    }

    // Use GPT to classify the document type
    const model = process.env.OPENAI_GPT_MODEL || 'gpt-4o-mini'
    
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a document classifier. Analyze the given text and classify it into one of these categories:
- "academic": Academic papers, research documents, scholarly articles, thesis, dissertations
- "professional": Business documents, reports, proposals, memos, professional correspondence
- "casual": Personal notes, informal writing, creative writing, blogs, diaries
- "other": Anything that doesn't fit the above categories

Respond with ONLY the category name, nothing else.`,
        },
        {
          role: 'user',
          content: `Classify this document:\n\nTitle: ${title}\n\nContent (first 1000 characters):\n${content.substring(0, 1000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    })

    const documentType = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'other'
    
    // Validate the document type
    const validTypes = ['academic', 'professional', 'casual', 'other']
    const finalType = validTypes.includes(documentType) ? documentType : 'other'

    return NextResponse.json({
      title,
      content,
      documentType: finalType,
    })
  } catch (error) {
    console.error('Google Docs import error:', error)
    return NextResponse.json(
      { error: 'Failed to import document' },
      { status: 500 }
    )
  }
} 