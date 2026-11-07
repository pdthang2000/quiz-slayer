import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { spacing, useTheme } from '../../theme';
import { swipesToNext } from './session';

const FLIP_MS = 280;
const REDUCED_FLIP_MS = 150;
const FLY_OUT_MS = 200;
const MAX_TILT_DEGREES = 6;
const FLIP_EASING = Easing.bezier(0.77, 0, 0.175, 1);
const FLY_OUT_EASING = Easing.bezier(0.23, 1, 0.32, 1);

type Props = {
  front: string;
  back: string;
  showBack: boolean;
  /** Only the top card takes touches; the one under it is waiting to be revealed. */
  isTop: boolean;
  onFlip: () => void;
  /** STUDY-08: runs once the card has left the screen. */
  onSwipedToNext: () => void;
};

/**
 * One card of a study session. A tap turns it around the Y axis and a swipe either way sends
 * it off screen. Each card owns its animation values, so the card underneath is already in
 * place when this one leaves. With Reduce Motion on, the flip and the swipe are fades.
 */
export function StudyCard({ front, back, showBack, isTop, onFlip, onSwipedToNext }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  const turn = useSharedValue(showBack ? 1 : 0);
  const dragX = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    turn.set(
      withTiming(showBack ? 1 : 0, {
        duration: reduced ? REDUCED_FLIP_MS : FLIP_MS,
        easing: FLIP_EASING,
      }),
    );
  }, [showBack, reduced, turn]);

  const pan = usePanGesture({
    enabled: isTop,
    activeOffsetX: [-10, 10],
    failOffsetY: [-15, 15],
    onUpdate: (event) => {
      'worklet';
      if (reduced) return;
      dragX.set(event.translationX);
    },
    onDeactivate: (event) => {
      'worklet';
      if (swipesToNext(event.translationX, event.velocityX, width)) {
        const leave = () => {
          'worklet';
          scheduleOnRN(onSwipedToNext);
        };
        if (reduced) {
          fade.set(withTiming(0, { duration: REDUCED_FLIP_MS }, leave));
        } else {
          dragX.set(
            withTiming(
              Math.sign(event.translationX) * width * 1.3,
              { duration: FLY_OUT_MS, easing: FLY_OUT_EASING },
              leave,
            ),
          );
        }
      } else {
        dragX.set(
          withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX }),
        );
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [
      { translateX: dragX.get() },
      { rotateZ: `${(dragX.get() / width) * MAX_TILT_DEGREES}deg` },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => {
    const t = turn.get();
    if (reduced) return { opacity: 1 - t };
    return {
      opacity: t < 0.5 ? 1 : 0,
      transform: [{ perspective: 1200 }, { rotateY: `${t * 180}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const t = turn.get();
    if (reduced) return { opacity: t };
    return {
      opacity: t < 0.5 ? 0 : 1,
      transform: [{ perspective: 1200 }, { rotateY: `${t * 180 - 180}deg` }],
    };
  });

  const face = (text: string, shown: boolean, style: typeof frontStyle) => (
    <Animated.View
      style={[
        styles.face,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
    >
      <Text
        style={[styles.text, { color: colors.text }]}
        testID={isTop && shown ? 'study-shown-text' : undefined}
      >
        {text}
      </Text>
    </Animated.View>
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isTop ? 'auto' : 'none'}
      accessibilityElementsHidden={!isTop}
      importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.fill, cardStyle]}>
          <Pressable
            onPress={onFlip}
            accessibilityRole="button"
            testID={isTop ? 'study-card' : undefined}
            style={styles.fill}
          >
            {face(front, !showBack, frontStyle)}
            {face(back, showBack, backStyle)}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  face: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backfaceVisibility: 'hidden',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: { fontSize: 28, textAlign: 'center' },
});
