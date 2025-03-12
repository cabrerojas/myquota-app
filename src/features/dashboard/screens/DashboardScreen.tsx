import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import MonthlyStats from "../components/MonthlyStats";

export default function DashboardScreen() {
  interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
  }

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [userName, setUserName] = useState<string>("");
  const [creditCards, setCreditCards] = useState<
    { id: string; cardType: string; cardLastDigits: string }[]
  >([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    // Obtener nombre del usuario
    AsyncStorage.getItem("user").then((user) => {
      if (user) {
        const parsedUser = JSON.parse(user);
        if (parsedUser.givenName) {
          setUserName(parsedUser.givenName);
        }
      }
    });

    // Obtener tarjetas de crédito
    getCreditCards().then((cards) => {
      setCreditCards(cards);
      if (cards.length > 0) {
        setSelectedCardId(cards[0].id); // Selecciona la primera tarjeta por defecto
      }
    });

    // Simulación de datos de transacciones
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
    setMonthlyTotal(1443000);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hola, {userName} 👋</Text>

      <Text style={styles.subtitle}>Resumen del mes actual</Text>
      <Text style={styles.total}>${monthlyTotal.toLocaleString("es-CL")}</Text>

      {/* Selección de Tarjeta de Crédito */}
      <Text style={styles.sectionTitle}>Selecciona una Tarjeta</Text>
      <FlatList
        data={creditCards}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.cardButton,
              selectedCardId === item.id ? styles.selectedCard : null,
            ]}
            onPress={() => setSelectedCardId(item.id)}
          >
            <Text style={styles.cardText}>
              {item.cardType} - {item.cardLastDigits}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Componente de Estadísticas Mensuales */}
      {selectedCardId && <MonthlyStats creditCardId={selectedCardId} />}

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
  cardButton: {
    padding: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginRight: 10,
  },
  selectedCard: {
    backgroundColor: "#007BFF",
  },
  cardText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});
