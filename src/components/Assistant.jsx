import React, { useMemo, useState } from 'react';
import { Bot, Loader2, Send, UserRound } from 'lucide-react';
import { plantDatabase } from '../data/plantdatabase';

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const starterMessages = [
  {
    role: 'assistant',
    text: 'Ask me about plants, medicine systems, science, history, geography, or almost any general topic.',
  },
];

const createCompleteSummary = (text, maxSentences = 4) => {
  const sentences = text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]+/g);

  if (!sentences) {
    return text.replace(/\s+/g, ' ').trim();
  }

  return sentences.slice(0, maxSentences).join(' ').trim();
};

const removeTrailingEllipsis = (text) => text.replace(/\s*(\.{3}|…)\s*$/u, '.').trim();

const createPlantAnswer = (question) => {
  const normalizedQuestion = question.toLowerCase();
  const matches = plantDatabase.filter((plant) => {
    const searchableText = [
      plant.commonName,
      plant.scientificName,
      plant.family,
      plant.description,
      ...plant.ayushSystems,
      ...plant.uses,
      ...plant.precautions,
      ...plant.activeCompounds,
      ...plant.similarPlants,
    ].join(' ').toLowerCase();

    return searchableText.includes(normalizedQuestion) ||
      normalizedQuestion.includes(plant.commonName.toLowerCase().split(' ')[0]);
  });

  const directMatch = matches[0];

  if (!directMatch) {
    return '';
  }

  if (normalizedQuestion.includes('precaution') || normalizedQuestion.includes('safe')) {
    return `${directMatch.commonName} precautions: ${directMatch.precautions.join(' ')} This is educational only, not medical advice.`;
  }

  if (normalizedQuestion.includes('compound') || normalizedQuestion.includes('chemical')) {
    return `${directMatch.commonName} active compounds include ${directMatch.activeCompounds.join(', ')}.`;
  }

  if (normalizedQuestion.includes('system') || normalizedQuestion.includes('ayush')) {
    return `${directMatch.commonName} appears in these AYUSH systems: ${directMatch.ayushSystems.join(', ')}.`;
  }

  return `${directMatch.commonName} (${directMatch.scientificName}) is known for: ${directMatch.uses.join(', ')}. Key compounds: ${directMatch.activeCompounds.join(', ')}. Precaution: ${directMatch.precautions[0]}`;
};

const createSimpleAnswer = (question) => {
  const normalizedQuestion = question.trim().toLowerCase();

  if (/^(hi|hello|hey|namaste)\b/.test(normalizedQuestion)) {
    return 'Hello. Ask me anything, or upload a plant image in the scanner when you want identification.';
  }

  if (normalizedQuestion.includes('your name')) {
    return 'I am the AyurLens assistant. I can help with plant information and general questions.';
  }

  const mathExpression = question.trim();
  if (/^[\d\s+\-*/().%]+$/.test(mathExpression) && /[+\-*/%]/.test(mathExpression)) {
    try {
      const value = Function(`"use strict"; return (${mathExpression});`)();
      if (Number.isFinite(value)) {
        return `${mathExpression} = ${value}`;
      }
    } catch {
      return '';
    }
  }

  return '';
};

const fetchGeneralAnswer = async (question) => {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: question,
    gsrlimit: '1',
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    redirects: '1',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);

  if (!response.ok) {
    throw new Error('The general knowledge lookup failed.');
  }

  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});
  const page = pages[0];

  if (!page?.extract) {
    return 'I could not find a reliable general answer for that. Try asking with a more specific name or topic.';
  }

  const summary = createCompleteSummary(page.extract);

  return `${summary}\n\nSource: ${page.fullurl}`;
};

const fetchGeminiAnswer = async (question, messages) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return '';
  }

  const recentMessages = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
    .join('\n');

  const prompt = [
    'You are AyurLens Assistant, a helpful general-purpose chatbot inside a medicinal plant app.',
    'Use Google Search grounding and other open web knowledge when it helps. Give only the relevant answer in your own words. Do not paste long page text.',
    'Keep answers concise and complete: usually 2-5 full sentences, with short bullets only when helpful. Do not end with an ellipsis or an unfinished sentence.',
    'For medical, health, legal, or financial topics, give educational information and encourage consulting a qualified professional.',
    'If the user asks about plant identification or medicine use, remind them not to consume or apply unknown plants without expert verification.',
    recentMessages && `Recent conversation:\n${recentMessages}`,
    `User question: ${question}`,
  ].filter(Boolean).join('\n\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: 'You are AyurLens Assistant. Be accurate, concise, friendly, and useful.',
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      tools: [
        {
          google_search: {},
        },
      ],
      generationConfig: {
        maxOutputTokens: 700,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Gemini request failed.');
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const answer = removeTrailingEllipsis(
    candidate?.content?.parts?.map((part) => part.text || '').join('').trim() || ''
  );
  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter((web) => web?.uri && web?.title)
    .filter((web, index, allSources) =>
      allSources.findIndex((source) => source.uri === web.uri) === index
    )
    .slice(0, 3);

  if (!answer) {
    return '';
  }

  if (sources.length === 0) {
    return answer;
  }

  return `${answer}\n\nSources:\n${sources.map((source) => `- ${source.title}: ${source.uri}`).join('\n')}`;
};

const createAnswer = async (question, messages) => {
  const simpleAnswer = createSimpleAnswer(question);
  if (simpleAnswer) return simpleAnswer;

  const plantAnswer = createPlantAnswer(question);
  if (plantAnswer) return plantAnswer;

  try {
    const geminiAnswer = await fetchGeminiAnswer(question, messages);
    if (geminiAnswer) return geminiAnswer;
  } catch (error) {
    console.warn('Gemini answer failed, falling back to Wikipedia:', error);
  }

  return fetchGeneralAnswer(question);
};

export default function Assistant() {
  const [messages, setMessages] = useState(starterMessages);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const suggestions = useMemo(() => [
    'Is this plant safe to touch?',
    'How do I care for Aloe Vera?',
    'Which plants help repel mosquitoes?',
    'What symptoms need a doctor?',
  ], []);

  const submitQuestion = async (event, selectedQuestion = question) => {
    event?.preventDefault();
    const trimmedQuestion = selectedQuestion.trim();

    if (!trimmedQuestion || isThinking) {
      return;
    }

    setQuestion('');
    setIsThinking(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'user', text: trimmedQuestion },
    ]);

    try {
      const answer = await createAnswer(trimmedQuestion, messages);
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', text: answer },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          text: 'I could not reach the general knowledge service right now. Please check your internet connection and try again.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <section className="assistant-shell">
      <div className="assistant-messages">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const Icon = isUser ? UserRound : Bot;

          return (
            <div className={`message-row ${isUser ? 'message-row-user' : ''}`} key={`${message.role}-${index}`}>
              <div className="message-icon">
                <Icon className="w-4 h-4" />
              </div>
              <div className={`message-bubble ${isUser ? 'message-bubble-user' : ''}`}>
                {message.text}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="message-row">
            <div className="message-icon">
              <Bot className="w-4 h-4" />
            </div>
            <div className="message-bubble thinking-bubble">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="suggestion-row">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            disabled={isThinking}
            onClick={(event) => submitQuestion(event, suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form className="assistant-form" onSubmit={submitQuestion}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything..."
          disabled={isThinking}
        />
        <button type="submit" aria-label="Send question" disabled={isThinking}>
          {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </section>
  );
}
