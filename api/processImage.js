import { app } from "@azure/functions";

app.http('processImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processImage',
  handler: async (request, context) => {
    let imageMeta = null
    let options = {}
    try {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        const img = formData.get('image')
        if (img) {
          imageMeta = { name: img.name, type: img.type, size: img.size }
        }
        options = {
          tutorMode: !!formData.get('tutorMode'),
          subject: formData.get('subject') || undefined,
          grade: formData.get('grade') || undefined,
          targetLang: formData.get('targetLang') || undefined
        }
      } else {
        const body = await request.json().catch(() => ({}))
        imageMeta = { note: body?.note || 'no image provided' }
        options = {
          tutorMode: !!body?.tutorMode,
          subject: body?.subject || undefined,
          grade: body?.grade || undefined,
          targetLang: body?.targetLang || undefined
        }
      }
    } catch (e) {
      // ignore parsing errors
    }

    return {
      status: 200,
      jsonBody: {
        action: 'processImage',
        status: 'ok',
        image: imageMeta,
  options,
        samplePayload: {
          ocr: [
            { line: 'Sample recognized text line 1' },
            { line: 'Sample recognized text line 2' }
          ],
          message: 'Vision OCR call to be added.'
        }
      }
    }
  }
});
