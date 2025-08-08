import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Employees from './Employees';
import { api } from '@/lib/axios';

// Mock modules
vi.mock('@/lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockEmployees = [
  {
    id: 1,
    name: '田中太郎',
    email: 'tanaka@example.com',
    department: '開発部',
    position: 'シニアエンジニア',
    role: 'employee',
    is_active: true,
    joined_date: '2020-01-01',
  },
  {
    id: 2,
    name: '佐藤花子',
    email: 'sato@example.com',
    department: 'デザイン部',
    position: 'デザイナー',
    role: 'employee',
    is_active: true,
    joined_date: '2021-04-01',
  },
  {
    id: 3,
    name: '鈴木一郎',
    email: 'suzuki@example.com',
    department: '開発部',
    position: 'ジュニアエンジニア',
    role: 'employee',
    is_active: true,
    joined_date: '2022-04-01',
  },
];

const mockSkills = [
  { id: 1, name: 'React', category: 'フロントエンド' },
  { id: 2, name: 'Python', category: 'バックエンド' },
  { id: 3, name: 'TypeScript', category: 'フロントエンド' },
  { id: 4, name: 'Docker', category: 'インフラ' },
  { id: 5, name: 'AWS', category: 'インフラ' },
];

const mockEmployeesWithReact = [mockEmployees[0], mockEmployees[2]]; // React スキルを持つ社員
const mockEmployeesWithPython = [mockEmployees[0]]; // Python スキルを持つ社員

const renderEmployees = () => {
  return render(
    <BrowserRouter>
      <Employees />
    </BrowserRouter>
  );
};

describe('Employees Skill Filter Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('スキルフィルター表示', () => {
    beforeEach(() => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: mockSkills });
        }
        if (url.startsWith('/employees/search')) {
          return Promise.resolve({ data: mockEmployees });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('スキルフィルターが表示される', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('スキルで絞り込み')).toBeInTheDocument();
      });
    });

    it('スキルボタンが表示される', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Python' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
      });
    });

    it('最大20個のスキルが表示される', async () => {
      const manySkills = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Skill${i + 1}`,
        category: 'Category',
      }));

      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: manySkills });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      await waitFor(() => {
        const skillButtons = screen.getAllByRole('button').filter(button => 
          button.textContent?.startsWith('Skill')
        );
        expect(skillButtons).toHaveLength(20);
        expect(screen.getByText('+5 以上...')).toBeInTheDocument();
      });
    });
  });

  describe('スキルフィルター機能', () => {
    beforeEach(() => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: mockSkills });
        }
        if (url === '/employees/search?skill_ids=1') {
          return Promise.resolve({ data: mockEmployeesWithReact });
        }
        if (url === '/employees/search?skill_ids=2') {
          return Promise.resolve({ data: mockEmployeesWithPython });
        }
        if (url === '/employees/search?skill_ids=1,2') {
          return Promise.resolve({ data: [mockEmployees[0]] });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('スキルボタンをクリックすると選択状態になる', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });
      expect(reactButton).toHaveClass('bg-gray-200');

      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(reactButton).toHaveClass('bg-blue-600');
      });
    });

    it('選択したスキルを持つ社員のみ表示される', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.getByText('佐藤花子')).toBeInTheDocument();
        expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/employees/search?skill_ids=1');
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.queryByText('佐藤花子')).not.toBeInTheDocument();
        expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
      });
    });

    it('複数のスキルを選択できる', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });
      const pythonButton = screen.getByRole('button', { name: 'Python' });

      fireEvent.click(reactButton);
      fireEvent.click(pythonButton);

      await waitFor(() => {
        expect(reactButton).toHaveClass('bg-blue-600');
        expect(pythonButton).toHaveClass('bg-blue-600');
        expect(api.get).toHaveBeenCalledWith('/employees/search?skill_ids=1,2');
      });
    });

    it('選択済みのスキルを再度クリックすると選択解除される', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });

      // 選択
      fireEvent.click(reactButton);
      await waitFor(() => {
        expect(reactButton).toHaveClass('bg-blue-600');
      });

      // 選択解除
      fireEvent.click(reactButton);
      await waitFor(() => {
        expect(reactButton).toHaveClass('bg-gray-200');
        expect(api.get).toHaveBeenCalledWith('/employees/');
      });
    });

    it('スキルフィルターを解除すると全社員が表示される', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
      });

      // スキルを選択
      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(screen.queryByText('佐藤花子')).not.toBeInTheDocument();
      });

      // スキルの選択を解除
      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.getByText('佐藤花子')).toBeInTheDocument();
        expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
      });
    });
  });

  describe('テキスト検索との組み合わせ', () => {
    beforeEach(() => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: mockSkills });
        }
        if (url.startsWith('/employees/search')) {
          return Promise.resolve({ data: mockEmployeesWithReact });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('テキスト検索とスキルフィルターが同時に機能する', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.getByText('佐藤花子')).toBeInTheDocument();
        expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
      });

      // テキスト検索
      const searchInput = screen.getByPlaceholderText('名前、メール、部署、役職で検索...');
      fireEvent.change(searchInput, { target: { value: '田中' } });

      // 田中太郎のみ表示
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.queryByText('佐藤花子')).not.toBeInTheDocument();
      expect(screen.queryByText('鈴木一郎')).not.toBeInTheDocument();

      // スキルフィルターを追加
      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      await waitFor(() => {
        // APIから返されたデータに対してもテキストフィルターが適用される
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.queryByText('鈴木一郎')).not.toBeInTheDocument();
      });
    });

    it('部署でのテキスト検索が機能する', async () => {
      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('名前、メール、部署、役職で検索...');
      fireEvent.change(searchInput, { target: { value: '開発部' } });

      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.queryByText('佐藤花子')).not.toBeInTheDocument();
      expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('スキルフィルター適用時にローディングが表示される', async () => {
      let resolveEmployees: any;
      let resolveSkills: any;

      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return new Promise(resolve => { resolveEmployees = resolve; });
        }
        if (url === '/skills/') {
          return new Promise(resolve => { resolveSkills = resolve; });
        }
        if (url.startsWith('/employees/search')) {
          return new Promise(resolve => setTimeout(() => resolve({ data: mockEmployeesWithReact }), 100));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      // データを解決
      resolveEmployees({ data: mockEmployees });
      resolveSkills({ data: mockSkills });

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      // スキルフィルターを適用
      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      // ローディング表示を確認
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('スキル取得エラーを処理する', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.reject(new Error('Skills fetch error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to fetch skills:', expect.any(Error));
        // スキルフィルターが表示されない
        expect(screen.queryByText('スキルで絞り込み')).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('スキル検索エラーを処理する', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: mockSkills });
        }
        if (url.startsWith('/employees/search')) {
          return Promise.reject(new Error('Search error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to search employees by skills:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('空の状態', () => {
    it('スキルがない場合フィルターが表示されない', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
      });

      expect(screen.queryByText('スキルで絞り込み')).not.toBeInTheDocument();
    });

    it('検索結果が0件の場合のメッセージ', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/employees/') {
          return Promise.resolve({ data: mockEmployees });
        }
        if (url === '/skills/') {
          return Promise.resolve({ data: mockSkills });
        }
        if (url.startsWith('/employees/search')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderEmployees();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
      });

      const reactButton = screen.getByRole('button', { name: 'React' });
      fireEvent.click(reactButton);

      await waitFor(() => {
        expect(screen.getByText('社員が見つかりません')).toBeInTheDocument();
      });
    });
  });
});