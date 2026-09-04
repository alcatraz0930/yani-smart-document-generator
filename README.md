# Yani Builds — Smart Document Generator

Portfolio Demo #02. Turns rough notes into polished business documents using the OpenAI Responses API.

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env`
3. Add `OPENAI_API_KEY`
4. `npm start`
5. Open `http://localhost:10000`

## Deploy
Works as a Node web service. Add `OPENAI_API_KEY` as a server-side environment variable. Never place the API key in `/public`.

Supported documents: Business Letter, Proposal, Meeting Summary, Memo, Custom Document.
