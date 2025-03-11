import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/features/auth/hooks/useAuth";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
  }

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const userName = "Guillermo"; // Luego reemplazar con el nombre real del usuario

  const router = useRouter();

  useEffect(() => {
    // 🔹 Simulación de datos, luego conectar con API
    setTransactions([
      {
        id: "1",
        description: "Pago Tarjeta Visa",
        amount: -50000,
        date: "2024-03-01",
      },
      { id: "2", description: "Sueldo", amount: 1500000, date: "2024-03-01" },
      {
        id: "3",
        description: "Spotify Premium",
        amount: -7000,
        date: "2024-02-28",
      },
    ]);
    setMonthlyTotal(1443000); // Simulación de total mensual
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hola, {userName} 👋</Text>
      <Text style={styles.subtitle}>Resumen del mes actual</Text>
      <Text style={styles.total}>${monthlyTotal.toLocaleString("es-CL")}</Text>

      <Text style={styles.sectionTitle}>Últimas Transacciones</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text style={styles.description}>{item.description}</Text>
            <Text
              style={[
                styles.amount,
                item.amount < 0 ? styles.negative : styles.positive,
              ]}
            >
              ${item.amount.toLocaleString("es-CL")}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Agregar Transacción</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 24, fontWeight: "bold" },
  logoutButton: {
    padding: 8,
  },
  welcome: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 18, color: "#6C757D", marginBottom: 10 },
  total: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#28A745",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE2E6",
  },
  description: { fontSize: 16 },
  amount: { fontSize: 16, fontWeight: "bold" },
  negative: { color: "#DC3545" },
  positive: { color: "#28A745" },
  button: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
