import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Skills from "./Skills";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

const mockSkills = [
  {
    id: 1,
    name: "React",
    category: "フロントエンド",
    description: "Reactフレームワーク",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Python",
    category: "バックエンド",
    description: "Python言語",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "TypeScript",
    category: "フロントエンド",
    description: "TypeScript言語",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const renderSkills = () => {
  return render(
    <BrowserRouter>
      <Skills />
    </BrowserRouter>
  );
};

describe("Skills Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("一般ユーザーの場合", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test User", role: "employee" } })
      );
      (api.get as any).mockResolvedValue({ data: mockSkills });
    });

    it("スキル一覧が表示される", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("Python")).toBeInTheDocument();
        expect(screen.getByText("TypeScript")).toBeInTheDocument();
      });
    });

    it("カテゴリタグが表示される", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getAllByText("フロントエンド")).toHaveLength(3); // 2 skills + 1 filter button
        expect(screen.getAllByText("バックエンド")).toHaveLength(2); // 1 skill + 1 filter button
      });
    });

    it("追加ボタンが表示されない", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.queryByText("スキルを追加")).not.toBeInTheDocument();
      });
    });

    it("編集・削除ボタンが表示されない", async () => {
      renderSkills();

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /edit/i })
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /delete/i })
        ).not.toBeInTheDocument();
      });
    });

    it("検索機能が動作する", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const searchInput =
        screen.getByPlaceholderText("スキル名またはカテゴリで検索...");
      fireEvent.change(searchInput, { target: { value: "React" } });

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.queryByText("Python")).not.toBeInTheDocument();
      expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    });

    it("カテゴリフィルターが動作する", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      // フロントエンドカテゴリをクリック
      const frontendButton = screen.getAllByText("フロントエンド")[0];
      fireEvent.click(frontendButton);

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.queryByText("Python")).not.toBeInTheDocument();
    });

    it("すべてボタンで全スキルが表示される", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      // カテゴリフィルターを適用
      const frontendButton = screen.getAllByText("フロントエンド")[0];
      fireEvent.click(frontendButton);

      // すべてボタンをクリック
      const allButton = screen.getByText("すべて");
      fireEvent.click(allButton);

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  describe("管理者の場合", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Admin User", role: "admin" } })
      );
      (api.get as any).mockResolvedValue({ data: mockSkills });
    });

    it("追加ボタンが表示される", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });
    });

    it("編集・削除ボタンが表示される", async () => {
      renderSkills();

      await waitFor(() => {
        const editButtons = screen.getAllByRole("button", { name: "編集" });
        const deleteButtons = screen.getAllByRole("button", { name: "削除" });

        expect(editButtons).toHaveLength(3);
        expect(deleteButtons).toHaveLength(3);
      });
    });

    it("スキル追加モーダルが開く", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      expect(screen.getByText("新規スキル追加")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("例: React")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("例: フロントエンド")
      ).toBeInTheDocument();
    });

    it("スキルを追加できる", async () => {
      (api.post as any).mockResolvedValue({
        data: { id: 4, name: "Vue", category: "フロントエンド" },
      });

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText("例: React");
      const categoryInput = screen.getByPlaceholderText("例: フロントエンド");

      fireEvent.change(nameInput, { target: { value: "Vue" } });
      fireEvent.change(categoryInput, { target: { value: "フロントエンド" } });

      const submitButton = screen.getByRole("button", { name: "追加" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/skills/", {
          name: "Vue",
          category: "フロントエンド",
          description: "",
        });
      });
    });

    it("スキルを削除できる", async () => {
      window.confirm = vi.fn(() => true);
      (api.delete as any).mockResolvedValue({});

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "削除" });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          "このスキルを削除してもよろしいですか？"
        );
        expect(api.delete).toHaveBeenCalledWith("/skills/1");
      });
    });

    it("削除をキャンセルできる", async () => {
      window.confirm = vi.fn(() => false);

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "削除" });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(api.delete).not.toHaveBeenCalled();
      });
    });

    it("スキルを編集モードにできる", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "編集" });

      fireEvent.click(editButtons[0]);

      // 編集フォームが表示される
      expect(screen.getByDisplayValue("React")).toBeInTheDocument();
      expect(screen.getByDisplayValue("フロントエンド")).toBeInTheDocument();
      expect(screen.getByText("保存")).toBeInTheDocument();
      expect(screen.getByText("キャンセル")).toBeInTheDocument();
    });

    it("編集を保存できる", async () => {
      (api.put as any).mockResolvedValue({});

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "編集" });

      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue("React");
      fireEvent.change(nameInput, { target: { value: "React.js" } });

      const saveButton = screen.getByText("保存");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith("/skills/1", {
          name: "React.js",
          category: "フロントエンド",
          description: "Reactフレームワーク",
        });
      });
    });

    it("編集をキャンセルできる", async () => {
      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "編集" });

      fireEvent.click(editButtons[0]);

      const cancelButton = screen.getByText("キャンセル");
      fireEvent.click(cancelButton);

      // 編集モードが終了し、通常表示に戻る
      expect(screen.queryByDisplayValue("React")).not.toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Admin User", role: "admin" } })
      );
    });

    it("スキル一覧取得エラーを処理する", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (api.get as any).mockRejectedValue(new Error("Network error"));

      renderSkills();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to fetch skills:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("スキル追加エラーを処理する", async () => {
      window.alert = vi.fn();
      (api.get as any).mockResolvedValue({ data: mockSkills });
      (api.post as any).mockRejectedValue(new Error("Add error"));

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      const nameInput = screen.getByPlaceholderText("例: React");
      fireEvent.change(nameInput, { target: { value: "Vue" } });

      const submitButton = screen.getByRole("button", { name: "追加" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith("スキルの追加に失敗しました");
      });
    });

    it("スキル削除エラーを処理する", async () => {
      window.confirm = vi.fn(() => true);
      window.alert = vi.fn();
      (api.get as any).mockResolvedValue({ data: mockSkills });
      (api.delete as any).mockRejectedValue(new Error("Delete error"));

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "削除" });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith("スキルの削除に失敗しました");
      });
    });
  });

  describe("ローディング状態", () => {
    it("ローディング中の表示", async () => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test User", role: "employee" } })
      );

      // 遅延したレスポンスをシミュレート
      (api.get as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: mockSkills }), 100)
          )
      );

      renderSkills();

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
      });
    });
  });

  describe("空のスキルリスト", () => {
    it("スキルがない場合のメッセージ表示", async () => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test User", role: "employee" } })
      );
      (api.get as any).mockResolvedValue({ data: [] });

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("スキルが見つかりません")).toBeInTheDocument();
      });
    });

    it("検索結果がない場合のメッセージ表示", async () => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test User", role: "employee" } })
      );
      (api.get as any).mockResolvedValue({ data: mockSkills });

      renderSkills();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const searchInput =
        screen.getByPlaceholderText("スキル名またはカテゴリで検索...");
      fireEvent.change(searchInput, { target: { value: "NoSuchSkill" } });

      expect(screen.getByText("スキルが見つかりません")).toBeInTheDocument();
    });
  });
});
