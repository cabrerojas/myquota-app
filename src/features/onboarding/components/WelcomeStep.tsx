import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WelcomeStepProps {
	onNext: () => void;
}

interface ValueProp {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	description: string;
}

const VALUE_PROPS: ValueProp[] = [
	{
		icon: "trending-down",
		title: "Control total",
		description: "Visualice todos sus gastos en un solo lugar, sin sorpresas",
	},
	{
		icon: "notifications",
		title: "Alertas inteligentes",
		description: "Reciba avisos antes del cierre para evitar intereses",
	},
	{
		icon: "calendar",
		title: "Proyección de deuda",
		description: "Sepa cuánto va a pagar los próximos meses",
	},
];

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current;
	const cardAnims = useRef(VALUE_PROPS.map(() => new Animated.Value(0))).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 500,
				useNativeDriver: Platform.OS !== "web",
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 500,
				useNativeDriver: Platform.OS !== "web",
			}),
		]).start();

		// Stagger card animations
		cardAnims.forEach((anim, i) => {
			Animated.timing(anim, {
				toValue: 1,
				duration: 400,
				delay: 300 + i * 150,
				useNativeDriver: Platform.OS !== "web",
			}).start();
		});
	}, [fadeAnim, slideAnim, cardAnims]);

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				{/* Logo */}
				<Animated.View
					style={[
						styles.logoContainer,
						{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
					]}
				>
					<View style={styles.logoIcon}>
						<Ionicons name="shield-checkmark" size={32} color="#059669" />
					</View>
					<Text style={styles.logoText}>MyQuota</Text>
				</Animated.View>

				{/* Title */}
				<Animated.Text
					style={[
						styles.title,
						{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
					]}
				>
					Bienvenido a tu{'\n'}control financiero
				</Animated.Text>

				{/* Subtitle — the "why" */}
				<Animated.Text
					style={[
						styles.subtitle,
						{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
					]}
				>
				Para ayudarle a gestionar sus tarjetas y entender sus finanzas,
				necesitamos que agregue su primera tarjeta.
				</Animated.Text>

				{/* Value props */}
				<View style={styles.valuePropsContainer}>
					{VALUE_PROPS.map((prop, i) => (
						<Animated.View
							key={prop.title}
							style={[
								styles.valueCard,
								{
									opacity: cardAnims[i],
									transform: [
										{
											translateY: cardAnims[i].interpolate({
												inputRange: [0, 1],
												outputRange: [16, 0],
											}),
										},
									],
								},
							]}
						>
							<View style={styles.valueIconWrap}>
								<Ionicons name={prop.icon} size={18} color="#3B82F6" />
							</View>
							<View style={styles.valueTextWrap}>
								<Text style={styles.valueTitle}>{prop.title}</Text>
								<Text style={styles.valueDesc}>{prop.description}</Text>
							</View>
						</Animated.View>
					))}
				</View>
			</View>

			{/* CTA */}
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
					<Text style={styles.startButtonText}>Agregar mi tarjeta</Text>
				</TouchableOpacity>
				<Text style={styles.buttonHint}>
					Sin compromiso — solo datos básicos
				</Text>
			</Animated.View>
		</View>
	);
}

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
		width: "100%",
	},

	// Logo
	logoContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		marginBottom: 32,
	},
	logoIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: "rgba(5, 150, 105, 0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	logoText: {
		fontSize: 24,
		fontWeight: "800",
		color: "#FFFFFF",
		letterSpacing: -0.5,
	},

	// Title
	title: {
		fontSize: 30,
		fontWeight: "700",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: 12,
		lineHeight: 38,
	},

	// Subtitle
	subtitle: {
		fontSize: 15,
		color: "#94A3B8",
		textAlign: "center",
		lineHeight: 22,
		paddingHorizontal: 8,
		marginBottom: 32,
	},

	// Value props
	valuePropsContainer: {
		gap: 10,
		paddingHorizontal: 4,
	},
	valueCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#192134",
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.06)",
		padding: 14,
		gap: 14,
	},
	valueIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: "rgba(59, 130, 246, 0.12)",
		justifyContent: "center",
		alignItems: "center",
		flexShrink: 0,
	},
	valueTextWrap: {
		flex: 1,
	},
	valueTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FFFFFF",
		marginBottom: 2,
	},
	valueDesc: {
		fontSize: 12,
		color: "#94A3B8",
		lineHeight: 17,
	},

	// Button
	buttonWrapper: {
		width: "100%",
		paddingBottom: 40,
		alignItems: "center",
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
	buttonHint: {
		fontSize: 12,
		color: "#64748B",
		marginTop: 10,
	},
});
