#!/usr/bin/env node
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fetch } from "undici";
import fs from "node:fs";

// Load environment variables
dotenv.config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com";
const debug = process.env.DEBUG === "true";

// Set up logging
function log(...args) {
  if (debug) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(" ")}`;
    // Only log to console, not to file, to avoid permission issues
    console.error(message);

    // Optionally, try to log to a file in the user's home directory
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const logPath = homeDir ? `${homeDir}/openai-mcp-server.log` : null;

      if (logPath) {
        fs.appendFileSync(logPath, message + "\n");
      }
    } catch (err) {
      // Silently fail if we can't write to the log file
      console.error(`[${timestamp}] Error writing to log file:`, err.message);
    }
  }
}

// Tool handlers
const HANDLERS = {
  // List available models
  listModels: async () => {
    log("Executing listModels");

    try {
      const response = await fetch(`${OPENAI_API_URL}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();

      // Format the models in a readable way
      const formattedModels = data.data
        .map(
          (model) =>
            `- ${model.id} (created: ${new Date(
              model.created * 1000
            ).toISOString()})`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Available OpenAI Models:\n\n${formattedModels}`,
          },
        ],
        metadata: {
          count: data.data.length,
        },
      };
    } catch (error) {
      log("Error listing models:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing models: ${error.message}`,
          },
        ],
        metadata: {},
        isError: true,
      };
    }
  },

  // Generate chat completion
  chatCompletion: async (request) => {
    const { model, messages, temperature, max_tokens, stream } =
      request.params.arguments;

    log("Executing chatCompletion with model:", model);
    log("Messages:", JSON.stringify(messages));

    try {
      // Validate required parameters
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error("Messages array is required and must not be empty");
      }

      // Prepare request to OpenAI
      const openaiRequest = {
        model: model || "gpt-3.5-turbo",
        messages,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: max_tokens !== undefined ? max_tokens : 150,
        stream: false, // Streaming not supported in this implementation
      };

      log("OpenAI request:", JSON.stringify(openaiRequest));

      // Call OpenAI API
      const response = await fetch(`${OPENAI_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log("OpenAI API error response:", errorText);
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const data = await response.json();
      log("OpenAI API response:", JSON.stringify(data));

      // Extract the assistant's message
      const assistantMessage = data.choices[0].message.content;

      return {
        content: [
          {
            type: "text",
            text: assistantMessage,
          },
        ],
        metadata: {
          model: data.model,
          usage: data.usage,
          finish_reason: data.choices[0].finish_reason,
        },
      };
    } catch (error) {
      log("Error in chatCompletion:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        metadata: {},
        isError: true,
      };
    }
  },

  // Generate embeddings
  createEmbedding: async (request) => {
    const { model, input } = request.params.arguments;

    log("Executing createEmbedding with model:", model);

    try {
      // Validate required parameters
      if (!input) {
        throw new Error("Input is required");
      }

      // Prepare request to OpenAI
      const openaiRequest = {
        model: model || "text-embedding-ada-002",
        input,
      };

      // Call OpenAI API
      const response = await fetch(`${OPENAI_API_URL}/v1/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const data = await response.json();

      // Return a summary of the embedding (not the full vector which would be too large)
      return {
        content: [
          {
            type: "text",
            text: `Embedding generated successfully. Vector dimension: ${data.data[0].embedding.length}`,
          },
        ],
        metadata: {
          model: data.model,
          usage: data.usage,
        },
      };
    } catch (error) {
      log("Error in createEmbedding:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        metadata: {},
        isError: true,
      };
    }
  },
};

// Start the MCP server
async function main() {
  log("Starting OpenAI MCP server...");

  try {
    // Create server instance
    const server = new Server(
      { name: "openai", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    log("Server instance created");

    // Handle list tools request
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      log("Received list tools request");

      // Define the tool schemas
      const LIST_MODELS_TOOL = {
        name: "listModels",
        description: "List available OpenAI models",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      };

      const CHAT_COMPLETION_TOOL = {
        name: "chatCompletion",
        description: "Generate a response using OpenAI's chat completion API",
        inputSchema: {
          type: "object",
          properties: {
            model: {
              type: "string",
              description: "The model to use (e.g., gpt-3.5-turbo, gpt-4)",
            },
            messages: {
              type: "array",
              description: "The conversation messages",
              items: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    description:
                      "The role of the message sender (system, user, assistant)",
                  },
                  content: {
                    type: "string",
                    description: "The content of the message",
                  },
                },
              },
            },
            temperature: {
              type: "number",
              description: "Controls randomness (0-1)",
            },
            max_tokens: {
              type: "number",
              description: "Maximum number of tokens to generate",
            },
          },
          required: ["messages"],
        },
      };

      const CREATE_EMBEDDING_TOOL = {
        name: "createEmbedding",
        description:
          "Generate embeddings for text using OpenAI's embedding API",
        inputSchema: {
          type: "object",
          properties: {
            model: {
              type: "string",
              description: "The model to use (e.g., text-embedding-ada-002)",
            },
            input: {
              type: ["string", "array"],
              description:
                "The text to embed, can be a string or array of strings",
            },
          },
          required: ["input"],
        },
      };

      return {
        tools: [LIST_MODELS_TOOL, CHAT_COMPLETION_TOOL, CREATE_EMBEDDING_TOOL],
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      log("Received tool call:", toolName);

      try {
        const handler = HANDLERS[toolName];
        if (!handler) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        return await handler(request);
      } catch (error) {
        log("Error handling tool call:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Connect to transport
    const transport = new StdioServerTransport();
    log("Created transport");
    await server.connect(transport);
    log("Server connected and running");
  } catch (error) {
    log("Fatal error:", error);
    process.exit(1);
  }
}

// Handle process events
process.on("uncaughtException", (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
});

process.on("unhandledRejection", (error) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, error);
});

// Run the server
main().catch((error) => {
  console.error(`[${new Date().toISOString()}] Error starting server:`, error);
  process.exit(1);
});
