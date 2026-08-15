import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { RefundEntrySheet } from "./RefundEntrySheet";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }),
}));

const renderSheet = (
  props?: Partial<React.ComponentProps<typeof RefundEntrySheet>>,
) => {
  const onClose = jest.fn();
  const onSubmit = props?.onSubmit ?? jest.fn().mockResolvedValue(undefined);
  let tree!: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(
      <RefundEntrySheet
        currency="CLP"
        onClose={onClose}
        onSubmit={onSubmit}
        refundableAmount={12000}
        visible
        {...props}
      />,
    );
  });

  return { tree, onClose, onSubmit };
};

const changeInput = (
  tree: renderer.ReactTestRenderer,
  label: string,
  value: string,
) => {
  act(() => {
    tree.root
      .findByProps({ accessibilityLabel: label })
      .props.onChangeText(value);
  });
};

const pressByLabel = async (
  tree: renderer.ReactTestRenderer,
  label: string,
) => {
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
};

describe("RefundEntrySheet", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = originalPlatform;
    jest.clearAllMocks();
  });

  it("renders the approved Spanish glossary", () => {
    const { tree } = renderSheet();
    const textContent = JSON.stringify(tree.toJSON());

    expect(textContent).toContain("Registrar reembolso");
    expect(textContent).toContain("Disponible para reembolso");
    expect(textContent).toContain("Motivo (opcional)");
    expect(textContent).toContain("Cancelar");
  });

  it("blocks invalid amounts and shows Spanish validation errors", async () => {
    const { tree, onSubmit } = renderSheet();

    await pressByLabel(tree, "Confirmar reembolso");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Ingresa un monto válido mayor a cero.",
    );

    changeInput(tree, "Monto del reembolso", "15000");

    await pressByLabel(tree, "Confirmar reembolso");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain(
      "El monto supera el disponible para reembolso.",
    );
  });

  it("allows cancelling and keeps keyboard-safe controls", async () => {
    (Platform as { OS: typeof Platform.OS }).OS = "ios";
    const { tree, onClose } = renderSheet();

    expect(tree.root.findAllByType(KeyboardAvoidingView)).toHaveLength(1);
    expect(
      tree.root.findByProps({ accessibilityLabel: "Monto del reembolso" }).props
        .keyboardType,
    ).toBe("decimal-pad");

    await pressByLabel(tree, "Cancelar reembolso");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state and prevents dismissal while submitting", async () => {
    const { tree, onClose } = renderSheet({ submitting: true });

    expect(tree.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(
      0,
    );
    expect(
      tree.root.findByProps({ accessibilityLabel: "Cancelar reembolso" }).props
        .disabled,
    ).toBe(true);

    await pressByLabel(tree, "Cerrar hoja de reembolso");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("surfaces recoverable submit errors and clears them after editing", async () => {
    const { tree, onSubmit } = renderSheet({
      onSubmit: jest
        .fn()
        .mockRejectedValue(new Error("No se pudo registrar el reembolso")),
    });

    changeInput(tree, "Monto del reembolso", "5000");
    await pressByLabel(tree, "Confirmar reembolso");

    expect(onSubmit).toHaveBeenCalledWith({ amount: 5000, reason: undefined });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "No se pudo registrar el reembolso",
    );

    changeInput(tree, "Monto del reembolso", "4500");
    expect(JSON.stringify(tree.toJSON())).not.toContain(
      "No se pudo registrar el reembolso",
    );
  });

  it("submits a valid refund and closes the sheet on success", async () => {
    const { tree, onClose, onSubmit } = renderSheet();

    changeInput(tree, "Monto del reembolso", "4500");
    changeInput(tree, "Motivo del reembolso", "  Ajuste del comercio  ");

    await pressByLabel(tree, "Confirmar reembolso");

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 4500,
      reason: "Ajuste del comercio",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the available amount helper on demand", async () => {
    const { tree } = renderSheet();

    await pressByLabel(tree, "Usar el monto disponible");

    expect(
      tree.root.findByProps({ accessibilityLabel: "Monto del reembolso" }).props
        .value,
    ).toBe("12000");
  });

  it("renders the title as a visible header", () => {
    const { tree } = renderSheet();

    expect(
      tree.root
        .findAllByType(Text)
        .some((node) => node.props.children === "Registrar reembolso"),
    ).toBe(true);
  });
});
