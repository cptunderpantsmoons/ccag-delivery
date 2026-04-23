// lib/excel-parser.ts

import * as XLSX from 'xlsx';
import type { ExcelData } from './agent-types';

export function parseExcelBuffer(buffer: ArrayBuffer): ExcelData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const activeSheet = sheetNames[0];
  const worksheet = workbook.Sheets[activeSheet];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  
  if (jsonData.length === 0) {
    return {
      sheetNames,
      activeSheet,
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
    };
  }
  
  const headers = jsonData[0].map((h) => String(h));
  const rows = jsonData.slice(1);
  
  return {
    sheetNames,
    activeSheet,
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}

export function detectDataTypes(data: ExcelData): Record<string, 'string' | 'number' | 'date' | 'boolean'> {
  const types: Record<string, 'string' | 'number' | 'date' | 'boolean'> = {};
  
  for (const header of data.headers) {
    const colIndex = data.headers.indexOf(header);
    const sample = data.rows.slice(0, 10).map((row) => row[colIndex]);
    
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let total = 0;
    
    for (const val of sample) {
      if (val === null || val === undefined || val === '') continue;
      total++;
      
      if (typeof val === 'number') numberCount++;
      else if (typeof val === 'boolean') booleanCount++;
      else if (val instanceof Date) dateCount++;
      else if (!isNaN(Number(val)) && val !== '') numberCount++;
      else if (['true', 'false', 'yes', 'no'].includes(String(val).toLowerCase())) booleanCount++;
    }
    
    if (total === 0) {
      types[header] = 'string';
    } else if (numberCount / total > 0.7) {
      types[header] = 'number';
    } else if (dateCount / total > 0.7) {
      types[header] = 'date';
    } else if (booleanCount / total > 0.7) {
      types[header] = 'boolean';
    } else {
      types[header] = 'string';
    }
  }
  
  return types;
}

export function getNumericColumns(data: ExcelData): string[] {
  const types = detectDataTypes(data);
  return Object.entries(types)
    .filter(([, type]) => type === 'number')
    .map(([col]) => col);
}

export function getCategoricalColumns(data: ExcelData): string[] {
  const types = detectDataTypes(data);
  return Object.entries(types)
    .filter(([, type]) => type === 'string')
    .map(([col]) => col);
}

export function aggregateColumn(data: ExcelData, column: string, fn: 'sum' | 'avg' | 'count' | 'min' | 'max'): number {
  const colIndex = data.headers.indexOf(column);
  if (colIndex === -1) return 0;
  
  const values = data.rows
    .map((row) => row[colIndex])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => Number(v))
    .filter((v) => !isNaN(v));
  
  if (values.length === 0) return 0;
  
  switch (fn) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}
