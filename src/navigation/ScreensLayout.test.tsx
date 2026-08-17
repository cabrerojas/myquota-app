import React from "react";
import renderer, { act } from "react-test-renderer";
import ScreensLayout from "@/app/(screens)/_layout";

jest.mock("expo-router", () => {
  const React = require("react");
  const Stack = Object.assign(
    (props: { children?: unknown }) =>
      React.createElement("Stack", props, props.children),
    {
      Screen: (props: Record<string, unknown>) =>
        React.createElement("StackScreen", props),
    },
  );

  return { Stack };
});

jest.mock("@/shared/utils/routeOptions", () => ({
  modalStackScreenOptions: {},
}));

describe("screens stack", () => {
  it("configures refund entry as a native form sheet", () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ScreensLayout />);
    });

    const refundScreen = tree.root.findByProps({ name: "refundEntry" });

    expect(refundScreen.props.options).toMatchObject({
      title: "Registrar reembolso",
      presentation: "formSheet",
      sheetAllowedDetents: [0.6, 1],
      sheetInitialDetentIndex: 0,
      sheetGrabberVisible: true,
      sheetCornerRadius: 24,
    });
  });
});
