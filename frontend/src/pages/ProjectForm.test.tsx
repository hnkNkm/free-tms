import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProjectForm from "./ProjectForm";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

// Mock modules
vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  };
});

describe("ProjectForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/clients/") {
        return Promise.resolve({ data: [{ id: 1, name: "テストクライアント" }] });
      }
      if (url === "/skills/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    mockUseParams.mockReturnValue({ id: undefined });
  });

  it("新規作成フォームが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <ProjectForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("新規プロジェクト作成")).toBeInTheDocument();
      expect(screen.getByLabelText(/プロジェクト名/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /作成/i })).toBeInTheDocument();
    });
  });

  it("必須フィールドのバリデーションが機能する", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <ProjectForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /作成/i });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("プロジェクト名は必須です")).toBeInTheDocument();
    });
  });

  it("編集モードでフォームが表示される", async () => {
    mockUseParams.mockReturnValue({ id: "1" });
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/projects/1") {
        return Promise.resolve({
          data: {
            id: 1,
            name: "既存プロジェクト",
            client_id: 1,
            status: "in_progress",
            required_skills: [],
          },
        });
      }
      if (url === "/clients/") {
        return Promise.resolve({ data: [{ id: 1, name: "テストクライアント" }] });
      }
      if (url === "/skills/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <ProjectForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("プロジェクト編集")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /更新/i })).toBeInTheDocument();
    });
  });

  it("一般社員はアクセスできない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <ProjectForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/アクセス権限がありません/i)).toBeInTheDocument();
    });
  });

  it("作成ボタンがクリック可能である", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <ProjectForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /作成/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });
});