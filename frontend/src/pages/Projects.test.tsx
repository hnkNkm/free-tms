import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Projects from "./Projects";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockProjects = [
  {
    id: 1,
    name: "ECサイトリニューアル",
    client_name: "株式会社ABC",
    status: "in_progress",
    start_date: "2024-01-01",
    end_date: "2024-06-30",
    team_size: 5,
    member_count: 4,
  },
  {
    id: 2,
    name: "社内システム開発",
    client_name: "株式会社XYZ",
    status: "planning",
    start_date: "2024-03-01",
    end_date: "2024-12-31",
    team_size: 8,
    member_count: 6,
  },
];

describe("Projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ data: mockProjects });
  });

  it("プロジェクト一覧が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ECサイトリニューアル")).toBeInTheDocument();
      expect(screen.getByText("社内システム開発")).toBeInTheDocument();
    });
  });

  it("管理者の場合は新規作成ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新規プロジェクト/i })).toBeInTheDocument();
    });
  });

  it("一般社員の場合は新規作成ボタンが表示されない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /新規プロジェクト/i })).not.toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    (api.get as any).mockRejectedValue(new Error("Network error"));
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("プロジェクトの取得に失敗しました")).toBeInTheDocument();
    });
  });
});