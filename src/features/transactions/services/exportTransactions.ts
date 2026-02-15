import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

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

  // Usar la nueva API de FileSystem
  const file = new File(Paths.cache, `transacciones_export_${Date.now()}.csv`);
  await file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Exportar transacciones",
    UTI: "public.comma-separated-values-text",
  });
}
