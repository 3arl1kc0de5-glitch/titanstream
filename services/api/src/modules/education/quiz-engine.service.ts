import { Injectable, BadRequestException } from '@nestjs/common';
import { EducationModuleId } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  timestamp: string;
}

const MAX_ATTEMPTS = 3;
const PASS_THRESHOLD = 0.8;

@Injectable()
export class QuizEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async submitAnswer(
    telegramUserId: bigint,
    moduleId: string,
    questionIndex: number,
    selectedIndex: number,
    timeSpentSeconds: number,
  ) {
    const moduleKey = moduleId as EducationModuleId;
    const completion = await this.prisma.educationCompletion.findUnique({
      where: { telegramUserId_moduleId: { telegramUserId, moduleId: moduleKey } },
    });

    if (!completion) {
      throw new BadRequestException({ code: 'MODULE_NOT_STARTED', message: 'Module not started' });
    }
    if (completion.status === 'COMPLETED' && completion.passed) {
      throw new BadRequestException({ code: 'QUIZ_ALREADY_PASSED', message: 'Quiz already passed' });
    }
    if (completion.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException({ code: 'QUIZ_LOCKED', message: 'Maximum attempts reached' });
    }

    const mod = await this.prisma.educationModule.findUnique({ where: { id: moduleKey } });
    const content = mod?.content as any;
    const questions: QuizQuestion[] = Array.isArray(content) ? content.filter((item) => item.type === 'quiz_question') : content?.questions || [];
    const question = questions[questionIndex];
    if (!question) {
      throw new BadRequestException({ code: 'INVALID_QUESTION_INDEX', message: 'Question index out of range' });
    }

    const existingAnswers = ((completion.answers as unknown as QuizAnswer[]) || []).filter(Boolean);
    if (existingAnswers.some((answer) => answer.questionIndex === questionIndex)) {
      throw new BadRequestException({ code: 'QUESTION_ALREADY_ANSWERED', message: 'This question has already been answered' });
    }

    const allAnswers = [...existingAnswers, { questionIndex, selectedIndex, timestamp: new Date().toISOString() }];
    const totalCorrect = allAnswers.filter((answer) => questions[answer.questionIndex]?.correctIndex === answer.selectedIndex).length;

    await this.prisma.educationCompletion.update({
      where: { id: completion.id },
      data: {
        answers: allAnswers as any,
        score: totalCorrect,
        maxScore: questions.length,
        timeSpentSeconds: { increment: timeSpentSeconds },
      },
    });

    return {
      correct: selectedIndex === question.correctIndex,
      explanation: question.explanation,
      questionIndex,
      totalAnswered: allAnswers.length,
      totalCorrect,
      totalQuestions: questions.length,
    };
  }

  async completeQuiz(telegramUserId: bigint, moduleId: string, timeSpentSeconds: number) {
    const moduleKey = moduleId as EducationModuleId;
    const completion = await this.prisma.educationCompletion.findUnique({
      where: { telegramUserId_moduleId: { telegramUserId, moduleId: moduleKey } },
    });
    if (!completion) {
      throw new BadRequestException({ code: 'MODULE_NOT_STARTED', message: 'Quiz module not started' });
    }

    const mod = await this.prisma.educationModule.findUnique({ where: { id: moduleKey } });
    const content = mod?.content as any;
    const questions: QuizQuestion[] = Array.isArray(content) ? content.filter((item) => item.type === 'quiz_question') : content?.questions || [];
    const answers = ((completion.answers as unknown as QuizAnswer[]) || []).filter(Boolean);
    if (answers.length < questions.length) {
      throw new BadRequestException({ code: 'QUIZ_INCOMPLETE', message: 'Not all questions have been answered' });
    }

    const score = answers.filter((answer) => questions[answer.questionIndex]?.correctIndex === answer.selectedIndex).length;
    const passed = questions.length > 0 && score / questions.length >= PASS_THRESHOLD;
    const attempts = completion.attempts + 1;

    await this.prisma.educationCompletion.update({
      where: { id: completion.id },
      data: {
        attempts,
        score,
        maxScore: questions.length,
        passed,
        status: passed ? 'COMPLETED' : 'FAILED',
        completedAt: passed ? new Date() : null,
        timeSpentSeconds: { increment: timeSpentSeconds },
      },
    });

    return {
      passed,
      score,
      total: questions.length,
      percentage: Math.round((score / Math.max(questions.length, 1)) * 100),
      attempts,
      retryAllowed: !passed && attempts < MAX_ATTEMPTS,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
    };
  }
}
