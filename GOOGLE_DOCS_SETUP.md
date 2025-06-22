# Google Docs Integration Setup

This document explains how to set up the Google Docs integration feature for importing documents.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Google OAuth Client ID for Google Docs API access
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here

# Your app URL (used for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Docs API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Docs API"
   - Click on it and press "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (e.g., `https://your-app.vercel.app`)
   - Add authorized redirect URIs:
     - `http://localhost:3000/dashboard` (for development)
     - Your production URL with /dashboard (e.g., `https://your-app.vercel.app/dashboard`)
   - **Important**: Make sure these URLs match EXACTLY with your NEXT_PUBLIC_APP_URL + `/dashboard`
   - Save and copy the Client ID

5. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Fill in the required information
   - Add scopes:
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/drive.readonly`
   - Add test users if in development

## Troubleshooting redirect_uri_mismatch

If you get a "redirect_uri_mismatch" error:

1. Check that your redirect URIs in Google Cloud Console match exactly:
   - No trailing slashes
   - Correct protocol (http vs https)
   - Correct port number (3000 for local development)
   - Must include `/dashboard` at the end

2. Common redirect URI examples:
   - Local development: `http://localhost:3000/dashboard`
   - Vercel deployment: `https://your-app.vercel.app/dashboard`
   - Custom domain: `https://yourdomain.com/dashboard`

3. Make sure your `NEXT_PUBLIC_APP_URL` environment variable matches the redirect URI (without the `/dashboard` part)

## How It Works

1. User clicks "Upload from Google Docs" button
2. User pastes a Google Docs URL
3. If not authenticated, user is redirected to Google OAuth
4. After authentication, the document is fetched
5. GPT API analyzes the content to determine document type (academic, professional, casual, or other)
6. Document is created in the document manager with:
   - Title from the Google Doc
   - Empty description
   - Auto-detected document type
   - Content converted to editor format

## Supported Google Docs URL Formats

- `https://docs.google.com/document/d/DOCUMENT_ID/edit`
- `https://docs.google.com/document/d/DOCUMENT_ID`
- `https://drive.google.com/file/d/DOCUMENT_ID`
- Direct document ID

## Security Notes

- The integration only requests read-only access to Google Docs
- Access tokens are stored temporarily in memory and cleared after use
- Users must explicitly authorize access to their Google Docs 