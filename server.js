import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const clean = (v, n = 6000) => String(v || '').trim().slice(0, n);
const types = ['Business Letter', 'Proposal', 'Meeting Summary', 'Memo', 'Custom Document'];
const tones = ['Professional', 'Friendly', 'Concise', 'Persuasive', 'Formal'];

function safeFilename(value, fallback = 'yani-smart-document') {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return cleaned || fallback;
}

function cleanGeneratedDocument(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    // Remove Markdown heading markers such as #, ##, ### at the start of lines.
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    // Remove Markdown bold/italic markers while keeping the words themselves.
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    // Convert Markdown asterisk bullets to a clean bullet character.
    .replace(/^\s*\*\s+/gm, '• ')
    // Remove inline code fences/backticks used only as formatting.
    .replace(/`{1,3}/g, '')
    .trim();
}

function splitDocument(text) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!blocks.length) return { title: 'Generated Document', paragraphs: [] };
  return { title: blocks[0], paragraphs: blocks.slice(1) };
}

app.post('/api/generate', async (req, res) => {
  try {
    const documentType = clean(req.body?.documentType, 80);
    const tone = clean(req.body?.tone, 50);
    const details = clean(req.body?.details, 6000);
    const title = clean(req.body?.title, 200);
    const rawFields = req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : {};
    const fields = Object.fromEntries(Object.entries(rawFields).slice(0, 12).map(([key, value]) => [clean(key, 60), clean(value, 220)]));

    if (!types.includes(documentType) || !tones.includes(tone) || details.length < 15) {
      return res.status(400).json({ error: 'Please provide a document type, tone, and enough details to generate the document.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI generation is not configured yet.' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const fieldLines = Object.entries(fields)
      .map(([key, value]) => `${key}: ${value || '[Not provided]'}`)
      .join('\n');

    const structureRules = {
      'Business Letter': 'Use a conventional business-letter structure. If no document date is provided, include [Date]. If recipient name, sender name, or other critical identity details are missing, use clear square-bracket placeholders such as [Client Name] or [Your Name].',
      'Proposal': 'Use a concise professional proposal structure with an appropriate title and sections such as overview, proposed approach, deliverables or next steps only when supported by the notes. If the proposal date or key party details are missing, use square-bracket placeholders.',
      'Meeting Summary': 'Use a meeting-summary structure with Date, Attendees, Topic/Purpose, Key Discussion Points, Decisions, and Action Items only when supported. If the meeting date or attendees are missing, use [Date] or [Attendees] placeholders rather than inventing them.',
      'Memo': 'Use a memo structure with Date, To, From, and Subject headers. Use [Date], [Recipient], [Your Name], or [Subject] when required information is missing.',
      'Custom Document': 'Choose a structure appropriate to the user notes. Only include a date if it is useful or explicitly relevant; if a needed date or identity detail is missing, use a square-bracket placeholder.'
    };

    const prompt = `Create a polished ${documentType} in ${tone} American English.
Title/topic: ${title || 'Infer an appropriate title'}
Document-specific fields:
${fieldLines || 'None provided'}
User notes:
${details}

Document structure guidance: ${structureRules[documentType]}

Rules: Preserve facts supplied by the user. Do not invent names, dates, amounts, commitments, legal claims, or business facts. Never insert today's date unless the user explicitly supplied it. When a critical fact is missing, use a neutral placeholder in square brackets. Return only the finished document body, with a useful title as the first line. Use clear paragraphs and light headings only when appropriate for the document type. OUTPUT PLAIN TEXT ONLY. Do not use Markdown formatting or Markdown symbols for headings or emphasis. Do not use #, ##, **, *, underscores, or backticks as formatting. Use plain-text headings and labels instead. Square brackets for placeholders such as [Date] and [Client Name] are required and should be retained.`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: prompt
    });

    const text = cleanGeneratedDocument(response.output_text);
    if (!text) throw new Error('Empty AI response');
    res.json({ document: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'The document could not be generated. Please try again.' });
  }
});

app.post('/api/export/docx', async (req, res) => {
  try {
    const text = clean(req.body?.document, 20000);
    const requestedTitle = clean(req.body?.title, 200);
    if (!text) return res.status(400).json({ error: 'Generate a document before downloading it.' });

    const parsed = splitDocument(text);
    const filename = `${safeFilename(requestedTitle || parsed.title)}.docx`;

    const children = [
      new Paragraph({
        text: parsed.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
        spacing: { after: 320 }
      }),
      ...parsed.paragraphs.map(block => new Paragraph({
        children: [new TextRun({ text: block.replace(/\n/g, ' '), size: 22 })],
        spacing: { after: 220, line: 330 }
      }))
    ];

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('DOCX export failed:', err);
    res.status(500).json({ error: 'The Word document could not be created. Please try again.' });
  }
});

app.post('/api/export/pdf', async (req, res) => {
  try {
    const text = clean(req.body?.document, 20000);
    const requestedTitle = clean(req.body?.title, 200);
    if (!text) return res.status(400).json({ error: 'Generate a document before downloading it.' });

    const parsed = splitDocument(text);
    const filename = `${safeFilename(requestedTitle || parsed.title)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const pdf = new PDFDocument({ size: 'A4', margins: { top: 62, right: 66, bottom: 62, left: 66 } });
    pdf.pipe(res);
    pdf.font('Times-Bold').fontSize(18).text(parsed.title, { align: 'left' });
    pdf.moveDown(1.2);

    for (const block of parsed.paragraphs) {
      pdf.font('Times-Roman').fontSize(11.5).text(block.replace(/\n/g, ' '), {
        align: 'left',
        lineGap: 4
      });
      pdf.moveDown(0.9);
    }

    pdf.end();
  } catch (err) {
    console.error('PDF export failed:', err);
    if (!res.headersSent) res.status(500).json({ error: 'The PDF could not be created. Please try again.' });
    else res.end();
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Smart Document Generator running on http://localhost:${port}`));
