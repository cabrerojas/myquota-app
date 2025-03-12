import { View, Text, FlatList } from "react-native";
import { useEffect, useState } from "react";
import { getCreditCards } from "../services/creditCardsApi";

export default function CreditCardsScreen() {
  const [creditCards, setCreditCards] = useState<
    { id: string; cardType: string; cardLastDigits: string }[]
  >([]);

  useEffect(() => {
    getCreditCards().then(setCreditCards);
  }, []);

  return (
    <View>
      <Text>Mis Tarjetas de Crédito</Text>
      <FlatList
        data={creditCards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>
              {item.cardType} - {item.cardLastDigits}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
