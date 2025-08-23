import { app } from "@azure/functions";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT
const key = process.env.AZURE_DOCINTEL_KEY

app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'uploadFile',
  handler: async (request, context) => {
    try {
      const contentType = request.headers.get('content-type') || ''
      let file
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        file = formData.get('file') || formData.get('image')
      } else {
        // Allow JSON with { base64, filename }
        const body = await request.json().catch(() => ({}))
        if (body?.base64) {
          const bytes = Buffer.from(body.base64, 'base64')
          file = new File([bytes], body.filename || 'upload.bin', { type: body.contentType || 'application/octet-stream' })
        }
      }

      if (!file) {
        return { status: 400, jsonBody: { error: 'No file provided' } }
      }

      if (typeof file.size === 'number' && file.size === 0) {
        return { status: 400, jsonBody: { error: 'Empty file' } }
      }

      if (!endpoint || !key) {
        return { status: 500, jsonBody: { error: 'Missing AZURE_DOCINTEL_ENDPOINT or AZURE_DOCINTEL_KEY' } }
      }

      // Supported by Document Intelligence (prebuilt-document): PDF, images (JPEG/JPG, PNG, TIFF, BMP)
      const supportedExt = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp']
      const unsupportedDocExt = ['.doc', '.docx']
      const unsupportedImageExt = ['.heic', '.heif']

      // Derive a content type for the SDK (helps with Office docs)
      let detectedType = file.type || 'application/octet-stream'
      const nameLower = (file.name || '').toLowerCase()
      if (!file.type && nameLower.endsWith('.pdf')) detectedType = 'application/pdf'
      else if (!file.type && nameLower.endsWith('.png')) detectedType = 'image/png'
      else if (!file.type && (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg'))) detectedType = 'image/jpeg'
      else if (!file.type && (nameLower.endsWith('.tif') || nameLower.endsWith('.tiff'))) detectedType = 'image/tiff'

      // Early validation: give a clear message for known unsupported formats
      if (unsupportedDocExt.some(ext => nameLower.endsWith(ext))) {
        return {
          status: 415,
          jsonBody: {
            error: 'Unsupported format for Document Intelligence',
            details: 'Word documents (.doc/.docx) are not supported by the prebuilt-document model locally. Please convert to PDF or upload an image (JPG/PNG/TIFF/BMP).'
          }
        }
      }
      if (unsupportedImageExt.some(ext => nameLower.endsWith(ext)) || detectedType === 'image/heic' || detectedType === 'image/heif') {
        return {
          status: 415,
          jsonBody: {
            error: 'Unsupported image format',
            details: 'HEIC/HEIF images are not supported. Please change camera settings to JPEG or convert the image to JPG/PNG/TIFF.'
          }
        }
      }
      if (!supportedExt.some(ext => nameLower.endsWith(ext))) {
        // If extension unclear, still attempt but warn client
        // Optionally, you can uncomment to hard-block unknown formats
        // return { status: 415, jsonBody: { error: 'Unsupported file format', details: 'Use PDF or images (JPG/PNG/TIFF/BMP).' } }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key))

      // Use the prebuilt-document model to extract text and structure
      const poller = await client.beginAnalyzeDocument('prebuilt-document', buffer, { contentType: detectedType })
      const result = await poller.pollUntilDone()

  const pages = (result.pages || []).map(p => ({
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        unit: p.unit
      }))
      const paragraphs = (result.paragraphs || []).map(pg => ({ role: pg.role, content: pg.content }))
      const tables = (result.tables || []).map(t => ({
        rowCount: t.rowCount,
        columnCount: t.columnCount,
        cells: t.cells?.map(c => ({ rowIndex: c.rowIndex, columnIndex: c.columnIndex, content: c.content }))
      }))

      return {
        status: 200,
        jsonBody: {
          action: 'uploadFile',
          status: 'ok',
          file: { name: file.name, type: file.type, size: file.size },
          document: {
            content: result.content || '',
            pages,
            paragraphs,
            tables
          }
        }
      }
    } catch (err) {
      const message = err?.message || 'Unknown error'
      const details = err?.response?.bodyAsText || err?.response?.status || undefined
      return { status: 500, jsonBody: { error: message, details } }
    }
  }
});
