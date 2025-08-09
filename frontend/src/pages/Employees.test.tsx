import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Employees from "./Employees";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

const mockEmployees = [
  {
    id: 1,
    name: "田中太郎",
    email: "tanaka@example.com",
    department: "開発部",
    position: "シニアエンジニア",
    role: "employee",
    is_active: true,
  },
  {
    id: 2,
    name: "佐藤花子",
    email: "sato@example.com",
    department: "デザイン部",
    position: "デザイナー",
    role: "employee",
    is_active: true,
  },
];

describe("Employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/employees/") {
        return Promise.resolve({ data: mockEmployees });
      }
      if (url === "/skills/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("社員一覧が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Employees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("田中太郎")).toBeInTheDocument();
      expect(screen.getByText("佐藤花子")).toBeInTheDocument();
    });
  });

  it("部署と役職が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Employees />
      </BrowserRouter>
    );

    await waitFor(() => {
      // 部署と役職は "/" で結合されて表示される
      expect(screen.getByText("開発部 / シニアエンジニア")).toBeInTheDocument();
      expect(screen.getByText("デザイン部 / デザイナー")).toBeInTheDocument();
    });
  });

  it("管理者の場合は社員追加ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <Employees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /社員を追加/i })).toBeInTheDocument();
    });
  });

  it("一般社員の場合は社員追加ボタンが表示されない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Employees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /社員を追加/i })).not.toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    (api.get as any).mockRejectedValue(new Error("Network error"));
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Employees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/社員の取得に失敗しました/i)).toBeInTheDocument();
    });
  });
});