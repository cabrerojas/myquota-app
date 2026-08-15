import React from "react";
import renderer, { act } from "react-test-renderer";
import { Platform, Text } from "react-native";
import TransactionDetailScreen from "./TransactionDetailScreen";

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockUseTransactionDetail = jest.fn();
const mockUseCreateRefundMutation = jest.fn();
const mockUseSplitQuotasMutation = jest.fn();
const mockUseUpdateTransactionMutation = jest.fn();

let currentDetailData: {
  quotas: { id: string; status: string }[];
  transaction: Record<string, unknown>;
};

jest.setTimeout(20000);

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({ goBack: mockGoBack, setOptions: mockSetOptions }),
}));

jest.mock("@/features/transactions/services/transactionsApi", () => ({
  useCreateRefundMutation: () => mockUseCreateRefundMutation(),
  useSplitQuotasMutation: () => mockUseSplitQuotasMutation(),
  useTransactionDetail: () => mockUseTransactionDetail(),
  useUpdateTransactionMutation: () => mockUseUpdateTransactionMutation(),
}));

jest.mock("@/features/categories/components/CategorySuggestModal", () => {
  const React = require("react");
  return function MockCategorySuggestModal() {
    return React.createElement("CategorySuggestModal");
  };
});

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
      <TransactionDetailScreen creditCardId="card-1" transactionId="tx-1" />,
    );
  });

  return tree;
};

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

const openRefundSheetFromHeader = async () => {
  const headerRight = mockSetOptions.mock.calls.at(-1)?.[0]?.headerRight;

  let headerTree!: renderer.ReactTestRenderer;

  await act(async () => {
    headerTree = renderer.create(headerRight());
  });

  await act(async () => {
    await headerTree.root
      .findByProps({ accessibilityLabel: "Más acciones" })
      .props.onPress();
  });

  await act(async () => {
    await headerTree.root
      .findByProps({ accessibilityLabel: "Registrar reembolso" })
      .props.onPress();
  });
};

describe("TransactionDetailScreen", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: typeof Platform.OS }).OS = "android";

    currentDetailData = {
      quotas: [],
      transaction: {
        id: "tx-1",
        amount: 24000,
        bank: "bank",
        canRefund: true,
        cardLastDigits: "4242",
        cardType: "Visa",
        creditCardId: "card-1",
        currency: "CLP",
        merchant: "Compra principal",
        parentTransactionId: null,
        refundStatus: "none",
        refundableAmount: 24000,
        refundedAmount: 0,
        refunds: [],
        source: "email",
        totalInstallments: 1,
        transactionDate: "2026-08-14T12:00:00.000Z",
      },
    };

    mockUseTransactionDetail.mockImplementation(() => ({
      data: currentDetailData,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: jest.fn(async () => undefined),
    }));

    mockUseCreateRefundMutation.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(async ({ data }: { data: { amount: number } }) => {
        currentDetailData = {
          ...currentDetailData,
          transaction: {
            ...currentDetailData.transaction,
            canRefund: data.amount < 24000,
            refundableAmount: Math.max(24000 - data.amount, 0),
            refundedAmount: data.amount,
            refundStatus: data.amount < 24000 ? "partial" : "full",
            refunds: [
              {
                amount: data.amount,
                createdAt: "2026-08-15T12:00:00.000Z",
                currency: "CLP",
                id: "refund-1",
                refundReason: "Ajuste",
                transactionDate: "2026-08-15T12:00:00.000Z",
              },
            ],
          },
        };

        return {};
      }),
    });

    mockUseSplitQuotasMutation.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });

    mockUseUpdateTransactionMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    });
  });

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = originalPlatform;
  });

  it("hides the refund section until a refund exists and launches the sheet from overflow", async () => {
    const tree = renderScreen();

    expect(getRenderedText(tree)).not.toContain("Monto reembolsado");
    expect(mockSetOptions).toHaveBeenCalled();

    await openRefundSheetFromHeader();

    expect(getRenderedText(tree)).toContain("Registrar reembolso");
  });

  it("refreshes to a partial refund state after a successful refund", async () => {
    const tree = renderScreen();

    await openRefundSheetFromHeader();

    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "Monto del reembolso" })
        .props.onChangeText("5000");
    });

    await act(async () => {
      await tree.root
        .findByProps({ accessibilityLabel: "Confirmar reembolso" })
        .props.onPress();
    });

    const output = getRenderedText(tree);

    expect(output).toContain("Reembolso parcial");
    expect(output).toContain("Monto reembolsado");
    expect(output).toContain("Reembolso vinculado");
  });

  it("removes the refund action after a full refund and keeps refund-child transactions read-only", async () => {
    const tree = renderScreen();

    await openRefundSheetFromHeader();

    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "Monto del reembolso" })
        .props.onChangeText("24000");
    });

    await act(async () => {
      await tree.root
        .findByProps({ accessibilityLabel: "Confirmar reembolso" })
        .props.onPress();
    });

    const latestHeaderRight =
      mockSetOptions.mock.calls.at(-1)?.[0]?.headerRight;
    expect(latestHeaderRight).toBeUndefined();

    currentDetailData = {
      ...currentDetailData,
      transaction: {
        ...currentDetailData.transaction,
        canRefund: true,
        parentTransactionId: "parent-1",
        source: "refund",
      },
    };

    act(() => {
      tree.update(
        <TransactionDetailScreen creditCardId="card-1" transactionId="tx-1" />,
      );
    });

    const childHeaderRight = mockSetOptions.mock.calls.at(-1)?.[0]?.headerRight;
    expect(childHeaderRight).toBeUndefined();
  });

  it("provides an accessible native-feeling back action", () => {
    renderScreen();
    const headerLeft = mockSetOptions.mock.calls.at(-1)?.[0]?.headerLeft;

    let headerTree!: renderer.ReactTestRenderer;
    act(() => {
      headerTree = renderer.create(headerLeft());
    });

    const backButton = headerTree.root.findByProps({
      accessibilityLabel: "Volver",
    });

    expect(backButton.props.accessibilityRole).toBe("button");
    expect(headerTree.root.findByProps({ name: "arrow-back" })).toBeTruthy();

    act(() => {
      backButton.props.onPress();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
