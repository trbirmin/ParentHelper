// Function host entry: import each HTTP function so the v4 Azure Functions host can discover and register them
import './uploadFile.js'
import './processImage.js'
import './processText.js'
import './speechToken.js'
