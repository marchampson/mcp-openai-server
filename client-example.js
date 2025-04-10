// client-example.js
const axios = require("axios");
require("dotenv").config();

// Configuration
const API_KEY = process.env.OPENAI_API_KEY;
const MCP_SERVER_URL = "http://localhost:3000"; // Your MCP server address

async function testMCPServer() {
  console.log("Testing OpenAI MCP Server...");

  try {
    // 1. List available models
    console.log("\n🔍 Getting available models...");
    const modelsResponse = await axios({
      method: "get",
      url: `${MCP_SERVER_URL}/v1/models`,
      headers: {
        "x-api-key": API_KEY,
      },
    });

    console.log("Available models:");
    console.log(modelsResponse.data);

    // 2. Create a chat completion
    console.log("\n💬 Testing chat completion...");
    const chatResponse = await axios({
      method: "post",
      url: `${MCP_SERVER_URL}/v1/chat/completions`,
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Hello! Can you tell me about Model Context Protocol?",
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      },
    });

    console.log("Chat completion response:");
    console.log(chatResponse.data);

    // 3. Test streaming response
    console.log("\n🔄 Testing streaming response...");
    console.log("(Check the server logs for streaming data)");

    const streamResponse = await axios({
      method: "post",
      url: `${MCP_SERVER_URL}/v1/chat/completions`,
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Write a short poem about APIs",
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: true,
      },
      responseType: "stream",
    });

    // Process the stream
    streamResponse.data.on("data", (chunk) => {
      const data = chunk.toString();
      console.log(`Received chunk: ${data}`);
    });

    streamResponse.data.on("end", () => {
      console.log("Stream ended");
    });
  } catch (error) {
    console.error(
      "Error testing MCP server:",
      error.response?.data || error.message
    );
  }
}

testMCPServer();
