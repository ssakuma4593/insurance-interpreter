import pdfParse from 'pdf-parse';
import fs from 'fs';

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export async function parsePDF(filePath: string): Promise<ParsedPage[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  
  // pdf-parse doesn't provide page-by-page extraction by default
  // For MVP, we'll split by form feed characters or approximate pages
  // In production, you'd want to use a library that supports page-level extraction
  
  const fullText = pdfData.text;
  const totalPages = pdfData.numpages;
  
  // Simple approach: divide text roughly by page count
  // This is approximate; for better accuracy, use a library like pdfjs-dist
  const pages: ParsedPage[] = [];
  const textLength = fullText.length;
  const charsPerPage = Math.ceil(textLength / totalPages);
  
  for (let i = 0; i < totalPages; i++) {
    const start = i * charsPerPage;
    const end = Math.min(start + charsPerPage, textLength);
    const pageText = fullText.slice(start, end).trim();
    
    if (pageText) {
      pages.push({
        pageNumber: i + 1,
        text: pageText,
      });
    }
  }
  
  // If no pages were created, create a single page with all text
  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      text: fullText,
    });
  }
  
  return pages;
}
