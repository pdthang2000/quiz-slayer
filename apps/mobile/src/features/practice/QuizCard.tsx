import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Quiz } from '../../api/types';
import { spacing, useTheme } from '../../theme';
import { AudioPlayer } from './AudioPlayer';
import { NoteBox } from './NoteBox';

type Props = {
  quiz: Quiz;
  /** While not answered: the choice picked per question (index), or undefined. */
  selected?: (number | undefined)[];
  onSelect?: (question: number, choice: number) => void;
  /** DP-10, DP-40: "Save as card" on a wrong single text question. */
  onSaveAsCard?: (questionId: string) => void;
  saving?: boolean;
  /** DP-45: notes show once a question is answered, on this session. */
  sessionId?: string;
  onNoteTyping?: (questionId: string, typing: boolean) => void;
};

/**
 * One quiz: a group's passage or audio, then its questions with their choices (DP-07).
 * Once answered (DP-20): ✓/✗, the correct answer, the explanation, Save as card, and the
 * user's note (DP-45).
 */
export function QuizCard({
  quiz,
  selected = [],
  onSelect,
  onSaveAsCard,
  saving,
  sessionId,
  onNoteTyping,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const answered = quiz.answer?.questions;

  return (
    <View style={styles.quiz} testID={`quiz-${quiz.id}`}>
      {quiz.audioUrl ? <AudioPlayer url={quiz.audioUrl} testID="quiz-audio" /> : null}
      {quiz.passage ? (
        <Text style={[styles.passage, { color: colors.text, backgroundColor: colors.surfaceMuted }]}>
          {quiz.passage}
        </Text>
      ) : null}

      {quiz.questions.map((question, qi) => {
        const feedback = answered?.[qi];
        return (
          <View key={question.id} style={styles.question}>
            {question.audioUrl ? <AudioPlayer url={question.audioUrl} testID={`question-audio-${question.id}`} /> : null}
            {question.imageUrl ? (
              <Image source={{ uri: question.imageUrl }} style={styles.image} resizeMode="contain" />
            ) : null}
            {question.text ? (
              <Text style={[styles.text, { color: colors.text }]}>{question.text}</Text>
            ) : null}

            {question.choices.map((choice, ci) => {
              const isPicked = feedback ? feedback.chosen === ci : selected[qi] === ci;
              const isKey = feedback?.correctChoice === ci;
              const border = feedback
                ? isKey
                  ? colors.success
                  : isPicked
                    ? colors.danger
                    : colors.border
                : isPicked
                  ? colors.primary
                  : colors.border;
              return (
                <Pressable
                  key={ci}
                  disabled={!!feedback || !onSelect}
                  onPress={() => onSelect?.(qi, ci)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isPicked, disabled: !!feedback }}
                  testID={`choice-${question.id}-${ci}`}
                  style={[styles.choice, { borderColor: border, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.choiceText, { color: colors.text }]}>
                    {'ABCDEF'[ci]}  {choice}
                  </Text>
                </Pressable>
              );
            })}

            {feedback ? (
              <View style={styles.feedback} testID={`feedback-${question.id}`}>
                <Text style={[styles.verdict, { color: feedback.correct ? colors.success : colors.danger }]}>
                  {feedback.correct ? t('practice.correct') : t('practice.wrong')}
                </Text>
                {!feedback.correct ? (
                  <Text style={{ color: colors.text }}>
                    {t('practice.answerIs', { answer: question.choices[feedback.correctChoice] })}
                  </Text>
                ) : null}
                {feedback.explanation ? (
                  <Text style={{ color: colors.textMuted }}>{feedback.explanation}</Text>
                ) : null}
                {feedback.savedAsCard ? (
                  <Text style={[styles.saved, { color: colors.textMuted }]} testID={`saved-${question.id}`}>
                    {t('practice.saved')}
                  </Text>
                ) : feedback.canSaveAsCard && onSaveAsCard ? (
                  <Pressable
                    onPress={() => onSaveAsCard(question.id)}
                    disabled={saving}
                    accessibilityRole="button"
                    testID={`save-as-card-${question.id}`}
                  >
                    <Text style={[styles.link, { color: colors.primary }]}>{t('practice.saveAsCard')}</Text>
                  </Pressable>
                ) : null}
                {sessionId && onNoteTyping ? (
                  <NoteBox
                    sessionId={sessionId}
                    questionId={question.id}
                    note={feedback.note}
                    version={feedback.noteVersion}
                    onTyping={onNoteTyping}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  quiz: { gap: spacing.lg },
  passage: { fontSize: 17, lineHeight: 26, padding: spacing.lg, borderRadius: 12 },
  question: { gap: spacing.sm },
  image: { width: '100%', height: 200 },
  text: { fontSize: 19, fontWeight: '600', marginBottom: spacing.xs },
  choice: { borderWidth: 2, borderRadius: 12, padding: spacing.md },
  choiceText: { fontSize: 17 },
  feedback: { gap: spacing.xs, marginTop: spacing.xs },
  verdict: { fontSize: 16, fontWeight: '700' },
  saved: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 16, fontWeight: '600' },
});
