import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["langchain", "@langchain/openai", "@langchain/anthropic"],
};

export default nextConfig;
