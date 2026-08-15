import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import TransactionsScreen from "./TransactionsScreen";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockUseCreditCards = jest.fn();
const mockUseInfiniteTransactions = jest.fn();
const mockUseUpdateTransactionMutation = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock("@/features/creditCards/services/creditCardsApi", () => ({
  useCreditCards: () => mockUseCreditCards(),
}));

jest.mock("@/features/transactions/services/transactionsApi", () => ({
  useInfiniteTransactions: () => mockUseInfiniteTransactions(),
  useUpdateTransactionMutation: () => mockUseUpdateTransactionMutation(),
}));

jest.mock("@/features/transactions/services/exportTransactions", () => ({
  exportTransactionsToCSV: jest.fn(),
}));

jest.mock("@/shared/contexts/UncategorizedContext", () => ({
  useUncategorized: () => ({ decrementCount: jest.fn() }),
}));

jest.mock("@/features/transactions/components/TransactionsSkeleton", () => {
  const React = require("react");
  return function MockTransactionsSkeleton() {
    return React.createElement("Skeleton");
  };
});

jest.mock("@/shared/components/ErrorState", () => {
  const React = require("react");
  return function MockErrorState() {
    return React.createElement("ErrorState");
  };
});

jest.mock("@/features/categories/components/CategorySuggestModal", () => {
  const React = require("react");
  return function MockCategorySuggestModal() {
    return React.createElement("CategorySuggestModal");
  };
});

describe("TransactionsScreen", () => {
  const getRenderedText = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAllByType(Text)
      .flatMap((node) =>
        Array.isArray(node.props.children)
          ? node.props.children.flat(Infinity)
          : [node.props.children],
      )
      .filter((value): value is string => typeof value === "string")
      .join(" ");

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCreditCards.mockReturnValue({
      data: [
        {
          id: "card-1",
          cardLastDigits: "4242",
          cardType: "Visa",
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseInfiniteTransactions.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: "tx-partial",
                amount: 12000,
                bank: "bank",
                canRefund: true,
                cardLastDigits: "4242",
                cardType: "Visa",
                creditCardId: "card-1",
                currency: "CLP",
                merchant: "Parcial",
                refundStatus: "partial",
                transactionDate: "2026-08-14T10:00:00.000Z",
              },
              {
                id: "tx-full",
                amount: 18000,
                bank: "bank",
                cardLastDigits: "4242",
                cardType: "Visa",
                creditCardId: "card-1",
                currency: "CLP",
                merchant: "Total",
                refundStatus: "full",
                transactionDate: "2026-08-14T11:00:00.000Z",
              },
              {
                id: "tx-eligible",
                amount: 22000,
                bank: "bank",
                canRefund: true,
                cardLastDigits: "4242",
                cardType: "Visa",
                creditCardId: "card-1",
                currency: "CLP",
                merchant: "Elegible",
                refundStatus: "none",
                transactionDate: "2026-08-14T12:00:00.000Z",
              },
              {
                id: "tx-child",
                amount: -4500,
                bank: "bank",
                cardLastDigits: "4242",
                cardType: "Visa",
                creditCardId: "card-1",
                currency: "CLP",
                merchant: "Movimiento vinculado",
                source: "refund",
                transactionDate: "2026-08-14T13:00:00.000Z",
              },
            ],
          },
        ],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: false,
      isFetching: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });

    mockUseUpdateTransactionMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    });
  });

  it("shows only real refund chips and keeps eligible rows neutral", () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<TransactionsScreen />);
    });

    const output = getRenderedText(tree);

    expect(output).toContain("Reembolso parcial");
    expect(output).toContain("Reembolso total");
    expect(output).not.toContain("Admite refund");
    expect(output).not.toContain('"Refund"');
  });
});
