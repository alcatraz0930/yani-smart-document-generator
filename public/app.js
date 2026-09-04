const form = document.querySelector('#docForm');
const output = document.querySelector('#output');
const empty = document.querySelector('#empty');
const generateBtn = document.querySelector('#generateBtn');
const copyBtn = document.querySelector('#copyBtn');
const wordBtn = document.querySelector('#wordBtn');
const pdfBtn = document.querySelector('#pdfBtn');

const val = id => document.querySelector(id).value;

form.addEventListener('submit', async e => {
  e.preventDefault();
  generateBtn.disabled = true;
  generateBtn.innerHTML = 'Generating… <span>✦</span>';

  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: val('#documentType'),
        title: val('#title'),
        recipient: val('#recipient'),
        details: val('#details'),
        tone: val('#tone')
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Generation failed');

    empty.hidden = true;
    output.hidden = false;
    output.value = data.document;
    copyBtn.disabled = false;
    wordBtn.disabled = false;
    pdfBtn.disabled = false;
  } catch (err) {
    alert(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = 'Generate Document <span>→</span>';
  }
});

document.querySelector('#exampleBtn').addEventListener('click', () => {
  document.querySelector('#documentType').value = 'Business Letter';
  document.querySelector('#title').value = 'Follow-up after workflow consultation';
  document.querySelector('#recipient').value = 'Prospective client';
  document.querySelector('#details').value = 'Thank the client for meeting with us yesterday. Confirm that we discussed automating their weekly reporting process, which currently takes about four hours every Friday. Mention that the next step is for us to review their existing spreadsheet template and data sources. Ask them to send those files when convenient. Keep the message professional and warm.';
  document.querySelector('#tone').value = 'Professional';
  document.querySelector('#details').focus();
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value);
  copyBtn.textContent = 'Copied ✓';
  setTimeout(() => copyBtn.textContent = 'Copy', 1500);
});

async function downloadExport(format, button) {
  if (!output.value.trim()) return;

  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    const r = await fetch(`/api/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: output.value,
        title: val('#title'),
        documentType: val('#documentType')
      })
    });

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Could not create ${format.toUpperCase()} file.`);
    }

    const blob = await r.blob();
    const disposition = r.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const fallback = format === 'docx' ? 'yani-smart-document.docx' : 'yani-smart-document.pdf';
    const filename = match?.[1] || fallback;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

wordBtn.addEventListener('click', () => downloadExport('docx', wordBtn));
pdfBtn.addEventListener('click', () => downloadExport('pdf', pdfBtn));
