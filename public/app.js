const form = document.querySelector('#docForm');
const output = document.querySelector('#output');
const empty = document.querySelector('#empty');
const generateBtn = document.querySelector('#generateBtn');
const copyBtn = document.querySelector('#copyBtn');
const wordBtn = document.querySelector('#wordBtn');
const pdfBtn = document.querySelector('#pdfBtn');
const documentType = document.querySelector('#documentType');
const dynamicFields = document.querySelector('#dynamicFields');

const val = selector => document.querySelector(selector)?.value || '';

const fieldSets = {
  'Business Letter': [
    { id: 'date', label: 'Document date', placeholder: 'Leave blank to use [Date]' },
    { id: 'recipient', label: 'Recipient name', placeholder: 'e.g. Alex Morgan' },
    { id: 'company', label: 'Recipient company', placeholder: 'e.g. Northstar Operations' },
    { id: 'sender', label: 'Sender name', placeholder: 'Leave blank to use [Your Name]' }
  ],
  'Proposal': [
    { id: 'date', label: 'Proposal date', placeholder: 'Leave blank to use [Date]' },
    { id: 'client', label: 'Client or organization', placeholder: 'e.g. Northstar Operations' },
    { id: 'project', label: 'Project name', placeholder: 'e.g. Weekly Reporting Automation' },
    { id: 'preparedBy', label: 'Prepared by', placeholder: 'Leave blank to use [Your Name / Company]' }
  ],
  'Meeting Summary': [
    { id: 'date', label: 'Meeting date', placeholder: 'Leave blank to use [Date]' },
    { id: 'attendees', label: 'Attendees', placeholder: 'e.g. Alex Morgan, Jamie Lee' },
    { id: 'location', label: 'Location or platform', placeholder: 'e.g. Zoom or Main Office' }
  ],
  'Memo': [
    { id: 'date', label: 'Memo date', placeholder: 'Leave blank to use [Date]' },
    { id: 'to', label: 'To', placeholder: 'e.g. Operations Team' },
    { id: 'from', label: 'From', placeholder: 'Leave blank to use [Your Name]' },
    { id: 'subject', label: 'Subject', placeholder: 'e.g. Updated reporting process' }
  ],
  'Custom Document': [
    { id: 'date', label: 'Document date', placeholder: 'Optional; leave blank if not needed' },
    { id: 'audience', label: 'Recipient or audience', placeholder: 'e.g. Clients, Staff, Board Members' }
  ]
};

function renderDynamicFields(type) {
  dynamicFields.innerHTML = '';
  for (const field of fieldSets[type] || []) {
    const label = document.createElement('label');
    label.innerHTML = `${field.label} <span>optional</span>`;
    const input = document.createElement('input');
    input.id = field.id;
    input.name = field.id;
    input.placeholder = field.placeholder;
    input.autocomplete = 'off';
    label.appendChild(input);
    dynamicFields.appendChild(label);
  }
}

function collectDynamicFields() {
  const fields = {};
  dynamicFields.querySelectorAll('input').forEach(input => {
    fields[input.name] = input.value.trim();
  });
  return fields;
}

documentType.addEventListener('change', () => renderDynamicFields(documentType.value));
renderDynamicFields(documentType.value);

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
        fields: collectDynamicFields(),
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
  documentType.value = 'Business Letter';
  renderDynamicFields('Business Letter');
  document.querySelector('#title').value = 'Follow-up after workflow consultation';
  document.querySelector('#date').value = '';
  document.querySelector('#recipient').value = '';
  document.querySelector('#company').value = 'Prospective client';
  document.querySelector('#sender').value = '';
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
