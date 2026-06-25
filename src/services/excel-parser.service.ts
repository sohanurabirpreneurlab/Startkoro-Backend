import path from 'path';
import * as XLSX from 'xlsx';
import { ParsedKnowledgeRow } from '../interfaces/admin-upload.interface';
import { AppError } from '../utils/AppError';

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function getStringCell(row: Record<string, unknown>, acceptedHeaders: string[]): string {
  for (const [rawHeader, rawValue] of Object.entries(row)) {
    if (acceptedHeaders.includes(normalizeHeader(rawHeader))) {
      return String(rawValue ?? '').trim();
    }
  }

  return '';
}

export class ExcelParserService {
  parseKnowledgeFile(fileBuffer: Buffer, originalFilename: string): ParsedKnowledgeRow[] {
    const extension = path.extname(originalFilename).toLowerCase();

    if (!['.xlsx', '.xls', '.csv'].includes(extension)) {
      throw new AppError('Unsupported file type. Please upload a .xlsx, .xls, or .csv file.', 400);
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];

    if (!firstSheet) {
      throw new AppError('The uploaded file does not contain any readable sheet data.', 400);
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: ''
    });

    if (rawRows.length === 0) {
      throw new AppError('The uploaded file is empty.', 400);
    }

    const firstRowHeaders = Object.keys(rawRows[0] ?? {}).map(normalizeHeader);

    if (!firstRowHeaders.includes('question') || !firstRowHeaders.includes('answer')) {
      throw new AppError('The uploaded file must contain question and answer columns.', 400);
    }

    return rawRows.map((row, index) => {
      const tagsValue = getStringCell(row, ['tags']);

      return {
        rowNumber: index + 2,
        title: getStringCell(row, ['title']) || undefined,
        question: getStringCell(row, ['question']),
        answer: getStringCell(row, ['answer']),
        category: getStringCell(row, ['category']) || undefined,
        tags: tagsValue
          ? tagsValue
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined
      };
    });
  }
}
