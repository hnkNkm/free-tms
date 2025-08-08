import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useParams } from "react-router-dom";
import EmployeeProfile from "./EmployeeProfile";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

const mockEmployee = {
  id: 1,
  name: "Test Employee",
  email: "test@example.com",
  department: "開発部",
  position: "エンジニア",
  role: "employee",
  self_introduction: "自己紹介文",
  career_goals: "キャリア目標",
  specialties: "専門分野",
  preferred_project_types: ["Web開発", "AI開発"],
  joined_date: "2024-01-01",
};

const mockEmployeeSkills = [
  {
    skill_id: 1,
    skill_name: "React",
    skill_category: "フロントエンド",
    proficiency_level: 4,
    years_of_experience: 3,
  },
  {
    skill_id: 2,
    skill_name: "Python",
    skill_category: "バックエンド",
    proficiency_level: 3,
    years_of_experience: 2,
  },
];

const mockAvailableSkills = [
  { id: 1, name: "React", category: "フロントエンド" },
  { id: 2, name: "Python", category: "バックエンド" },
  { id: 3, name: "TypeScript", category: "フロントエンド" },
  { id: 4, name: "Docker", category: "インフラ" },
];

const renderEmployeeProfile = () => {
  return render(
    <BrowserRouter>
      <EmployeeProfile />
    </BrowserRouter>
  );
};

describe("EmployeeProfile Skill Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ id: "1" });
  });

  describe("スキル表示", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 2, name: "Other User", role: "employee" } })
      );
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("社員のスキル一覧が表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキル")).toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("Python")).toBeInTheDocument();
      });
    });

    it("スキルの熟練度が表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("上級")).toBeInTheDocument(); // React: level 4
        expect(screen.getByText("中級")).toBeInTheDocument(); // Python: level 3
      });
    });

    it("スキルの経験年数が表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("3年")).toBeInTheDocument();
        expect(screen.getByText("2年")).toBeInTheDocument();
      });
    });

    it("スキルのカテゴリが表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        const frontendTags = screen.getAllByText("フロントエンド");
        const backendTags = screen.getAllByText("バックエンド");
        expect(frontendTags.length).toBeGreaterThan(0);
        expect(backendTags.length).toBeGreaterThan(0);
      });
    });

    it("スキルがない場合のメッセージが表示される", async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: [] });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      renderEmployeeProfile();

      await waitFor(() => {
        expect(
          screen.getByText("スキルが登録されていません")
        ).toBeInTheDocument();
      });
    });
  });

  describe("自分のプロフィールの場合", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test Employee", role: "employee" } })
      );
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("スキルを追加ボタンが表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });
    });

    it("スキル削除ボタンが表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        const deleteButtons = screen
          .getAllByRole("button")
          .filter((button) => button.querySelector(".lucide-x"));
        expect(deleteButtons).toHaveLength(2); // 2つのスキル分
      });
    });

    it("スキル追加モーダルが開く", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      expect(
        screen.getByRole("heading", { name: "スキルを追加" })
      ).toBeInTheDocument();
      expect(screen.getByText("選択してください")).toBeInTheDocument();
    });

    it("新しいスキルを追加できる", async () => {
      (api.post as any).mockResolvedValue({});

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      // TypeScript (id: 3) を選択（モーダル内のセレクトを対象）
      const modalCard = screen.getByRole("heading", { name: "スキルを追加" })
        .parentElement!;
      const modalSelects = within(modalCard).getAllByRole("combobox");
      const skillSelect = modalSelects[0] as HTMLSelectElement;
      fireEvent.change(skillSelect, { target: { value: "3" } });

      // 熟練度を選択（モーダル内2つ目のセレクト）
      const proficiencySelect = modalSelects[1] as HTMLSelectElement;
      fireEvent.change(proficiencySelect, { target: { value: "2" } });

      // 経験年数を入力
      const yearsInput = within(modalCard).getByRole("spinbutton");
      fireEvent.change(yearsInput, { target: { value: "1" } });

      // 追加ボタンをクリック
      const submitButton = within(modalCard).getByText("追加"); // モーダル内の追加ボタン
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/employees/1/skills", {
          skill_id: 3,
          proficiency_level: 2,
          years_of_experience: 1,
        });
      });
    });

    it("スキルを削除できる", async () => {
      window.confirm = vi.fn(() => true);
      (api.delete as any).mockResolvedValue({});

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen
        .getAllByRole("button")
        .filter((button) => button.querySelector(".lucide-x"));

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          "このスキルを削除してもよろしいですか？"
        );
        expect(api.delete).toHaveBeenCalledWith("/employees/1/skills/1");
      });
    });

    it("熟練度を更新できる", async () => {
      (api.put as any).mockResolvedValue({});

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      // 熟練度のセレクトボックスを見つける
      const proficiencySelects = screen
        .getAllByRole("combobox")
        .map((el) => el as HTMLSelectElement)
        .filter((select) => select.value === "4");

      fireEvent.change(proficiencySelects[0], { target: { value: "5" } });

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith("/employees/1/skills/1", {
          proficiency_level: 5,
          years_of_experience: 3,
        });
      });
    });

    it("経験年数を更新できる", async () => {
      (api.put as any).mockResolvedValue({});

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      // 経験年数の入力フィールドを見つける
      const yearsInputs = screen
        .getAllByRole("spinbutton")
        .map((el) => el as HTMLInputElement);
      const reactYearsInput = yearsInputs.find((input) => input.value === "3");

      fireEvent.change(reactYearsInput!, { target: { value: "4" } });

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith("/employees/1/skills/1", {
          proficiency_level: 4,
          years_of_experience: 4,
        });
      });
    });
  });

  describe("管理者の場合", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 99, name: "Admin User", role: "admin" } })
      );
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("他人のプロフィールでもスキル編集ができる", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      // 編集可能なセレクトボックスが表示される
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe("他のユーザーの場合", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 99, name: "Other User", role: "employee" } })
      );
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("スキル追加ボタンが表示されない", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキル")).toBeInTheDocument();
      });

      expect(screen.queryByText("スキルを追加")).not.toBeInTheDocument();
    });

    it("スキル削除ボタンが表示されない", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen
        .queryAllByRole("button")
        .filter((button) => button.querySelector(".lucide-x"));
      expect(deleteButtons).toHaveLength(0);
    });

    it("熟練度が読み取り専用で表示される", async () => {
      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("上級")).toBeInTheDocument();
      });

      // セレクトボックスではなくテキストとして表示
      const selects = screen.queryAllByRole("combobox");
      expect(selects.length).toBe(0); // プロフィール編集部分のセレクトボックスのみ
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(() => {
      (useAuthStore as any).mockImplementation((selector: any) =>
        selector({ user: { id: 1, name: "Test Employee", role: "employee" } })
      );
    });

    it("スキル追加エラーを処理する", async () => {
      window.alert = vi.fn();
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      (api.post as any).mockRejectedValue(new Error("Add error"));

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("スキルを追加")).toBeInTheDocument();
      });

      const addButton = screen.getByText("スキルを追加");
      fireEvent.click(addButton);

      const modalCard = screen.getByRole("heading", { name: "スキルを追加" })
        .parentElement!;
      const skillSelect = within(modalCard).getAllByRole(
        "combobox"
      )[0] as HTMLSelectElement;
      fireEvent.change(skillSelect, { target: { value: "3" } });

      const submitButton = within(modalCard).getByText("追加");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith("スキルの追加に失敗しました");
      });
    });

    it("スキル削除エラーを処理する", async () => {
      window.confirm = vi.fn(() => true);
      window.alert = vi.fn();
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      (api.delete as any).mockRejectedValue(new Error("Delete error"));

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const deleteButtons = screen
        .getAllByRole("button")
        .filter((button) => button.querySelector(".lucide-x"));

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith("スキルの削除に失敗しました");
      });
    });

    it("スキル更新エラーを処理する", async () => {
      window.alert = vi.fn();
      (api.get as any).mockImplementation((url: string) => {
        if (url === "/employees/1") {
          return Promise.resolve({ data: mockEmployee });
        }
        if (url === "/employees/1/skills") {
          return Promise.resolve({ data: mockEmployeeSkills });
        }
        if (url === "/skills/") {
          return Promise.resolve({ data: mockAvailableSkills });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      (api.put as any).mockRejectedValue(new Error("Update error"));

      renderEmployeeProfile();

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const proficiencySelects = screen
        .getAllByRole("combobox")
        .map((el) => el as HTMLSelectElement)
        .filter((select) => select.value === "4");

      fireEvent.change(proficiencySelects[0], { target: { value: "5" } });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith("スキルの更新に失敗しました");
      });
    });
  });
});
