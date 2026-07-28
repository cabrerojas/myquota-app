import React, { useEffect, useRef, useState, useCallback } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Pressable,
	Animated,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { CreditCard } from "@/shared/types/creditCard";
import { createCreditCard } from "@/features/onboarding/services/onboardingApi";
import type { ApiError } from "@/features/onboarding/services/onboardingApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddCardStepProps {
	onCardCreated: (card: CreditCard) => void;
}

type CardNetwork = "VISA" | "MASTERCARD" | "AMEX";

interface CardNetworkOption {
	key: CardNetwork;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
}

interface FormData {
	cardHolderName: string;
	cardLastDigits: string;
	closingDay: string;
	dueDay: string;
	cardType: CardNetwork;
	hasUsdLimit: boolean;
	nationalTotalLimit: string;
	internationalTotalLimit: string;
}

interface FormErrors {
	cardHolderName?: string;
	cardLastDigits?: string;
	closingDay?: string;
	dueDay?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CARD_NETWORKS: CardNetworkOption[] = [
	{ key: "VISA", label: "Visa", icon: "card-outline" },
	{ key: "MASTERCARD", label: "Mastercard", icon: "card-outline" },
	{ key: "AMEX", label: "American Express", icon: "card-outline" },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1));

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddCardStep({ onCardCreated }: AddCardStepProps) {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	// ── Form state ──────────────────────────────────────────────────────────
	const [form, setForm] = useState<FormData>({
		cardHolderName: "",
		cardLastDigits: "",
		closingDay: "15",
		dueDay: "10",
		cardType: "VISA",
		hasUsdLimit: false,
		nationalTotalLimit: "",
		internationalTotalLimit: "",
	});

	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showLimits, setShowLimits] = useState(false);

	// Picker state for closing/due day
	const [showClosingPicker, setShowClosingPicker] = useState(false);
	const [showDuePicker, setShowDuePicker] = useState(false);

	// ── Entrance animation ──────────────────────────────────────────────────
	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 400,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	// ── Handlers ────────────────────────────────────────────────────────────

	const updateField = useCallback(
		(field: keyof FormData, value: string | boolean) => {
			setForm((prev) => ({ ...prev, [field]: value }));
			// Clear error on change
			if (typeof value === "string" && value.length > 0) {
				setErrors((prev) => ({ ...prev, [field]: undefined }));
			}
		},
		[],
	);

	const handleNetworkSelect = useCallback((network: CardNetwork) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
		setForm((prev) => ({ ...prev, cardType: network }));
	}, []);

	// ── Validation ──────────────────────────────────────────────────────────

	const validateField = useCallback(
		(field: keyof FormErrors): string | undefined => {
			switch (field) {
				case "cardHolderName":
					if (!form.cardHolderName.trim()) {
						return "Este campo es obligatorio";
					}
					return undefined;
				case "cardLastDigits": {
					const trimmed = form.cardLastDigits.trim();
					if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
						return "Deben ser 4 dígitos";
					}
					return undefined;
				}
				case "closingDay": {
					const closingDay = parseInt(form.closingDay, 10);
					if (isNaN(closingDay) || closingDay < 1 || closingDay > 31) {
						return "Seleccioná un día válido";
					}
					return undefined;
				}
				case "dueDay": {
					const dueDay = parseInt(form.dueDay, 10);
					if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
						return "Seleccioná un día válido";
					}
					return undefined;
				}
				default:
					return undefined;
			}
		},
		[form],
	);

	const handleBlur = useCallback(
		(field: keyof FormErrors) => {
			const error = validateField(field);
			setErrors((prev) => ({ ...prev, [field]: error }));
		},
		[validateField],
	);

	const validateAll = useCallback((): boolean => {
		const newErrors: FormErrors = {
			cardHolderName: validateField("cardHolderName"),
			cardLastDigits: validateField("cardLastDigits"),
			closingDay: validateField("closingDay"),
			dueDay: validateField("dueDay"),
		};
		setErrors(newErrors);
		return !Object.values(newErrors).some(Boolean);
	}, [validateField]);

	// ── Submit ──────────────────────────────────────────────────────────────

	const handleSubmit = useCallback(async () => {
		if (!validateAll()) return;

		setIsSubmitting(true);
		try {
			const card = await createCreditCard({
				cardType: form.cardType,
				cardHolderName: form.cardHolderName.trim(),
				cardLastDigits: form.cardLastDigits.trim(),
				closingDay: parseInt(form.closingDay, 10),
				dueDay: parseInt(form.dueDay, 10),
				nationalTotalLimit: form.nationalTotalLimit
					? parseFloat(form.nationalTotalLimit)
					: undefined,
				internationalTotalLimit: form.internationalTotalLimit
					? parseFloat(form.internationalTotalLimit)
					: undefined,
			});
			onCardCreated(card);
		} catch (error: unknown) {
			if (error && typeof error === "object" && "fieldErrors" in error) {
				const apiErr = error as ApiError;
				if (apiErr.fieldErrors) {
					// Map API field errors to our form fields
					const mapped: FormErrors = {};
					if (apiErr.fieldErrors.cardHolderName)
						mapped.cardHolderName = apiErr.fieldErrors.cardHolderName;
					if (apiErr.fieldErrors.cardLastDigits)
						mapped.cardLastDigits = apiErr.fieldErrors.cardLastDigits;
					if (apiErr.fieldErrors.closingDay)
						mapped.closingDay = apiErr.fieldErrors.closingDay;
					if (apiErr.fieldErrors.dueDay)
						mapped.dueDay = apiErr.fieldErrors.dueDay;
					setErrors(mapped);
				}
				Alert.alert("Error", apiErr.message || "Ocurrió un error al guardar");
			} else if (error instanceof Error) {
				Alert.alert("Error", error.message);
			} else {
				Alert.alert("Error", "Ocurrió un error inesperado");
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [form, validateAll, onCardCreated]);

	// ── Day picker ──────────────────────────────────────────────────────────

	const renderDayPicker = useCallback(
		(
			label: string,
			value: string,
			onChange: (day: string) => void,
			field: keyof FormErrors,
			isOpen: boolean,
			setOpen: (v: boolean) => void,
		) => {
			const fieldError = errors[field];
			return (
				<View style={styles.fieldContainer}>
					<Text style={styles.fieldLabel}>{label}</Text>
					<TouchableOpacity
						style={[
							styles.pickerButton,
							fieldError ? styles.inputError : undefined,
						]}
						onPress={() => setOpen(!isOpen)}
						activeOpacity={0.8}
					>
						<Text style={styles.pickerButtonText}>{value}</Text>
						<Ionicons
							name={isOpen ? "chevron-up" : "chevron-down"}
							size={18}
							color="#94A3B8"
						/>
					</TouchableOpacity>
					{fieldError && (
						<Text style={styles.errorText}>{fieldError}</Text>
					)}

					{isOpen && (
						<View style={styles.pickerDropdown}>
							<ScrollView
								style={styles.pickerScroll}
								nestedScrollEnabled
							>
								{DAY_OPTIONS.map((day) => (
									<TouchableOpacity
										key={day}
										style={[
											styles.pickerOption,
											day === value &&
												styles.pickerOptionSelected,
										]}
										onPress={() => {
											onChange(day);
											setOpen(false);
											setErrors((prev) => ({
												...prev,
												[field]: undefined,
											}));
										}}
									>
										<Text
											style={[
												styles.pickerOptionText,
												day === value &&
													styles.pickerOptionTextSelected,
											]}
										>
											{day}
										</Text>
										{day === value && (
											<Ionicons
												name="checkmark"
												size={18}
												color="#3B82F6"
											/>
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					)}
				</View>
			);
		},
		[errors],
	);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
		>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					{/* ── Progress indicator ─────────────────────────────── */}
					<View style={styles.progressContainer}>
						<Text style={styles.progressText}>Paso 1 de 2</Text>
						<View style={styles.stepDots}>
							<View style={[styles.dot, styles.dotActive]} />
							<View style={styles.dot} />
						</View>
					</View>

					{/* ── Card type selector ──────────────────────────────── */}
					<Text style={styles.sectionTitle}>Tipo de tarjeta</Text>
					<View style={styles.networkRow}>
						{CARD_NETWORKS.map((network) => {
							const isSelected = form.cardType === network.key;
							return (
								<Pressable
									key={network.key}
									style={[
										styles.networkChip,
										isSelected && styles.networkChipSelected,
									]}
									onPress={() => handleNetworkSelect(network.key)}
								>
									<Ionicons
										name={network.icon}
										size={20}
										color={
											isSelected ? "#3B82F6" : "#94A3B8"
										}
									/>
									<Text
										style={[
											styles.networkChipText,
											isSelected &&
												styles.networkChipTextSelected,
										]}
									>
										{network.label}
									</Text>
								</Pressable>
							);
						})}
					</View>

					{/* ── Form fields ─────────────────────────────────────── */}

					{/* Card holder name */}
					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>Nombre del titular</Text>
						<TextInput
							style={[
								styles.input,
								errors.cardHolderName ? styles.inputError : undefined,
							]}
							placeholder="Como figura en la tarjeta"
							placeholderTextColor="#64748B"
							value={form.cardHolderName}
							onChangeText={(v) => updateField("cardHolderName", v)}
							onBlur={() => handleBlur("cardHolderName")}
							autoCapitalize="words"
							returnKeyType="next"
						/>
						{errors.cardHolderName && (
							<Text style={styles.errorText}>
								{errors.cardHolderName}
							</Text>
						)}
					</View>

					{/* Last 4 digits */}
					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>Últimos 4 dígitos</Text>
						<TextInput
							style={[
								styles.input,
								errors.cardLastDigits ? styles.inputError : undefined,
							]}
							placeholder="1234"
							placeholderTextColor="#64748B"
							value={form.cardLastDigits}
							onChangeText={(v) => {
								const digits = v.replace(/\D/g, "").slice(0, 4);
								updateField("cardLastDigits", digits);
							}}
							onBlur={() => handleBlur("cardLastDigits")}
							inputMode="numeric"
							maxLength={4}
							returnKeyType="done"
						/>
						{errors.cardLastDigits && (
							<Text style={styles.errorText}>
								{errors.cardLastDigits}
							</Text>
						)}
					</View>

					{/* Closing day */}
					{renderDayPicker(
						"¿Qué día cierra tu tarjeta?",
						form.closingDay,
						(v) => updateField("closingDay", v),
						"closingDay",
						showClosingPicker,
						setShowClosingPicker,
					)}

					{/* Due day */}
					{renderDayPicker(
						"¿Cuál es el día de vencimiento?",
						form.dueDay,
						(v) => updateField("dueDay", v),
						"dueDay",
						showDuePicker,
						setShowDuePicker,
					)}

					{/* ── Hint card ─────────────────────────────────────────── */}
					<View style={styles.hintCard}>
						<Text style={styles.hintText}>
							💡 Las tarjetas bancarias suelen cerrar el mismo día
							todos los meses
						</Text>
					</View>

					{/* ── Collapsible limits section ────────────────────────── */}
					<TouchableOpacity
						style={styles.limitsHeader}
						onPress={() => setShowLimits(!showLimits)}
						activeOpacity={0.7}
					>
						<Text style={styles.limitsHeaderText}>
							Límites de la tarjeta (opcional)
						</Text>
						<Ionicons
							name={showLimits ? "chevron-up" : "chevron-down"}
							size={20}
							color="#94A3B8"
						/>
					</TouchableOpacity>

					{showLimits && (
						<View style={styles.limitsBody}>
							{/* Has USD limit toggle */}
							<View style={styles.toggleRow}>
								<Text style={styles.toggleLabel}>
									¿Esta tarjeta tiene límite en USD?
								</Text>
								<TouchableOpacity
									style={[
										styles.toggleSwitch,
										form.hasUsdLimit &&
											styles.toggleSwitchActive,
									]}
									onPress={() =>
										updateField("hasUsdLimit", !form.hasUsdLimit)
									}
								>
									<View
										style={[
											styles.toggleThumb,
											form.hasUsdLimit &&
												styles.toggleThumbActive,
										]}
									/>
								</TouchableOpacity>
							</View>

							{/* National limit */}
							<View style={styles.fieldContainer}>
								<Text style={styles.fieldLabel}>
									Límite total CLP
								</Text>
								<TextInput
									style={styles.input}
									placeholder="Ej: 500000"
									placeholderTextColor="#64748B"
									value={form.nationalTotalLimit}
									onChangeText={(v) => {
										const cleaned = v.replace(/[^0-9.]/g, "");
										updateField("nationalTotalLimit", cleaned);
									}}
									inputMode="decimal"
									returnKeyType="done"
								/>
							</View>

							{/* International limit (only if has USD) */}
							{form.hasUsdLimit && (
								<View style={styles.fieldContainer}>
									<Text style={styles.fieldLabel}>
										Límite total USD
									</Text>
									<TextInput
										style={styles.input}
										placeholder="Ej: 3000"
										placeholderTextColor="#64748B"
										value={form.internationalTotalLimit}
										onChangeText={(v) => {
											const cleaned = v.replace(
												/[^0-9.]/g,
												"",
											);
											updateField(
												"internationalTotalLimit",
												cleaned,
											);
										}}
										inputMode="decimal"
										returnKeyType="done"
									/>
								</View>
							)}
						</View>
					)}

					{/* ── Submit button ──────────────────────────────────────── */}
					<View style={styles.submitWrapper}>
						<TouchableOpacity
							style={[
								styles.submitButton,
								isSubmitting && styles.submitButtonDisabled,
							]}
							onPress={handleSubmit}
							activeOpacity={0.85}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<ActivityIndicator color="#FFFFFF" size="small" />
							) : (
								<Text style={styles.submitButtonText}>
									Guardar y continuar
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</Animated.View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 40,
	},

	// Progress
	progressContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	progressText: {
		fontSize: 14,
		color: "#94A3B8",
		fontWeight: "500",
	},
	stepDots: {
		flexDirection: "row",
		gap: 8,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "rgba(255, 255, 255, 0.15)",
	},
	dotActive: {
		width: 24,
		backgroundColor: "#3B82F6",
	},

	// Section titles
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFFFFF",
		marginBottom: 12,
	},

	// Network chips
	networkRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 24,
	},
	networkChip: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		height: 48,
		borderRadius: 12,
		backgroundColor: "#101A34",
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.08)",
	},
	networkChipSelected: {
		borderColor: "#1E40AF",
		backgroundColor: "rgba(30, 64, 175, 0.15)",
		transform: [{ scale: 1.02 }],
	},
	networkChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#94A3B8",
	},
	networkChipTextSelected: {
		color: "#FFFFFF",
	},

	// Form fields
	fieldContainer: {
		marginBottom: 20,
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: "500",
		color: "#FFFFFF",
		marginBottom: 6,
	},
	input: {
		height: 52,
		backgroundColor: "#101A34",
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.08)",
		paddingHorizontal: 16,
		fontSize: 16,
		color: "#FFFFFF",
	},
	inputError: {
		borderColor: "#DC2626",
	},
	errorText: {
		fontSize: 12,
		color: "#DC2626",
		marginTop: 4,
	},

	// Day picker
	pickerButton: {
		height: 52,
		backgroundColor: "#101A34",
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: "rgba(255, 255, 255, 0.08)",
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	pickerButtonText: {
		fontSize: 16,
		color: "#FFFFFF",
	},
	// The dropdown appears below the button, pushing content
	pickerDropdown: {
		backgroundColor: "#192134",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.08)",
		marginTop: 4,
		overflow: "hidden",
	},
	pickerScroll: {
		maxHeight: 180,
	},
	pickerOption: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(255, 255, 255, 0.05)",
	},
	pickerOptionSelected: {
		backgroundColor: "rgba(59, 130, 246, 0.1)",
	},
	pickerOptionText: {
		fontSize: 16,
		color: "#94A3B8",
	},
	pickerOptionTextSelected: {
		color: "#FFFFFF",
		fontWeight: "600",
	},

	// Hint card
	hintCard: {
		backgroundColor: "#192134",
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.08)",
		marginBottom: 24,
	},
	hintText: {
		fontSize: 14,
		color: "#94A3B8",
		lineHeight: 20,
	},

	// Collapsible limits section
	limitsHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		marginBottom: 4,
	},
	limitsHeaderText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#94A3B8",
	},
	limitsBody: {
		marginBottom: 8,
	},

	// Toggle
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 20,
		paddingVertical: 4,
	},
	toggleLabel: {
		fontSize: 14,
		color: "#94A3B8",
		flex: 1,
		marginRight: 12,
	},
	toggleSwitch: {
		width: 48,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(255, 255, 255, 0.1)",
		justifyContent: "center",
		paddingHorizontal: 3,
	},
	toggleSwitchActive: {
		backgroundColor: "#1E40AF",
	},
	toggleThumb: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "#FFFFFF",
	},
	toggleThumbActive: {
		alignSelf: "flex-end",
	},

	// Submit button
	submitWrapper: {
		marginTop: 16,
		marginBottom: 40,
	},
	submitButton: {
		width: "100%",
		height: 56,
		backgroundColor: "#1E40AF",
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	submitButtonDisabled: {
		opacity: 0.7,
	},
	submitButtonText: {
		fontSize: 17,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
