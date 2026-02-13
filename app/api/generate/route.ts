import { NextRequest, NextResponse } from 'next/server';
import { createAgent, initChatModel } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';
import type { GenerateRequest, ModelProvider } from '@/types';

export const runtime = 'nodejs';

// 生成解释词的 schema
const wordsSchema = z.object({
  relatedWords: z.array(
    z.object({
      word: z.string().describe('用于解释原词语的核心概念'),
      briefExplanation: z.string().describe('简短解释这个词语与原词语的关系'),
    })
  ).max(3).describe('不超过3个解释词'),
});

// 生成完整解释的 schema
const explanationSchema = z.object({
  explanation: z.string().describe('词语的完整解释，50-100字'),
});

const trimToUndefined = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const resolveProvider = (provider: ModelProvider | undefined, modelName: string): 'openai' | 'anthropic' => {
  if (provider === 'openai' || provider === 'anthropic') {
    return provider;
  }

  const normalizedModel = modelName.toLowerCase();
  if (normalizedModel.includes('claude') || normalizedModel.includes('anthropic')) {
    return 'anthropic';
  }

  return 'openai';
};

const resolveProviderConfig = (provider: 'openai' | 'anthropic', body: GenerateRequest) => {
  if (provider === 'anthropic') {
    return {
      apiKey:
        trimToUndefined(body.anthropicApiKey) ??
        trimToUndefined(body.apiKey) ??
        trimToUndefined(process.env.ANTHROPIC_API_KEY),
      baseUrl:
        trimToUndefined(body.anthropicBaseUrl) ??
        trimToUndefined(body.baseUrl) ??
        trimToUndefined(process.env.ANTHROPIC_BASE_URL),
    };
  }

  return {
    apiKey:
      trimToUndefined(body.openaiApiKey) ??
      trimToUndefined(body.apiKey) ??
      trimToUndefined(process.env.OPENAI_API_KEY),
    baseUrl:
      trimToUndefined(body.openaiBaseUrl) ??
      trimToUndefined(body.baseUrl) ??
      trimToUndefined(process.env.OPENAI_BASE_URL),
  };
};

const isDynamicImportBundlerError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('module as expression is too dynamic');
};

async function initModelWithFallback(
  modelName: string,
  provider: 'openai' | 'anthropic',
  config: { apiKey: string; baseUrl?: string }
) {
  try {
    if (provider === 'anthropic') {
      return await initChatModel(modelName, {
        modelProvider: 'anthropic',
        apiKey: config.apiKey,
        ...(config.baseUrl ? { anthropicApiUrl: config.baseUrl } : {}),
        temperature: 0.7,
      });
    }

    return await initChatModel(modelName, {
      modelProvider: 'openai',
      apiKey: config.apiKey,
      ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      temperature: 0.7,
    });
  } catch (error) {
    if (!isDynamicImportBundlerError(error)) {
      throw error;
    }

    if (provider === 'anthropic') {
      return new ChatAnthropic({
        model: modelName,
        apiKey: config.apiKey,
        ...(config.baseUrl ? { anthropicApiUrl: config.baseUrl } : {}),
        temperature: 0.7,
      });
    }

    return new ChatOpenAI({
      model: modelName,
      configuration: {
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      },
      temperature: 0.7,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { action, word, background, existingWords, context, direction, modelName } = body;

    if (!word) {
      return NextResponse.json(
        { error: '缺少必要参数: word' },
        { status: 400 }
      );
    }

    const resolvedModel = modelName || process.env.MODEL_NAME || 'gpt-5-mini';
    const provider = resolveProvider(body.provider, resolvedModel);
    const providerConfig = resolveProviderConfig(provider, body);

    if (!providerConfig.apiKey) {
      return NextResponse.json(
        { error: `${provider.toUpperCase()} API Key 未配置，请在设置中填写或配置环境变量` },
        { status: 400 }
      );
    }

    const model = await initModelWithFallback(resolvedModel, provider, {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
    });

    if (action === 'words') {
      const existingList = existingWords && existingWords.length > 0
        ? `\n避免使用以下已存在的词语：${existingWords.join('、')}`
        : '';

      const directionHint = direction
        ? `\n用户希望从以下角度探索：${direction}`
        : '';

      const prompt = `你是一个符号学专家，正在帮助用户探索"无限衍义"的概念。

用户想要理解词语：「${word}」

${background ? `背景上下文：${background}` : ''}${directionHint}
${existingList}

请生成不超过 3 个词语来解释「${word}」的含义。这些词语应该：
1. 是解释「${word}」时必须用到的核心概念
2. 每个词语本身也是一个可以被进一步解释的概念
3. 优先选择抽象概念而非具体事物
4. 词语应该简洁，通常是2-4个字的名词或概念${directionHint ? `\n5. 特别关注用户指定的探索方向` : ''}`;

      const wordsAgent = createAgent({
        model,
        responseFormat: wordsSchema,
      });

      const result = await wordsAgent.invoke({
        messages: [{ role: 'user', content: prompt }],
      });

      const structured = (result as { structuredResponse?: unknown }).structuredResponse;
      if (!structured) {
        throw new Error('模型未返回结构化结果');
      }

      const parsed = wordsSchema.parse(structured);
      return NextResponse.json(parsed);
    }

    if (action === 'explanation') {
      const contextStr = context && context.length > 0
        ? `\n相关词语：${context.join('、')}`
        : '';

      const prompt = `你是一个博学的学者，用优雅的语言解释概念。

请为词语「${word}」提供一段完整的解释。

${background ? `背景上下文：${background}` : ''}${contextStr}

要求：
1. 解释应该在 50-100 字之间
2. 语言风格应该像中世纪学者的注释，典雅而富有哲思
3. 可以引用相关词语来构建解释
4. 揭示这个词语与其他概念之间的联系`;

      const explanationAgent = createAgent({
        model,
        responseFormat: explanationSchema,
      });

      const result = await explanationAgent.invoke({
        messages: [{ role: 'user', content: prompt }],
      });

      const structured = (result as { structuredResponse?: unknown }).structuredResponse;
      if (!structured) {
        throw new Error('模型未返回结构化结果');
      }

      const parsed = explanationSchema.parse(structured);
      return NextResponse.json(parsed);
    }

    return NextResponse.json(
      { error: '无效的 action 参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI 生成错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: `生成失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
