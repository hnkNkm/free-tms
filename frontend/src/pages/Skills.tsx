import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Edit2, Trash2, Search } from "lucide-react";

interface Skill {
  id: number;
  name: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SkillCategory {
  [key: string]: Skill[];
}

export default function Skills() {
  const currentUser = useAuthStore((state) => state.user);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
  });

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await api.get("/skills/");
      setSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    try {
      await api.post("/skills/", formData);
      await fetchSkills();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to add skill:", error);
      alert("スキルの追加に失敗しました");
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill) return;
    try {
      await api.put(`/skills/${editingSkill.id}`, formData);
      await fetchSkills();
      setEditingSkill(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update skill:", error);
      alert("スキルの更新に失敗しました");
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!confirm("このスキルを削除してもよろしいですか？")) return;
    try {
      await api.delete(`/skills/${skillId}`);
      await fetchSkills();
    } catch (error) {
      console.error("Failed to delete skill:", error);
      alert("スキルの削除に失敗しました");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", category: "", description: "" });
  };

  const startEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      category: skill.category,
      description: skill.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingSkill(null);
    resetForm();
  };

  // カテゴリごとにスキルをグループ化
  const groupedSkills = skills.reduce<SkillCategory>((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {});

  const categories = ["all", ...Object.keys(groupedSkills).sort()];

  // フィルタリング
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">スキル管理</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            スキルを追加
          </button>
        )}
      </div>

      {/* 検索とフィルター */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="スキル名またはカテゴリで検索..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category === "all" ? "すべて" : category}
              {category !== "all" && (
                <span className="ml-1 text-xs">
                  ({groupedSkills[category]?.length || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* スキル一覧 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredSkills.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              スキルが見つかりません
            </li>
          ) : (
            filteredSkills.map((skill) => (
              <li key={skill.id}>
                {editingSkill?.id === skill.id ? (
                  // 編集フォーム
                  <div className="px-6 py-4 space-y-3">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="スキル名"
                    />
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="カテゴリ"
                    />
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="説明（オプション）"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateSkill}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {skill.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {skill.category}
                        </span>
                        {skill.description && (
                          <span className="ml-2">{skill.description}</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(skill)}
                          aria-label="編集"
                          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          aria-label="削除"
                          className="p-2 rounded-md text-red-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>

      {/* スキル追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              新規スキル追加
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  スキル名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="例: React"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  カテゴリ
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="例: フロントエンド"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  説明（オプション）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="スキルの説明"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSkill}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
