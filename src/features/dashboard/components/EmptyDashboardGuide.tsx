import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/shared/theme/colors";

interface ActionCard {
	id: string;
	icon: keyof typeof Ionicons.glyphMap;
	iconBg: string;
	iconColor: string;
	title: string;
	description: string;
	route: { pathname: string; params?: Record<string, string> };
}

const ACTIONS: ActionCard[] = [
	{
		id: "import",
		icon: "sync-outline",
		iconBg: "rgba(59, 130, 246, 0.12)",
		iconColor: colors.accent,
		title: "Importar movimientos",
		description: "Conecte sus cuentas bancarias o importe desde su email",
		route: { pathname: "/(drawer)/dashboard" },
	},
	{
		id: "budget",
		icon: "wallet-outline",
		iconBg: "rgba(5, 150, 105, 0.12)",
		iconColor: colors.success,
		title: "Configurar presupuesto",
		description: "Defina sus límites mensuales para controlar sus gastos",
		route: { pathname: "/(drawer)/profile" },
	},
	{
		id: "explore",
		icon: "compass-outline",
		iconBg: "rgba(139, 92, 246, 0.12)",
		iconColor: colors.accent,
		title: "Explorar historial",
		description: "Revise sus transacciones y categorice sus gastos",
		route: { pathname: "/(drawer)/transactions" },
	},
];

interface EmptyDashboardGuideProps {
	onImport?: () => void;
}

export default function EmptyDashboardGuide({
	onImport,
}: EmptyDashboardGuideProps) {
	const router = useRouter();

	const handleAction = (action: ActionCard) => {
		if (action.id === "import" && onImport) {
			onImport();
			return;
		}
		router.push(action.route.pathname as any);
	};

	return (
		<View style={styles.container}>
			{/* ── Hero section ───────────────────────────── */}
			<View style={styles.hero}>
				<View style={styles.heroIconWrap}>
					<Ionicons name="sparkles" size={28} color={colors.accent} />
				</View>
			<Text style={styles.heroTitle}>
				Tu tarjeta está lista
			</Text>
			<Text style={styles.heroSubtitle}>
				Empiece a registrar sus movimientos para ver estadísticas,
				proyecciones y alertas inteligentes.
			</Text>
			</View>

			{/* ── Action cards ───────────────────────────── */}
			<View style={styles.actionsContainer}>
				{ACTIONS.map((action) => (
					<TouchableOpacity
						key={action.id}
						style={styles.actionCard}
						onPress={() => handleAction(action)}
						activeOpacity={0.7}
					>
						<View
							style={[
								styles.actionIconWrap,
								{ backgroundColor: action.iconBg },
							]}
						>
							<Ionicons
								name={action.icon}
								size={22}
								color={action.iconColor}
							/>
						</View>
						<View style={styles.actionTextBlock}>
							<Text style={styles.actionTitle}>{action.title}</Text>
							<Text style={styles.actionDescription}>
								{action.description}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
					</TouchableOpacity>
				))}
			</View>

			{/* ── Tip section ────────────────────────────── */}
			<View style={styles.tipCard}>
				<View style={styles.tipIconWrap}>
					<Ionicons name="bulb-outline" size={18} color={colors.warning} />
				</View>
				<View style={styles.tipTextBlock}>
				<Text style={styles.tipTitle}>Consejo: importe sus transacciones bancarias</Text>
				<Text style={styles.tipBody}>
					Use la opción "Sincronizar movimientos" para importar
					automáticamente los gastos de su tarjeta desde su email.
				</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 16,
		marginTop: 8,
	},

	// ── Hero ────────────────────────────────────────────
	hero: {
		alignItems: "center",
		paddingVertical: 24,
		paddingHorizontal: 20,
	},
	heroIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "rgba(59, 130, 246, 0.1)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	heroTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: colors.textPrimary,
		marginBottom: 8,
		textAlign: "center",
	},
	heroSubtitle: {
		fontSize: 14,
		color: colors.textMuted,
		textAlign: "center",
		lineHeight: 20,
		maxWidth: 320,
	},

	// ── Action cards ────────────────────────────────────
	actionsContainer: {
		gap: 10,
	},
	actionCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255, 255, 255, 0.04)",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.06)",
		padding: 14,
		gap: 14,
	},
	actionIconWrap: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	actionTextBlock: {
		flex: 1,
	},
	actionTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: colors.textPrimary,
		marginBottom: 2,
	},
	actionDescription: {
		fontSize: 12,
		color: colors.textMuted,
		lineHeight: 17,
	},

	// ── Tip ─────────────────────────────────────────────
	tipCard: {
		flexDirection: "row",
		backgroundColor: "rgba(217, 119, 6, 0.06)",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(217, 119, 6, 0.15)",
		padding: 14,
		gap: 12,
	},
	tipIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(217, 119, 6, 0.12)",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		marginTop: 2,
	},
	tipTextBlock: {
		flex: 1,
	},
	tipTitle: {
		fontSize: 13,
		fontWeight: "600",
				color: colors.warning,
				marginBottom: 4,
	},
	tipBody: {
		fontSize: 12,
		color: colors.textMuted,
		lineHeight: 17,
	},
});
