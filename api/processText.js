import { app } from "@azure/functions";

app.http('processText', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processText',
  handler: async (request, context) => {
    const body = await request.json().catch(() => ({}));
    const question = body?.question || 'No question provided';
  const tutorMode = !!body?.tutorMode;
  const subject = body?.subject || undefined;
  const grade = body?.grade || undefined;
  const targetLang = body?.targetLang || undefined;
    return {
      status: 200,
      jsonBody: {
        action: 'processText',
        status: 'ok',
        question,
    options: { tutorMode, subject, grade, targetLang },
        samplePayload: {
          answer: 'This is a placeholder explanation. Azure OpenAI reasoning will be added later.',
          steps: [
            'Understand the prompt',
            'Break into smaller concepts',
            'Explain in parent-friendly terms'
          ]
        }
      }
    }
  }
});
