# API (Azure Functions)

Node.js v4 programming model. Start locally from repo root:

```
npm --prefix api install
npm --prefix api run start -- --port 7072
```

## Endpoints

- POST `/api/uploadFile`
	- multipart/form-data: field `file` (or `image`)
	- optional: `subject`, `grade`
	- returns: extracted document content (`document`) and math solution if arithmetic detected; plus `ai` when Azure OpenAI configured

- POST `/api/processImage`
	- multipart/form-data: field `image`
	- returns: mock image OCR metadata

- POST `/api/processText`
	- json: `{ "question": "...", "subject": "math|science|...", "grade": "K-12" }`
	- returns: math solver if arithmetic detected; plus `ai` when Azure OpenAI configured

## Environment

Document Intelligence (required for upload analysis):
- `AZURE_DOCINTEL_ENDPOINT`
- `AZURE_DOCINTEL_KEY`

Azure OpenAI (optional, enables subject-agnostic answers):
- `AZURE_OPENAI_ENDPOINT` (e.g., https://your-openai-resource.openai.azure.com)
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT` (your deployed model name)
- `AZURE_OPENAI_API_VERSION` (default `2024-06-01`)

> Note: `local.settings.json` is ignored by git. Do not commit secrets.
