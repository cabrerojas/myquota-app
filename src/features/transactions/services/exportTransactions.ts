import { Platform } from "react-native";

interface ExportTransaction {
  transactionDate: string;
  merchant: string;
  amount: number;
  currency: string;
  cardType?: string;
  cardLastDigits?: string;
  id: string;
}

export async function exportTransactionsToCSV(
  transactions: ExportTransaction[],
) {
  if (!transactions || transactions.length === 0) {
    throw new Error("No hay transacciones para exportar.");
  }
  // Encabezados CSV
  const headers = ["Fecha", "Comercio", "Monto", "Moneda", "Tarjeta", "ID"];
  const rows = transactions.map((t) => [
    t.transactionDate,
    t.merchant,
    t.amount,
    t.currency,
    t.cardType ? `${t.cardType} •${t.cardLastDigits}` : "",
    t.id,
  ]);
  const csv = [headers, ...rows]
    .map((row: (string | number)[]) =>
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  // Web: download via Blob
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: expo-file-system + expo-sharing (dynamic imports avoid web module crash)
  const [{ File, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);

  const file = new File(Paths.cache, `transacciones_export_${Date.now()}.csv`);
  await file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Exportar transacciones",
    UTI: "public.comma-separated-values-text",
  });
}
