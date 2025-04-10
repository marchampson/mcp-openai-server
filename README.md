# OpenAI MCP Server

A Model Context Protocol (MCP) server implementation for the OpenAI API. This server provides a standardized interface between Augment and OpenAI's language models using the official MCP SDK.

## What is MCP?

The Model Context Protocol (MCP) is a standardized API specification that provides a unified way to interact with various large language models (LLMs). It allows applications like Augment to work with different LLM providers through a consistent interface.

MCP acts as a "universal adapter" for LLMs - it translates application requests into the specific format each LLM provider requires.

## Features

- 🔄 Uses the official MCP SDK for compatibility
-  Secure API key management
- 📊 Support for chat completions
- 📋 Model listing
- 🧠 Embedding generation
- ⚠️ Proper error handling and logging

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Clone this repository or copy the files to your project directory
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on the `.env.example` provided:

```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Running the Server

Start the server with:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

## Using with Augment

To use this MCP server with Augment, add the following to your Augment settings.json file:

```json
"augment.advanced": {
    "mcpServers": [
        {
            "name": "openai-mcp",
            "command": "node",
            "args": ["/path/to/openai-mcp-server.js"],
            "env": {
                "OPENAI_API_KEY": "your_openai_api_key_here",
                "DEBUG": "true"
            }
        }
    ]
}
```

Replace `/path/to/openai-mcp-server.js` with the actual path to the server file on your system.

## Available Tools

This MCP server provides the following tools to Augment:

### 1. List Models

Lists all available OpenAI models.

### 2. Chat Completion

Generates responses using OpenAI's chat completion API. Supports parameters like:
- `model`: The model to use (e.g., gpt-3.5-turbo, gpt-4)
- `messages`: Array of conversation messages
- `temperature`: Controls randomness (0-1)
- `max_tokens`: Maximum number of tokens to generate

### 3. Create Embedding

Generates embeddings for text using OpenAI's embedding API. Supports parameters like:
- `model`: The model to use (e.g., text-embedding-ada-002)
- `input`: The text to embed (string or array of strings)

## Testing

A sample client is provided in `client-example.js` to test your MCP server. Run it with:

```bash
node client-example.js
```

## Understanding the Code

The server consists of several key components:

1. **MCP SDK Integration**: Uses the official MCP SDK for standardized communication
2. **Tool Handlers**: Implements handlers for each supported tool
3. **OpenAI API Integration**: Communicates with OpenAI's API
4. **Error Handling**: Provides consistent error responses
5. **Logging**: Logs operations for debugging

## Potential Improvements

See `mcp-server-improvement-suggestions.md` for a list of potential improvements that could be made to this implementation.

## License

MIT
