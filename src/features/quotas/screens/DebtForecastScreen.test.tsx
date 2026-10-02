import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Pressable, Text } from "react-native";
import DebtForecastScreen from "./DebtForecastScreen";

const mockInvalidateQueries = jest.fn();
const mockUseQuery = jest.fn();
const mockSettleBillingPeriod = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQuery(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock("@/features/quotas/services/quotasApi", () => ({
  getDebtForecast: jest.fn(),
}));

jest.mock("@/features/billingPeriods/services/billingPeriodsApi", () => ({
  executeBillingPeriodSettlements: (...args: unknown[]) =>
    mockSettleBillingPeriod(...args),
}));

jest.mock("@/shared/components/ErrorState", () => {
  const React = require("react");
  return function MockErrorState() {
    return React.createElement("ErrorState");
  };
});

describe("DebtForecastScreen settlement review", () => {
  const alertSpy = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: {
        months: [
          {
            key: "2026-10",
            label: "Octubre 2026",
            totalCLP: 12000,
            totalUSD: 20,
            count: 2,
            details: [],
            periodsByCard: [
              { creditCardId: "card-1", billingPeriodId: "period-1" },
              { creditCardId: "card-2", billingPeriodId: "period-2" },
            ],
          },
        ],
        totalDebtCLP: 12000,
        totalDebtUSD: 20,
      },
      isLoading: false,
      isRefetching: false,
      error: null,
    });
  });

  it("uses a semantic label and reviews the scope before recording settlement", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DebtForecastScreen />);
    });

    const output = tree.root
      .findAllByType(Text)
      .flatMap((node) =>
        Array.isArray(node.props.children)
          ? node.props.children
          : [node.props.children],
      )
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    const action = tree.root.findAll(
      (node) =>
        node.props.accessibilityLabel === "Registrar pago de Octubre 2026",
    );

    expect(output).toContain("Registrar pago");
    expect(output).not.toContain("Pagar período");
    expect(action[0]?.props.accessibilityHint).toContain(
      "marca las cuotas elegibles",
    );

    act(() => {
      action[0]?.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Revisar registro de pago",
      expect.stringContaining("Octubre 2026"),
      expect.arrayContaining([
        expect.objectContaining({ text: "Registrar pago" }),
      ]),
    );
    expect(alertSpy.mock.calls[0][1]).toContain("2 períodos en 2 tarjetas");
    expect(alertSpy.mock.calls[0][1]).toContain(
      "Las cuotas futuras no se modificarán",
    );
  });
});
