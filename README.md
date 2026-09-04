# Yani Builds — Smart Document Generator

Portfolio demo that turns rough notes into polished business documents using OpenAI.

## Features

- Business Letter, Proposal, Meeting Summary, Memo, and Custom Document
- Professional, Friendly, Concise, Persuasive, and Formal tones
- Editable AI-generated document preview
- Copy to clipboard
- Download as Microsoft Word (.docx)
- Download as PDF (.pdf)

## Run locally

1. Copy `.env.example` to `.env` and add your OpenAI API key.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:10000`.

Keep API keys server-side and never commit `.env`.


## v1.2
Added document-specific adaptive fields. Business letters, proposals, meeting summaries, memos, and custom documents now collect context that matches the selected document type, including date placeholders and role-specific fields.


## v1.3
Generated documents are normalized to clean plain text. Markdown heading/emphasis markers such as `#` and `*` are removed while square-bracket placeholders such as `[Date]` are preserved.
