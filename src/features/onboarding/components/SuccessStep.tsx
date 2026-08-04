import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
	Alert,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { CreditCard } from "@/shared/types/creditCard";
import { borderRadius } from "@/shared/theme/tokens";

interface SuccessStepProps {
	card: CreditCard;
}

export default function SuccessStep({ card }: SuccessStepProps) {
	const router = useRouter();
	const checkScale = useRef(new Animated.Value(0)).current;
	const fadeIn = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.spring(checkScale, {
			toValue: 1,
			friction: 4,
			tension: 80,
			useNativeDriver: Platform.OS !== "web",
		}).start();

		Animated.timing(fadeIn, {
			toValue: 1,
			duration: 600,
			useNativeDriver: Platform.OS !== "web",
		}).start();
	}, [checkScale, fadeIn]);

	const handleGoToDashboard = () => {
		router.replace("/(drawer)/dashboard");
	};

	const handleAddManual = () => {
		router.push("/(screens)/addDebt");
	};

	const handleImportGmail = () => {
		Alert.alert(
			"Importar desde Gmail",
			"Esta funcionalidad estará disponible pronto. Por ahora podés agregar movimientos manualmente.",
		);
	};

	const cardTypeIcon =
		card.cardType?.toLowerCase() === "visa"
			? "card-outline"
			: card.cardType?.toLowerCase() === "mastercard"
				? "card-outline"
				: "card-outline";

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				{/* Animated checkmark */}
				<Animated.View
					style={[
						styles.checkCircle,
						{ transform: [{ scale: checkScale }] },
					]}
				>
					<Ionicons name="checkmark-circle" size={80} color="#059669" />
				</Animated.View>

				{/* Title */}
				<Text style={styles.title}>Listo</Text>

				{/* Card preview */}
				<Animated.View style={[styles.cardPreview, { opacity: fadeIn }]}>
					<View style={styles.cardHeader}>
						<Ionicons name={cardTypeIcon} size={24} color="#94A3B8" />
						<Text style={styles.cardType}>{card.cardType}</Text>
					</View>
					<Text style={styles.cardLastDigits}>
						****{card.cardLastDigits}
					</Text>
					<View style={styles.cardDates}>
						<Text style={styles.cardDateText}>
							Cierre: {card.closingDay ?? "—"}
						</Text>
						<Text style={styles.cardDateDivider}>|</Text>
						<Text style={styles.cardDateText}>
							Vence: {card.dueDay ?? "—"}
						</Text>
					</View>
				</Animated.View>

				{/* Subtitle */}
				<Text style={styles.subtitle}>¿Qué querés hacer ahora?</Text>

				{/* CTAs */}
				<View style={styles.ctasContainer}>
					<TouchableOpacity
						style={styles.ctaPrimary}
						onPress={handleImportGmail}
						activeOpacity={0.85}
					>
						<Ionicons
							name="mail-outline"
							size={20}
							color="#FFFFFF"
							style={styles.ctaIcon}
						/>
						<Text style={styles.ctaPrimaryText}>
							Importar desde Gmail
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.ctaOutline}
						onPress={handleAddManual}
						activeOpacity={0.85}
					>
						<Ionicons
							name="add-circle-outline"
							size={20}
							color="#FFFFFF"
							style={styles.ctaIcon}
						/>
						<Text style={styles.ctaOutlineText}>
							Agregar transacción manual
						</Text>
					</TouchableOpacity>

					<TouchableOpacity onPress={handleGoToDashboard}>
						<Text style={styles.ctaTextLink}>Ir al Dashboard</Text>
					</TouchableOpacity>
				</View>

				{/* Hint card */}
				<View style={styles.hintCard}>
					<Text style={styles.hintText}>
						Puede importar sus movimientos bancarios automáticamente
						conectando su Gmail.
					</Text>
				</View>
			</View>
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
		alignItems: "center",
		width: "100%",
	},
	checkCircle: {
		width: 96,
		height: 96,
		borderRadius: 48,
		backgroundColor: "rgba(5, 150, 105, 0.15)",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 24,
	},
	title: {
		fontSize: 32,
		fontWeight: "700",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: 24,
	},
	cardPreview: {
		width: "100%",
		backgroundColor: "#192134",
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.08)",
		padding: 20,
		marginBottom: 24,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
		gap: 8,
	},
	cardType: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	cardLastDigits: {
		fontSize: 18,
		fontWeight: "700",
		color: "#FFFFFF",
		marginBottom: 8,
		letterSpacing: 2,
	},
	cardDates: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	cardDateText: {
		fontSize: 14,
		color: "#94A3B8",
	},
	cardDateDivider: {
		fontSize: 14,
		color: "rgba(255,255,255,0.2)",
	},
	subtitle: {
		fontSize: 16,
		color: "#94A3B8",
		textAlign: "center",
		marginBottom: 24,
	},
	ctasContainer: {
		width: "100%",
		gap: 12,
		marginBottom: 24,
	},
	ctaPrimary: {
		width: "100%",
		height: 56,
		backgroundColor: "#1E40AF",
		borderRadius: borderRadius.full,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	ctaIcon: {
		marginRight: 8,
	},
	ctaPrimaryText: {
		fontSize: 17,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	ctaOutline: {
		width: "100%",
		height: 56,
		borderRadius: 28,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.2)",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	ctaOutlineText: {
		fontSize: 17,
		fontWeight: "600",
		color: "#FFFFFF",
	},
	ctaTextLink: {
		fontSize: 16,
		color: "#94A3B8",
		textAlign: "center",
		paddingVertical: 8,
	},
	hintCard: {
		width: "100%",
		backgroundColor: "#192134",
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.08)",
		padding: 16,
		marginBottom: 40,
	},
	hintText: {
		fontSize: 14,
		color: "#94A3B8",
		lineHeight: 20,
	},
});
