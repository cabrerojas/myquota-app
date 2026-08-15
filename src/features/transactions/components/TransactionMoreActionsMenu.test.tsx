import React from "react";
import renderer, { act } from "react-test-renderer";
import { ActionSheetIOS, Platform, Text } from "react-native";
import { TransactionMoreActionsMenu } from "./TransactionMoreActionsMenu";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) =>
    require("react").createElement("Icon", props),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

const renderMenu = (
  props?: Partial<React.ComponentProps<typeof TransactionMoreActionsMenu>>,
) => {
  const onRegisterRefund = jest.fn();

  let tree!: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(
      <TransactionMoreActionsMenu
        visible
        onRegisterRefund={onRegisterRefund}
        {...props}
      />,
    );
  });

  return { tree, onRegisterRefund };
};

describe("TransactionMoreActionsMenu", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = originalPlatform;
    jest.clearAllMocks();
  });

  it("does not render the trigger when the action is unavailable", () => {
    const { tree } = renderMenu({ visible: false });

    expect(
      tree.root.findAllByProps({ accessibilityLabel: "Más acciones" }),
    ).toHaveLength(0);
  });

  it("opens the iOS action sheet and forwards the refund action", () => {
    (Platform as { OS: typeof Platform.OS }).OS = "ios";
    const showActionSheetWithOptions = jest
      .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
      .mockImplementation((options, callback) => {
        expect(options.options).toEqual(["Cancelar", "Registrar reembolso"]);
        callback(1);
      });

    const { tree, onRegisterRefund } = renderMenu();

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: "Más acciones" })
        .props.onPress();
    });

    expect(showActionSheetWithOptions).toHaveBeenCalledTimes(1);
    expect(onRegisterRefund).toHaveBeenCalledTimes(1);
  });

  it("shows and dismisses the Android action sheet", () => {
    (Platform as { OS: typeof Platform.OS }).OS = "android";
    const { tree } = renderMenu();

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: "Más acciones" })
        .props.onPress();
    });

    expect(
      tree.root
        .findAllByType(Text)
        .some((node) => node.props.children === "Registrar reembolso"),
    ).toBe(true);

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: "Cerrar acciones" })
        .props.onPress();
    });

    expect(
      tree.root
        .findAllByType(Text)
        .some((node) => node.props.children === "Registrar reembolso"),
    ).toBe(false);
  });

  it("disables the trigger while a refund is submitting", () => {
    (Platform as { OS: typeof Platform.OS }).OS = "android";
    const { tree, onRegisterRefund } = renderMenu({ submitting: true });

    const trigger = tree.root.findByProps({
      accessibilityLabel: "Más acciones",
    });

    expect(trigger.props.disabled).toBe(true);

    act(() => {
      trigger.props.onPress();
    });

    expect(onRegisterRefund).not.toHaveBeenCalled();
  });
});
