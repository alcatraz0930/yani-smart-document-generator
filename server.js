import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const clean = (v, n=6000) => String(v || '').trim().slice(0,n);
const types = ['Business Letter','Proposal','Meeting Summary','Memo','Custom Document'];
const tones = ['Professional','Friendly','Concise','Persuasive','Formal'];

app.post('/api/generate', async (req,res) => {
  try {
    const documentType = clean(req.body?.documentType, 80);
    const tone = clean(req.body?.tone, 50);
    const details = clean(req.body?.details, 6000);
    const recipient = clean(req.body?.recipient, 160);
    const title = clean(req.body?.title, 200);
    if (!types.includes(documentType) || !tones.includes(tone) || details.length < 15) {
      return res.status(400).json({ error: 'Please provide a document type, tone, and enough details to generate the document.' });
    }
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI generation is not configured yet.' });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Create a polished ${documentType} in ${tone} American English.\nTitle/topic: ${title || 'Infer an appropriate title'}\nRecipient/audience: ${recipient || 'Not specified'}\nUser notes:\n${details}\n\nRules: Preserve facts supplied by the user. Do not invent names, dates, amounts, commitments, legal claims, or business facts. If a critical fact is missing, use a neutral placeholder in square brackets. Return only the finished document body, with a useful title as the first line. Use clear paragraphs and light headings only when appropriate for the document type.`;
    const response = await client.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-5.6-luna', input: prompt });
    const text = response.output_text?.trim();
    if (!text) throw new Error('Empty AI response');
    res.json({ document: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'The document could not be generated. Please try again.' });
  }
});

app.get('/api/health', (_req,res)=>res.json({ok:true}));
const port = process.env.PORT || 10000;
app.listen(port, ()=>console.log(`Smart Document Generator running on http://localhost:${port}`));
