import { app } from "@azure/functions";

app.http('processText', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'processText',
  handler: async (request, context) => {
    const body = await request.json().catch(() => ({}));
    const question = body?.question || 'No question provided';
    return {
      status: 200,
      jsonBody: {
        action: 'processText',
        status: 'ok',
        question,
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
