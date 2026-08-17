import React from "react";
import renderer, { act } from "react-test-renderer";
import RefundEntryScreen from "./RefundEntryScreen";

const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
const mockUseTransactionDetail = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/features/transactions/services/transactionsApi", () => ({
  useCreateRefundMutation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
  useTransactionDetail: () => mockUseTransactionDetail(),
}));

jest.mock("@/shared/components/ErrorState", () => {
  const React = require("react");
  return function MockErrorState() {
    return React.createElement("ErrorState");
  };
});

const renderScreen = () => {
  let tree!: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(
      <RefundEntryScreen creditCardId="card-1" transactionId="tx-1" />,
    );
  });

  return tree;
};

describe("RefundEntryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
    mockUseTransactionDetail.mockReturnValue({
      data: {
        transaction: {
          currency: "CLP",
          refundableAmount: 12000,
        },
      },
      error: null,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it("closes exactly once after a successful refund submission", async () => {
    const tree = renderScreen();

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: "Monto del reembolso" })
        .props.onChangeText("4500");
    });

    await act(async () => {
      await tree.root
        .findByProps({ accessibilityLabel: "Confirmar reembolso" })
        .props.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      creditCardId: "card-1",
      transactionId: "tx-1",
      data: { amount: 4500, reason: undefined },
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet open when refund submission fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Refund failed"));
    const tree = renderScreen();

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: "Monto del reembolso" })
        .props.onChangeText("4500");
    });

    await act(async () => {
      await tree.root
        .findByProps({ accessibilityLabel: "Confirmar reembolso" })
        .props.onPress();
    });

    expect(mockBack).not.toHaveBeenCalled();
  });
});
