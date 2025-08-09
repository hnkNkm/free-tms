import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Clients from "./Clients";
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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockClients = [
  {
    id: 1,
    name: "株式会社ABC",
    industry: "IT",
    contact_person: "田中太郎",
    contact_email: "tanaka@abc.com",
    project_count: 3,
    active_project_count: 2,
  },
  {
    id: 2,
    name: "株式会社XYZ",
    industry: "製造業",
    contact_person: "佐藤花子",
    contact_email: "sato@xyz.com",
    project_count: 1,
    active_project_count: 1,
  },
];

describe("Clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ data: mockClients });
  });

  it("クライアント一覧が表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("株式会社ABC")).toBeInTheDocument();
      expect(screen.getByText("株式会社XYZ")).toBeInTheDocument();
    });
  });

  it("管理者の場合は新規追加ボタンが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新規クライアント/i })).toBeInTheDocument();
    });
  });

  it("一般社員の場合は新規追加ボタンが表示されない", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /新規クライアント/i })).not.toBeInTheDocument();
    });
  });

  it("新規追加ボタンをクリックするとモーダルが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      const addButton = screen.getByRole("button", { name: /新規クライアント/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText("新規クライアント登録")).toBeInTheDocument();
    });
  });

  it("クライアント追加が動作する", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );
    
    (api.post as any).mockResolvedValue({
      data: { id: 3, name: "新規クライアント" },
    });

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      const addButton = screen.getByRole("button", { name: /新規クライアント/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const nameInput = screen.getByLabelText("会社名 *");
      const industryInput = screen.getByLabelText("業界 *");
      
      fireEvent.change(nameInput, { target: { value: "新規クライアント" } });
      fireEvent.change(industryInput, { target: { value: "IT" } });
      
      const submitButton = screen.getByRole("button", { name: /登録/i });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("クライアント削除の確認ダイアログが表示される", async () => {
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "admin" } })
    );
    
    window.confirm = vi.fn(() => true);
    (api.delete as any).mockResolvedValue({ data: { message: "success" } });

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    (api.get as any).mockRejectedValue(new Error("Network error"));
    (useAuthStore as any).mockImplementation((selector: any) =>
      selector({ user: { id: 1, role: "employee" } })
    );

    render(
      <BrowserRouter>
        <Clients />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/クライアントの取得に失敗しました/i)).toBeInTheDocument();
    });
  });
});