import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save } from "lucide-react";

interface Client {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
  category: string;
}

interface ProjectSkill {
  id: number;
  name: string;
  category: string;
  importance_level: number;
}

interface Project {
  id: number;
  name: string;
  client_id: number | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  technologies: string | null;
  difficulty_level: number | null;
  team_size: number | null;
  status: string;
  budget: string | null;
  required_skills: ProjectSkill[];
}

interface FormData {
  name: string;
  client_id: string;
  description: string;
  start_date: string;
  end_date: string;
  technologies: string;
  difficulty_level: number;
  team_size: number;
  status: string;
  budget: string;
  skill_ids: { skill_id: number; importance_level: number }[];
}

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Map<number, number>>(new Map());

  const [formData, setFormData] = useState<FormData>({
    name: "",
    client_id: "",
    description: "",
    start_date: "",
    end_date: "",
    technologies: "",
    difficulty_level: 3,
    team_size: 1,
    status: "planning",
    budget: "",
    skill_ids: [],
  });

  const canAccess = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (!canAccess) {
      setError("アクセス権限がありません");
      setLoading(false);
      return;
    }

    fetchClients();
    fetchSkills();
    if (isEditMode) {
      fetchProject();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients/");
      setClients(response.data);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError("クライアントの取得に失敗しました");
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await api.get("/skills/");
      setSkills(response.data);
    } catch (err) {
      console.error("Failed to fetch skills:", err);
    }
  };

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      const project: Project = response.data;
      
      setFormData({
        name: project.name,
        client_id: project.client_id?.toString() || "",
        description: project.description || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        technologies: project.technologies || "",
        difficulty_level: project.difficulty_level || 3,
        team_size: project.team_size || 1,
        status: project.status,
        budget: project.budget || "",
        skill_ids: [],
      });

      // Set selected skills
      const skillsMap = new Map<number, number>();
      project.required_skills.forEach((skill) => {
        const matchingSkill = skills.find((s) => s.name === skill.name);
        if (matchingSkill) {
          skillsMap.set(matchingSkill.id, skill.importance_level);
        }
      });
      setSelectedSkills(skillsMap);
    } catch (err) {
      console.error("Failed to fetch project:", err);
      setError("プロジェクトの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "プロジェクト名は必須です";
    }

    if (!formData.client_id) {
      newErrors.client_id = "クライアントを選択してください";
    }

    if (formData.team_size < 1) {
      newErrors.team_size = "チームサイズは1以上にしてください";
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = "終了日は開始日より後に設定してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const skill_ids = Array.from(selectedSkills.entries()).map(([skill_id, importance_level]) => ({
        skill_id,
        importance_level,
      }));

      const submitData = {
        ...formData,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        skill_ids,
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/projects/${id}`, submitData);
      } else {
        response = await api.post("/projects/", submitData);
      }

      navigate(`/projects/${response.data.id}`);
    } catch (err) {
      console.error("Failed to save project:", err);
      setError(isEditMode ? "プロジェクトの更新に失敗しました" : "プロジェクトの作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillToggle = (skillId: number) => {
    const newSelectedSkills = new Map(selectedSkills);
    if (newSelectedSkills.has(skillId)) {
      newSelectedSkills.delete(skillId);
    } else {
      newSelectedSkills.set(skillId, 3); // Default importance level
    }
    setSelectedSkills(newSelectedSkills);
  };

  const handleSkillImportanceChange = (skillId: number, importance: number) => {
    const newSelectedSkills = new Map(selectedSkills);
    newSelectedSkills.set(skillId, importance);
    setSelectedSkills(newSelectedSkills);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditMode ? "プロジェクト編集" : "新規プロジェクト作成"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project-name">プロジェクト名 *</Label>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="project-client">クライアント *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger id="project-client" aria-label="クライアント" className={errors.client_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="クライアントを選択" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id}</p>}
            </div>

            <div>
              <Label htmlFor="project-description">説明</Label>
              <Textarea
                id="project-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="project-status">ステータス</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="project-status" aria-label="ステータス">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">計画中</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="on_hold">保留</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-start-date">開始日</Label>
                <Input
                  id="project-start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="project-end-date">終了日</Label>
                <Input
                  id="project-end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={errors.end_date ? "border-red-500" : ""}
                />
                {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="project-budget">予算</Label>
              <Input
                id="project-budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="例: 1000万円"
              />
            </div>

            <div>
              <Label htmlFor="project-technologies">技術スタック</Label>
              <Input
                id="project-technologies"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="例: React, Node.js, PostgreSQL"
              />
            </div>

            <div>
              <Label htmlFor="project-team-size">チームサイズ</Label>
              <Input
                id="project-team-size"
                type="number"
                min="1"
                value={formData.team_size}
                onChange={(e) => setFormData({ ...formData, team_size: parseInt(e.target.value) || 1 })}
                className={errors.team_size ? "border-red-500" : ""}
              />
              {errors.team_size && <p className="text-red-500 text-sm mt-1">{errors.team_size}</p>}
            </div>

            <div>
              <Label htmlFor="project-difficulty">難易度レベル: {formData.difficulty_level}</Label>
              <Slider
                id="project-difficulty"
                aria-label="難易度レベル"
                min={1}
                max={5}
                step={1}
                value={[formData.difficulty_level]}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value[0] })}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>必要スキル</CardTitle>
            <CardDescription>プロジェクトに必要なスキルを選択し、重要度を設定してください</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`skill-${skill.id}`}
                      checked={selectedSkills.has(skill.id)}
                      onCheckedChange={() => handleSkillToggle(skill.id)}
                      aria-label={skill.name}
                    />
                    <Label htmlFor={`skill-${skill.id}`} className="font-medium">
                      {skill.name}
                    </Label>
                    <span className="text-sm text-gray-500">({skill.category})</span>
                  </div>
                  {selectedSkills.has(skill.id) && (
                    <div className="ml-6">
                      <Label htmlFor={`importance-${skill.id}`} className="text-sm">
                        {skill.name} 重要度: {selectedSkills.get(skill.id)}
                      </Label>
                      <Slider
                        id={`importance-${skill.id}`}
                        min={1}
                        max={5}
                        step={1}
                        value={[selectedSkills.get(skill.id) || 3]}
                        onValueChange={(value) => handleSkillImportanceChange(skill.id, value[0])}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? "保存中..." : isEditMode ? "更新" : "作成"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
            disabled={submitting}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}