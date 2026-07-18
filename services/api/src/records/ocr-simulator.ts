// Real OCR/text extraction is out of scope for the MVP (per the project
// plan). This returns deterministic, clearly-labeled placeholder text so
// the upload → summary pipeline has something to display end to end.
export function simulateOcr(fileName: string, mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return `[Simulated OCR] Scanned image "${fileName}" received. Text extraction is simulated for this MVP — no real OCR was performed.`;
  }
  if (
    mimeType === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf')
  ) {
    return `[Simulated OCR] Extracted text from "${fileName}": report on file, pending clinical review. Text extraction is simulated for this MVP.`;
  }
  return `[Simulated OCR] "${fileName}" was uploaded but its file type isn't recognized for text extraction.`;
}
