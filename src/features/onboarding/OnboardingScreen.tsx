import React, { useRef, useCallback } from "react";
import {
	View,
	Animated,
	SafeAreaView,
	StyleSheet,
	Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import WelcomeStep from "@/features/onboarding/components/WelcomeStep";
import AddCardStep from "@/features/onboarding/components/AddCardStep";
import SuccessStep from "@/features/onboarding/components/SuccessStep";
import type { CreditCard } from "@/shared/types/creditCard";

type Step = 0 | 1 | 2;

const STEP_ANIMATION_DURATION = 300;

const STEP_LABELS = ["Bienvenida", "Agregar tarjeta", "Listo"];

interface StepIndicatorProps {
	currentStep: Step;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
	return (
		<View style={styles.stepIndicator}>
			{STEP_LABELS.map((label, i) => {
				const isActive = currentStep === i;
				const isPast = currentStep > i;
				return (
					<React.Fragment key={label}>
						{/* Step dot + label row */}
						<View style={styles.stepItem}>
							<View
								style={[
									styles.stepDot,
									isActive && styles.stepDotActive,
									isPast && styles.stepDotPast,
								]}
							>
								<View
									style={[
										styles.stepDotInner,
										isActive && styles.stepDotInnerActive,
										isPast && styles.stepDotInnerPast,
									]}
								/>
							</View>
						</View>

						{/* Connector line (not after last) */}
						{i < STEP_LABELS.length - 1 && (
							<View
								style={[
									styles.stepConnector,
									(isActive || isPast) && styles.stepConnectorActive,
								]}
							/>
						)}
					</React.Fragment>
				);
			})}
		</View>
	);
}

export default function OnboardingScreen() {
	const [currentStep, setCurrentStep] = React.useState<Step>(0);
	const [createdCard, setCreatedCard] = React.useState<CreditCard | null>(null);

	// Animated values for opacity and translateY per step
	const fadeAnims = useRef([
		new Animated.Value(1),
		new Animated.Value(0),
		new Animated.Value(0),
	]).current;

	const slideAnims = useRef([
		new Animated.Value(0),
		new Animated.Value(30),
		new Animated.Value(30),
	]).current;

	const animateToStep = useCallback(
		(toStep: Step) => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

			// Reset the target step to initial animated state
			fadeAnims[toStep].setValue(0);
			slideAnims[toStep].setValue(30);

			// Fade out current step
			Animated.parallel([
				Animated.timing(fadeAnims[currentStep], {
					toValue: 0,
					duration: STEP_ANIMATION_DURATION,
					useNativeDriver: Platform.OS !== "web",
				}),
				Animated.timing(slideAnims[currentStep], {
					toValue: -20,
					duration: STEP_ANIMATION_DURATION,
					useNativeDriver: Platform.OS !== "web",
				}),
			]).start(() => {
				// Set current step after fade-out completes
				setCurrentStep(toStep);

				// Fade in new step
				Animated.parallel([
					Animated.timing(fadeAnims[toStep], {
						toValue: 1,
						duration: STEP_ANIMATION_DURATION,
						useNativeDriver: Platform.OS !== "web",
					}),
					Animated.spring(slideAnims[toStep], {
						toValue: 0,
						friction: 8,
						tension: 60,
						useNativeDriver: Platform.OS !== "web",
					}),
				]).start();
			});
		},
		[currentStep, fadeAnims, slideAnims],
	);

	const handleNext = useCallback(() => {
		if (currentStep < 2) {
			animateToStep((currentStep + 1) as Step);
		}
	}, [currentStep, animateToStep]);

	const handleCardCreated = useCallback(
		(card: CreditCard) => {
			setCreatedCard(card);
			// Advance to success step (2) after card is created
			if (currentStep < 2) {
				animateToStep(2 as Step);
			}
		},
		[currentStep, animateToStep],
	);

	return (
		<SafeAreaView style={styles.container}>
			{/* Step indicator (visible on card form, hidden on success) */}
			{currentStep < 2 && (
				<View style={styles.headerArea}>
					<StepIndicator currentStep={currentStep} />
				</View>
			)}

			<View style={styles.stepsContainer}>
				{/* Step 0: Welcome */}
				<Animated.View
					style={[
						styles.step,
						{
							opacity: fadeAnims[0],
							transform: [{ translateY: slideAnims[0] }],
						},
					]}
					pointerEvents={currentStep === 0 ? "auto" : "none"}
				>
					<WelcomeStep onNext={handleNext} />
				</Animated.View>

				{/* Step 1: Add Card */}
				<Animated.View
					style={[
						styles.step,
						{
							opacity: fadeAnims[1],
							transform: [{ translateY: slideAnims[1] }],
						},
					]}
					pointerEvents={currentStep === 1 ? "auto" : "none"}
				>
					<AddCardStep onCardCreated={handleCardCreated} />
				</Animated.View>

				{/* Step 2: Success */}
				<Animated.View
					style={[
						styles.step,
						{
							opacity: fadeAnims[2],
							transform: [{ translateY: slideAnims[2] }],
						},
					]}
					pointerEvents={currentStep === 2 ? "auto" : "none"}
				>
					{createdCard && <SuccessStep card={createdCard} />}
				</Animated.View>
			</View>
		</SafeAreaView>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0F172A",
	},

	// Step indicator
	headerArea: {
		paddingTop: 12,
		paddingHorizontal: 32,
		paddingBottom: 8,
	},
	stepIndicator: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	stepItem: {
		alignItems: "center",
	},
	stepDot: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(255, 255, 255, 0.06)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "rgba(255, 255, 255, 0.1)",
	},
	stepDotActive: {
		borderColor: "#3B82F6",
		backgroundColor: "rgba(59, 130, 246, 0.1)",
	},
	stepDotPast: {
		borderColor: "#059669",
		backgroundColor: "rgba(5, 150, 105, 0.1)",
	},
	stepDotInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
	},
	stepDotInnerActive: {
		backgroundColor: "#3B82F6",
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	stepDotInnerPast: {
		backgroundColor: "#059669",
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	stepConnector: {
		width: 48,
		height: 2,
		backgroundColor: "rgba(255, 255, 255, 0.06)",
		marginHorizontal: 4,
		borderRadius: 1,
	},
	stepConnectorActive: {
		backgroundColor: "#059669",
	},

	// Steps container
	stepsContainer: {
		flex: 1,
		position: "relative",
	},
	step: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
});
