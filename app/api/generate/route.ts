import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
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
      newConcept: z.string().describe('用于解释原词语的全新概念'),
      predicate: z.string().describe('用来连接“新概念 -> 旧概念”的谓词短语'),
      predicateReason: z.string().describe('为什么选择该谓词来解释旧概念'),
      briefExplanation: z.string().describe('新概念本身的简短解释'),
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

const promptTemplateCache = new Map<string, string>();

const DEFAULT_WORDS_PROMPT_TEMPLATE = `你是一个符号学专家，正在帮助用户探索"无限衍义"的概念。

用户想要理解词语：「{word}」

{background}
{direction}
{existingWords}

请按“新概念 -> 谓词 -> 旧概念（{word}）”的格式生成不超过3组关系。要求：
1. 先给出新概念（newConcept），再用谓词（predicate）说明该新概念如何解释旧概念
2. predicate 必须是简洁谓词短语（通常2-8字），例如“构成基础”“维系秩序”“揭示边界”
3. predicateReason 需解释为何使用该谓词（20-60字）
4. briefExplanation 需简述新概念本身（15-40字）
5. 优先抽象概念、可继续展开
{directionConstraint}`;

async function loadPromptTemplate(filename: string, fallback: string) {
  const cached = promptTemplateCache.get(filename);
  if (cached) return cached;

  try {
    const filePath = path.join(process.cwd(), 'prompts', filename);
    const content = await fs.readFile(filePath, 'utf8');
    const normalized = content.trim();
    if (normalized) {
      promptTemplateCache.set(filename, normalized);
      return normalized;
    }
  } catch (error) {
    console.warn(`读取提示词模板失败(${filename})，使用内置模板:`, error);
  }

  promptTemplateCache.set(filename, fallback);
  return fallback;
}

function fillPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

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
        ? `避免使用以下已存在的词语：${existingWords.join('、')}`
        : '';

      const directionHint = direction
        ? `用户希望从以下角度探索：${direction}`
        : '';

      const template = await loadPromptTemplate('generate-words.txt', DEFAULT_WORDS_PROMPT_TEMPLATE);
      const prompt = fillPromptTemplate(template, {
        word,
        background: background ? `背景上下文：${background}` : '',
        direction: directionHint,
        existingWords: existingList,
        directionConstraint: directionHint ? '6. 特别关注用户指定的探索方向' : '',
      });

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
