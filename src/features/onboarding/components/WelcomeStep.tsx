import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WelcomeStepProps {
	onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				{/* Logo / illustration area */}
				<Animated.View
					style={[
						styles.logoContainer,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<View style={styles.logoCircle}>
						<Ionicons name="card-outline" size={48} color="#3B82F6" />
					</View>
				</Animated.View>

				{/* Title */}
				<Animated.Text
					style={[
						styles.title,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					Bienvenido a MyQuota
				</Animated.Text>

				{/* Subtitle */}
				<Animated.Text
					style={[
						styles.subtitle,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					Llevá el control de tus tarjetas de crédito en un solo lugar
				</Animated.Text>
			</View>

			{/* Button */}
			<Animated.View
				style={[
					styles.buttonWrapper,
					{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					},
				]}
			>
				<TouchableOpacity
					style={styles.startButton}
					onPress={onNext}
					activeOpacity={0.85}
				>
					<Text style={styles.startButtonText}>Comenzar</Text>
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	logoContainer: {
		marginBottom: 40,
	},
	logoCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "rgba(59, 130, 246, 0.1)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(59, 130, 246, 0.2)",
	},
	title: {
		fontSize: 32,
		fontWeight: "700",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: 16,
	},
	subtitle: {
		fontSize: 16,
		color: "#94A3B8",
		textAlign: "center",
		lineHeight: 24,
		paddingHorizontal: 20,
	},
	buttonWrapper: {
		width: "100%",
		paddingBottom: 40,
	},
	startButton: {
		width: "100%",
		height: 56,
		backgroundColor: "#1E40AF",
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	startButtonText: {
		fontSize: 17,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
