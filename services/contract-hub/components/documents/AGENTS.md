# components/documents - PDF & Signing

## OVERVIEW
8 files for PDF viewing, annotation, and digital signing. Uses pdfjs-dist for rendering, fabric.js for canvas, react-signature-canvas for signatures.

## WHERE TO LOOK
| File | Purpose |
|------|---------|
| `pdf-viewer.tsx` | PDF rendering with pdfjs-dist, page navigation, zoom |
| `signing-canvas.tsx` | Signature capture via react-signature-canvas |
| `annotation-layer.tsx` | Canvas-based PDF annotation |
| `document-preview.tsx` | Document preview component |

## CONVENTIONS
- pdfjs-dist for PDF parsing/rendering (worker config in lib)
- fabric.js for canvas manipulation (annotations)
- react-signature-canvas for signature capture
- pdf-lib for PDF modification (merge, flatten)
- Blob URLs for PDF display

## ANTI-PATTERNS
- Canvas operations are NOT debounced (performance risk on large PDFs)
- No error handling for corrupted PDFs
