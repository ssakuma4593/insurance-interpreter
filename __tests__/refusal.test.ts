import { answerQuestion } from '@/lib/llm';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: "I can't find that information in your document.",
              },
            }],
          }),
        },
      },
    })),
  };
});

describe('Refusal Behavior', () => {
  it('should refuse when no retrieval results', async () => {
    const result = await answerQuestion(
      'What is my deductible?',
      [],
      'beginner'
    );

    expect(result.answer.toLowerCase()).toContain("can't find");
    expect(result.confidence).toBe('low');
    expect(result.citations).toEqual([]);
  });

  it('should return low confidence with empty retrieval', async () => {
    const result = await answerQuestion(
      'What is my copay?',
      [],
      'intermediate'
    );

    expect(result.confidence).toBe('low');
  });
});
