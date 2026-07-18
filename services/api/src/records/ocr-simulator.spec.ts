import { simulateOcr } from './ocr-simulator';

describe('simulateOcr', () => {
  it('labels image uploads distinctly from PDFs', () => {
    const image = simulateOcr('scan.png', 'image/png');
    const pdf = simulateOcr('report.pdf', 'application/pdf');
    expect(image).toContain('image');
    expect(pdf).toContain('Extracted text');
    expect(image).not.toEqual(pdf);
  });

  it('falls back to a generic message for unrecognized types', () => {
    expect(simulateOcr('notes.txt', 'text/plain')).toContain(
      "isn't recognized",
    );
  });

  it('is deterministic for the same input', () => {
    expect(simulateOcr('a.pdf', 'application/pdf')).toEqual(
      simulateOcr('a.pdf', 'application/pdf'),
    );
  });
});
