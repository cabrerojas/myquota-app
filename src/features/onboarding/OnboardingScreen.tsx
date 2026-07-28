import React, { useRef, useCallback } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	SafeAreaView,
	StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import WelcomeStep from "@/features/onboarding/components/WelcomeStep";
import AddCardStep from "@/features/onboarding/components/AddCardStep";
import type { CreditCard } from "@/shared/types/creditCard";

type Step = 0 | 1 | 2;

const STEP_ANIMATION_DURATION = 350;

export default function OnboardingScreen() {
	const [currentStep, setCurrentStep] = React.useState<Step>(0);

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
			// Reset the target step to initial animated state
			fadeAnims[toStep].setValue(0);
			slideAnims[toStep].setValue(30);

			// Fade out current step
			Animated.parallel([
				Animated.timing(fadeAnims[currentStep], {
					toValue: 0,
					duration: STEP_ANIMATION_DURATION,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnims[currentStep], {
					toValue: -30,
					duration: STEP_ANIMATION_DURATION,
					useNativeDriver: true,
				}),
			]).start(() => {
				// Set current step after fade-out completes
				setCurrentStep(toStep);

				// Fade in new step
				Animated.parallel([
					Animated.timing(fadeAnims[toStep], {
						toValue: 1,
						duration: STEP_ANIMATION_DURATION,
						useNativeDriver: true,
					}),
					Animated.timing(slideAnims[toStep], {
						toValue: 0,
						duration: STEP_ANIMATION_DURATION,
						useNativeDriver: true,
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
		(_card: CreditCard) => {
			// Advance to success step (2) after card is created
			if (currentStep < 2) {
				animateToStep(2 as Step);
			}
		},
		[currentStep, animateToStep],
	);

	return (
		<SafeAreaView style={styles.container}>
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
					<SuccessStep />
				</Animated.View>
			</View>
		</SafeAreaView>
	);
}

/** SuccessStep — shown after the card has been created */
function SuccessStep() {
	const router = useRouter();

	const handleGoToDashboard = useCallback(() => {
		router.replace("/(drawer)/dashboard");
	}, [router]);

	return (
		<View style={styles.successContainer}>
			<View style={styles.successContent}>
				<View style={styles.successIconCircle}>
					<Text style={styles.successIcon}>✅</Text>
				</View>

				<Text style={styles.successTitle}>¡Todo listo!</Text>

				<Text style={styles.successSubtitle}>
					Tu tarjeta fue agregada correctamente. Ya podés empezar a
					controlar tus gastos.
				</Text>
			</View>

			<View style={styles.successButtonWrapper}>
				<TouchableOpacity
					style={styles.successButton}
					onPress={handleGoToDashboard}
					activeOpacity={0.85}
				>
					<Text style={styles.successButtonText}>Ir al Dashboard</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0F172A",
	},
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

	// Success step
	successContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	successContent: {
		alignItems: "center",
		flex: 1,
		justifyContent: "center",
	},
	successIconCircle: {
		width: 96,
		height: 96,
		borderRadius: 48,
		backgroundColor: "rgba(5, 150, 105, 0.15)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 32,
	},
	successIcon: {
		fontSize: 48,
	},
	successTitle: {
		fontSize: 32,
		fontWeight: "700",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: 12,
	},
	successSubtitle: {
		fontSize: 16,
		color: "#94A3B8",
		textAlign: "center",
		lineHeight: 24,
		paddingHorizontal: 16,
	},
	successButtonWrapper: {
		width: "100%",
		paddingBottom: 40,
	},
	successButton: {
		width: "100%",
		height: 56,
		backgroundColor: "#1E40AF",
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	successButtonText: {
		fontSize: 17,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
