import { View, Text, FlatList } from "react-native";
import { useEffect, useState } from "react";
import { getTransactionsByCreditCard } from "../services/transactionsApi";

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
}

interface TransactionsScreenProps {
  creditCardId: string;
}

export default function TransactionsScreen({
  creditCardId,
}: TransactionsScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactionsByCreditCard(creditCardId).then(setTransactions);
  }, [creditCardId]);

  return (
    <View>
      <Text>Transacciones</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {item.merchant} - ${item.amount}
          </Text>
        )}
      />
    </View>
  );
}
