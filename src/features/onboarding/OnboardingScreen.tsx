import React, { useRef, useCallback } from "react";
import {
	View,
	Animated,
	SafeAreaView,
	StyleSheet,
} from "react-native";
import WelcomeStep from "@/features/onboarding/components/WelcomeStep";
import AddCardStep from "@/features/onboarding/components/AddCardStep";
import SuccessStep from "@/features/onboarding/components/SuccessStep";
import type { CreditCard } from "@/shared/types/creditCard";

type Step = 0 | 1 | 2;

const STEP_ANIMATION_DURATION = 350;

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
