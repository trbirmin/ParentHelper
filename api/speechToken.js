import { app } from "@azure/functions";

// Provides a short-lived Azure Speech token for browser SDK use (TTS/STT)
// Env:
// - AZURE_SPEECH_KEY (required)
// - AZURE_SPEECH_REGION (required)

app.http('speechToken', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'speechToken',
  handler: async (req, ctx) => {
    const key = process.env.AZURE_SPEECH_KEY
    const region = process.env.AZURE_SPEECH_REGION
    if (!key || !region) {
      return { status: 400, jsonBody: { error: 'Speech not configured' } }
    }
    try {
      const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
      const res = await fetch(url, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key } })
      if (!res.ok) {
        const t = await res.text().catch(()=> '')
        return { status: 502, jsonBody: { error: `Token service ${res.status}`, details: t } }
      }
      const token = await res.text()
      return { status: 200, jsonBody: { token, region } }
    } catch (e) {
      return { status: 500, jsonBody: { error: e?.message || 'Token error' } }
    }
  }
})

export default {}