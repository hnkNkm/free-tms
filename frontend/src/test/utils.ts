import { screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Radix UI Selectコンポーネントを操作するヘルパー関数
 */
export async function selectOption(triggerLabel: string | RegExp, optionText: string) {
  // Selectトリガーを探す（正規表現対応）
  const trigger = screen.getByRole("combobox", { name: triggerLabel });
  
  // トリガーをクリックしてドロップダウンを開く
  await userEvent.click(trigger);
  
  // オプションを選択
  const option = await screen.findByRole("option", { name: optionText });
  await userEvent.click(option);
}

/**
 * Selectコンポーネントを操作する別の方法（IDまたはaria-labelで）
 */
export async function selectOptionByTestId(testId: string, optionText: string) {
  const trigger = screen.getByTestId(testId);
  fireEvent.click(trigger);
  
  await waitFor(() => {
    const option = screen.getByText(optionText);
    fireEvent.click(option);
  });
}

/**
 * 日付を日本語フォーマットに変換
 */
export function formatDateJapanese(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

/**
 * テキストの部分一致で要素を探す
 */
export function findByPartialText(text: string, container = screen) {
  return container.findByText((content, element) => {
    const hasText = (element: Element | null) => element?.textContent?.includes(text) || false;
    const elementHasText = hasText(element);
    const childrenDontHaveText = element?.children
      ? Array.from(element.children).every(child => !hasText(child))
      : true;
    return elementHasText && childrenDontHaveText;
  });
}

/**
 * モーダルが開くのを待つ
 */
export async function waitForModal(titleText: string) {
  return await waitFor(() => {
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(titleText)).toBeInTheDocument();
    return modal;
  });
}

/**
 * フォームフィールドに値を入力
 */
export async function fillFormField(label: string, value: string) {
  const field = screen.getByLabelText(label);
  await userEvent.clear(field);
  await userEvent.type(field, value);
}

/**
 * ボタンをaria-labelで探してクリック
 */
export async function clickButtonByLabel(label: string) {
  const button = screen.getByRole("button", { name: label });
  await userEvent.click(button);
  return button;
}

/**
 * 正規表現でラベルを探す
 */
export function getByLabelTextRegex(regex: RegExp) {
  return screen.getByLabelText(regex);
}

/**
 * モーダル内の要素を取得
 */
export async function withinModal(titleText: string | RegExp) {
  const modal = await waitForModal(titleText);
  return within(modal);
}

/**
 * Selectドロップダウンのオプションを安全に選択
 */
export async function safeSelectOption(container: any, optionText: string) {
  // 複数の同じテキストがある場合は、最後のものを選択（通常はドロップダウン内）
  const options = container.getAllByText(optionText);
  const targetOption = options[options.length - 1];
  fireEvent.click(targetOption);
}