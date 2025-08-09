import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProjectDetail from "./ProjectDetail";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
    useNavigate: () => vi.fn(),
  };
});

const mockProject = {
  id: 1,
  name: "ECサイトリニューアル",
  client_name: "株式会社ABC",
  description: "既存ECサイトのフルリニューアルプロジェクト",
  start_date: "2024-01-01",
  end_date: "2024-06-30",
  status: "in_progress",
  members: [
    {
      id: 1,
      employee_name: "田中太郎",
      role: "project_manager",
      contribution_level: 5,
    },
  ],
  required_skills: [
    {
      id: 1,
      name: "React",
      category: "Frontend",
      importance_level: 5,
    },
  ],
};

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/projects/1") {
        return Promise.resolve({ data: mockProject });
      }
      if (url === "/employees/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("プロジェクト詳細が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ECサイトリニューアル")).toBeInTheDocument();
      expect(screen.getByText("株式会社ABC")).toBeInTheDocument();
      expect(screen.getByText("既存ECサイトのフルリニューアルプロジェクト")).toBeInTheDocument();
    });
  });

  it("管理者の場合は編集ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /編集/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /メンバーを追加/i })).toBeInTheDocument();
    });
  });

  it("一般社員の場合は編集ボタンが表示されない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /編集/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /メンバーを追加/i })).not.toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    (api.get as any).mockRejectedValue(new Error("Network error"));
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/プロジェクトの取得に失敗しました/i)).toBeInTheDocument();
    });
  });

  it("404エラー時に「プロジェクトが見つかりません」と表示される", async () => {
    (api.get as any).mockRejectedValue({ response: { status: 404 } });
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/プロジェクトが見つかりません/i)).toBeInTheDocument();
    });
  });
});