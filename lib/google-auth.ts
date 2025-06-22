import { google } from 'googleapis'

// Google OAuth2 configuration for Google Docs access
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  redirectUri: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    : 'http://localhost:3000/dashboard',
  scope: [
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ].join(' ')
}

// Generate Google OAuth URL for Google Docs access
export function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: 'token',
    scope: GOOGLE_OAUTH_CONFIG.scope,
    access_type: 'online',
    prompt: 'select_account'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Parse Google Doc ID from various URL formats
export function parseGoogleDocId(input: string): string | null {
  // Direct document ID
  if (/^[a-zA-Z0-9-_]+$/.test(input) && input.length > 20) {
    return input
  }

  // Google Docs URL patterns
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/,
    /docs\.google\.com\/document\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
} 