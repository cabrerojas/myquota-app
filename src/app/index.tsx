import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { getAccessToken } from "@/features/auth/services/sessionStorage";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";

type AuthState = "loading" | "onboarding" | "dashboard" | "login";

export default function Index() {
	const [authState, setAuthState] = useState<AuthState>("loading");

	useEffect(() => {
		(async () => {
			const token = await getAccessToken();

			if (!token) {
				setAuthState("login");
				return;
			}

			// Check if user has credit cards to determine onboarding need
			try {
				const result = await getCreditCards(1, undefined);
				const hasCards = result.items.length > 0;
				setAuthState(hasCards ? "dashboard" : "onboarding");
			} catch {
				// If API fails, assume dashboard (don't block the user)
				setAuthState("dashboard");
			}
		})();
	}, []);

	if (authState === "loading") {
		return (
			<View style={styles.loading}>
				<ActivityIndicator size="large" color="#1E40AF" />
			</View>
		);
	}

	if (authState === "onboarding") {
		return <Redirect href={"/(onboarding)/" as any} />;
	}

	if (authState === "dashboard") {
		return <Redirect href="/(tabs)/dashboard" />;
	}

	return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#0F172A",
	},
});
