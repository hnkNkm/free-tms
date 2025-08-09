import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import EmployeeProfile from "./EmployeeProfile";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
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
  name: "田中太郎",
  email: "tanaka@example.com",
  department: "開発部",
  position: "シニアエンジニア",
  role: "employee",
  self_introduction: "フルスタックエンジニアです",
  career_goals: "技術リーダーを目指しています",
  specialties: "React, Node.js",
  preferred_project_types: ["Web開発", "AI開発"],
  joined_date: "2020-01-01",
};

const mockSkills = [
  {
    id: 1,
    employee_id: 1,
    skill_id: 1,
    skill_name: "React",
    category: "Frontend",
    proficiency_level: 4,
    experience_years: 3,
  },
  {
    id: 2,
    employee_id: 1,
    skill_id: 2,
    skill_name: "Node.js",
    category: "Backend",
    proficiency_level: 3,
    experience_years: 2,
  },
];

describe("EmployeeProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/employees/1") {
        return Promise.resolve({ data: mockEmployee });
      }
      if (url === "/skills/employees/1/skills") {
        return Promise.resolve({ data: mockSkills });
      }
      if (url === "/skills/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("社員プロフィールが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 2, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("田中太郎")).toBeInTheDocument();
      expect(screen.getByText("tanaka@example.com")).toBeInTheDocument();
      expect(screen.getByText("開発部")).toBeInTheDocument();
      expect(screen.getByText("シニアエンジニア")).toBeInTheDocument();
    });
  });

  it("スキル一覧が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 2, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });
  });

  it("自分のプロフィールの場合は保存ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /保存/i })).toBeInTheDocument();
    });
  });

  it("他人のプロフィールの場合は保存ボタンが表示されない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 2, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /保存/i })).not.toBeInTheDocument();
    });
  });

  it("管理者の場合は他人のプロフィールでも保存ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 2, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /保存/i })).toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    (api.get as any).mockRejectedValue(new Error("Network error"));
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <EmployeeProfile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/プロフィールが見つかりません/i)).toBeInTheDocument();
    });
  });
});