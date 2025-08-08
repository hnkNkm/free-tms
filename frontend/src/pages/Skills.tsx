import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">スキル管理</h2>
          <p className="text-muted-foreground">スキルマスターの管理</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            スキルを追加
          </Button>
        )}
      </div>

      {/* 検索とフィルター */}
      <Card>
        <CardHeader>
          <CardTitle>検索とフィルター</CardTitle>
          <CardDescription>スキル名またはカテゴリで検索</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              placeholder="スキル名またはカテゴリで検索..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "すべて" : category}
                {category !== "all" && (
                  <span className="ml-1">
                    ({groupedSkills[category]?.length || 0})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* スキル一覧 */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredSkills.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                スキルが見つかりません
              </div>
            ) : (
              filteredSkills.map((skill) => (
                <div key={skill.id}>
                  {editingSkill?.id === skill.id ? (
                    // 編集フォーム
                    <div className="p-6 space-y-3">
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="スキル名"
                      />
                      <Input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        placeholder="カテゴリ"
                      />
                      <Textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="説明（オプション）"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateSkill}>
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 表示モード
                    <div className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-medium">{skill.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{skill.category}</Badge>
                          {skill.description && (
                            <span className="text-sm text-muted-foreground">
                              {skill.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(skill)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* スキル追加モーダル */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規スキル追加</DialogTitle>
            <DialogDescription>
              新しいスキルの情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>スキル名</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: React"
              />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="例: フロントエンド"
              />
            </div>
            <div className="space-y-2">
              <Label>説明（オプション）</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="スキルの説明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddSkill}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}