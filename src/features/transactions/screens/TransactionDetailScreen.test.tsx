import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import TransactionDetailScreen from "./TransactionDetailScreen";

const mockPush = jest.fn();
const mockUseTransactionDetail = jest.fn();
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

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    Stack: {
      Toolbar: Object.assign(
        (props: { children?: unknown }) =>
          React.createElement("Toolbar", props, props.children),
        {
          Menu: (props: { children?: unknown }) =>
            React.createElement("ToolbarMenu", props, props.children),
          MenuAction: (props: { children?: unknown }) =>
            React.createElement("ToolbarMenuAction", props, props.children),
        },
      ),
    },
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock("@/features/transactions/services/transactionsApi", () => ({
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

describe("TransactionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

    mockUseSplitQuotasMutation.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });

    mockUseUpdateTransactionMutation.mockReturnValue({
      mutateAsync: jest.fn(),
    });
  });

  it("hides the refund section until a refund exists and exposes the native menu", () => {
    const tree = renderScreen();

    expect(getRenderedText(tree)).not.toContain("Monto reembolsado");
    const menuAction = tree.root.findByProps({
      children: "Registrar reembolso",
    });

    expect(menuAction.props.children).toBe("Registrar reembolso");
    act(() => {
      menuAction.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(screens)/refundEntry",
      params: { creditCardId: "card-1", transactionId: "tx-1" },
    });
  });

  it("does not render the native menu for full or child transactions", () => {
    const tree = renderScreen();

    currentDetailData = {
      ...currentDetailData,
      transaction: {
        ...currentDetailData.transaction,
        canRefund: false,
        refundStatus: "full",
      },
    };
    act(() => {
      tree.update(
        <TransactionDetailScreen creditCardId="card-1" transactionId="tx-1" />,
      );
    });
    expect(
      tree.root.findAllByProps({ children: "Registrar reembolso" }),
    ).toHaveLength(0);

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
    expect(
      tree.root.findAllByProps({ children: "Registrar reembolso" }),
    ).toHaveLength(0);
  });
});
