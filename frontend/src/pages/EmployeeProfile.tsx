import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Save, ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmployeeProfile {
  id: number;
  name: string;
  email: string;
  department?: string;
  position?: string;
  role: string;
  self_introduction?: string;
  career_goals?: string;
  specialties?: string;
  preferred_project_types?: string[];
  joined_date?: string;
}

interface Skill {
  id: number;
  name: string;
  category: string;
}

interface EmployeeSkill {
  skill_id: number;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  years_of_experience: number;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [projectTypes, setProjectTypes] = useState("");
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [proficiencyLevel, setProficiencyLevel] = useState(3);
  const [yearsOfExperience, setYearsOfExperience] = useState(1);

  const isOwnProfile = currentUser?.id === Number(id);
  const canEdit = isOwnProfile || currentUser?.role === "admin";

  useEffect(() => {
    if (id) {
      fetchEmployeeProfile();
      fetchEmployeeSkills();
      fetchAvailableSkills();
    }
  }, [id]);

  const fetchEmployeeProfile = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      setProfile(response.data);
      setProjectTypes(response.data.preferred_project_types?.join(", ") || "");
    } catch (error) {
      console.error("Failed to fetch employee profile:", error);
      setError("プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSkills = async () => {
    try {
      const response = await api.get(`/skills/employees/${id}/skills`);
      setEmployeeSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch employee skills:", error);
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      const response = await api.get("/skills/");
      setAvailableSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch available skills:", error);
    }
  };

  const handleAddSkill = async () => {
    if (!selectedSkillId || !canEdit) return;

    try {
      await api.post(`/skills/employees/${id}/skills`, {
        skill_id: selectedSkillId,
        proficiency_level: proficiencyLevel,
        years_of_experience: yearsOfExperience,
      });
      await fetchEmployeeSkills();
      setShowSkillModal(false);
      setSelectedSkillId(null);
      setProficiencyLevel(3);
      setYearsOfExperience(1);
    } catch (error) {
      console.error("Failed to add skill:", error);
      alert("スキルの追加に失敗しました");
    }
  };

  const handleUpdateSkill = async (
    skillId: number,
    proficiency: number,
    years: number
  ) => {
    if (!canEdit) return;

    try {
      await api.put(`/skills/employees/${id}/skills/${skillId}`, {
        proficiency_level: proficiency,
        years_of_experience: years,
      });
      await fetchEmployeeSkills();
    } catch (error) {
      console.error("Failed to update skill:", error);
      alert("スキルの更新に失敗しました");
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    if (!canEdit || !confirm("このスキルを削除してもよろしいですか？")) return;

    try {
      await api.delete(`/skills/employees/${id}/skills/${skillId}`);
      await fetchEmployeeSkills();
    } catch (error) {
      console.error("Failed to remove skill:", error);
      alert("スキルの削除に失敗しました");
    }
  };

  const getProficiencyLabel = (level: number) => {
    const labels = ["初心者", "初級", "中級", "上級", "エキスパート"];
    return labels[level - 1] || "";
  };

  const getProficiencyVariant = (level: number): "default" | "secondary" | "destructive" | "outline" => {
    if (level >= 4) return "default";
    if (level >= 3) return "secondary";
    return "outline";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canEdit) return;

    setSaving(true);
    setError("");

    try {
      const projectTypesArray = projectTypes
        .split(",")
        .map((type) => type.trim())
        .filter((type) => type);

      const updateData = {
        self_introduction: profile.self_introduction,
        career_goals: profile.career_goals,
        specialties: profile.specialties,
        preferred_project_types: projectTypesArray,
      };

      await api.put(`/employees/${id}/profile`, updateData);
      alert("プロフィールを更新しました");
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("プロフィールの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground py-8">
        プロフィールが見つかりません
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/employees")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          社員一覧に戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{profile.name}のプロフィール</CardTitle>
          <CardDescription>プロフィール情報とスキルを管理</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>名前</Label>
                <p className="text-sm">{profile.name}</p>
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <p className="text-sm">{profile.email}</p>
              </div>
              <div className="space-y-2">
                <Label>部署</Label>
                <p className="text-sm">{profile.department || "-"}</p>
              </div>
              <div className="space-y-2">
                <Label>役職</Label>
                <p className="text-sm">{profile.position || "-"}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="self_introduction">自己紹介</Label>
                <Textarea
                  id="self_introduction"
                  disabled={!canEdit}
                  value={profile.self_introduction || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, self_introduction: e.target.value })
                  }
                  placeholder="あなたの経験やスキル、興味のある分野について記述してください"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="career_goals">キャリア目標</Label>
                <Textarea
                  id="career_goals"
                  disabled={!canEdit}
                  value={profile.career_goals || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, career_goals: e.target.value })
                  }
                  placeholder="将来のキャリア目標や成長したい方向性について"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">専門分野・得意分野</Label>
                <Textarea
                  id="specialties"
                  disabled={!canEdit}
                  value={profile.specialties || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, specialties: e.target.value })
                  }
                  placeholder="特に得意とする技術や業務分野"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_types">参加したいプロジェクトタイプ</Label>
                <Input
                  id="project_types"
                  type="text"
                  disabled={!canEdit}
                  value={projectTypes}
                  onChange={(e) => setProjectTypes(e.target.value)}
                  placeholder="AI開発, Web開発, インフラ構築など（カンマ区切り）"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {canEdit && (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* スキル管理セクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>スキル</CardTitle>
              <CardDescription>保有スキルと熟練度を管理</CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowSkillModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                スキルを追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {employeeSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              スキルが登録されていません
            </p>
          ) : (
            <div className="space-y-3">
              {employeeSkills.map((skill) => (
                <Card key={skill.skill_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{skill.skill_name}</span>
                        <Badge variant="secondary">{skill.skill_category}</Badge>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSkill(skill.skill_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">熟練度</Label>
                        {canEdit ? (
                          <Select
                            value={String(skill.proficiency_level)}
                            onValueChange={(value) =>
                              handleUpdateSkill(
                                skill.skill_id,
                                Number(value),
                                skill.years_of_experience
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">初心者</SelectItem>
                              <SelectItem value="2">初級</SelectItem>
                              <SelectItem value="3">中級</SelectItem>
                              <SelectItem value="4">上級</SelectItem>
                              <SelectItem value="5">エキスパート</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getProficiencyVariant(skill.proficiency_level)}>
                            {getProficiencyLabel(skill.proficiency_level)}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">経験年数</Label>
                        {canEdit ? (
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            value={skill.years_of_experience}
                            onChange={(e) =>
                              handleUpdateSkill(
                                skill.skill_id,
                                skill.proficiency_level,
                                Number(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        ) : (
                          <p className="text-sm">{skill.years_of_experience}年</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* スキル追加モーダル */}
      <Dialog open={showSkillModal} onOpenChange={setShowSkillModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スキルを追加</DialogTitle>
            <DialogDescription>
              新しいスキルを選択して熟練度と経験年数を設定してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-select">スキル</Label>
              <Select
                value={selectedSkillId ? String(selectedSkillId) : ""}
                onValueChange={(value) => setSelectedSkillId(Number(value))}
              >
                <SelectTrigger id="skill-select" aria-label="スキル">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {availableSkills
                    .filter(
                      (skill) =>
                        !employeeSkills.some((es) => es.skill_id === skill.id)
                    )
                    .map((skill) => (
                      <SelectItem key={skill.id} value={String(skill.id)}>
                        {skill.name} ({skill.category})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proficiency-select">熟練度</Label>
              <Select
                value={String(proficiencyLevel)}
                onValueChange={(value) => setProficiencyLevel(Number(value))}
              >
                <SelectTrigger id="proficiency-select" aria-label="熟練度">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">初心者</SelectItem>
                  <SelectItem value="2">初級</SelectItem>
                  <SelectItem value="3">中級</SelectItem>
                  <SelectItem value="4">上級</SelectItem>
                  <SelectItem value="5">エキスパート</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience-input">経験年数</Label>
              <Input
                id="experience-input"
                type="number"
                min="0"
                max="50"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSkillModal(false);
                setSelectedSkillId(null);
                setProficiencyLevel(3);
                setYearsOfExperience(1);
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleAddSkill} disabled={!selectedSkillId}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}