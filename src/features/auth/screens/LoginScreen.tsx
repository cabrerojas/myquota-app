import { View, Text, StyleSheet, Image } from "react-native";
import { signIn } from "../hooks/useAuth";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter(); // ✅ Ahora `router` se define en el componente funcional

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../../assets/images/react-logo.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>Bienvenido a MyQuota</Text>

      <GoogleSigninButton
        onPress={() => {
          signIn(router);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
