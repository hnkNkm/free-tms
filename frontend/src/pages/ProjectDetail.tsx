import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Edit, UserPlus, Trash2, Calendar, DollarSign, Users, Briefcase, Star, Search } from "lucide-react";

interface ProjectMember {
  id: number;
  project_id: number;
  employee_id: number;
  employee_name: string;
  role: string;
  contribution_level: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
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
  client_name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  technologies: string | null;
  difficulty_level: number | null;
  team_size: number | null;
  status: string;
  budget: string | null;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  required_skills: ProjectSkill[];
}

interface Employee {
  id: number;
  name: string;
  email: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    employee_id: "",
    role: "developer",
    contribution_level: 3,
    notes: "",
  });

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canEdit = isAdmin || isManager;

  useEffect(() => {
    if (id) {
      fetchProject();
      if (canEdit) {
        fetchEmployees();
      }
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch project:", err);
      if (err.response?.status === 404) {
        setError("プロジェクトが見つかりません");
      } else {
        setError("プロジェクトの取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees/");
      setEmployees(response.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const handleAddMember = async () => {
    if (!project || !newMember.employee_id) return;

    try {
      const response = await api.post(`/projects/${project.id}/members`, {
        employee_id: parseInt(newMember.employee_id),
        role: newMember.role,
        contribution_level: newMember.contribution_level,
        notes: newMember.notes || null,
      });

      // Update project with new member
      setProject({
        ...project,
        members: [...project.members, response.data],
      });

      setShowAddMemberDialog(false);
      setNewMember({
        employee_id: "",
        role: "developer",
        contribution_level: 3,
        notes: "",
      });
    } catch (err) {
      console.error("Failed to add member:", err);
      alert("メンバーの追加に失敗しました");
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!project) return;
    if (!window.confirm("このメンバーをプロジェクトから削除してもよろしいですか？")) return;

    try {
      await api.delete(`/projects/${project.id}/members/${memberId}`);
      setProject({
        ...project,
        members: project.members.filter((m) => m.id !== memberId),
      });
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert("メンバーの削除に失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      planning: { label: "計画中", variant: "outline" },
      in_progress: { label: "進行中", variant: "default" },
      completed: { label: "完了", variant: "secondary" },
      on_hold: { label: "保留", variant: "destructive" },
      cancelled: { label: "キャンセル", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      project_manager: "プロジェクトマネージャー",
      tech_lead: "テックリード",
      developer: "開発者",
      designer: "デザイナー",
      qa: "QA",
      other: "その他",
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {getStatusBadge(project.status)}
        {canEdit && (
          <Button onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">クライアント</p>
              <p className="font-medium">{project.client_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">説明</p>
              <p className="font-medium">{project.description || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">開始日</p>
                <p className="font-medium">{formatDate(project.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">終了日</p>
                <p className="font-medium">{formatDate(project.end_date)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">予算</p>
              <p className="font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {project.budget || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">技術スタック</p>
              <p className="font-medium">{project.technologies || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">チームサイズ</p>
                <p className="font-medium">{project.team_size || "-"}人</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">難易度</p>
                <p className="font-medium">{project.difficulty_level || "-"}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>必要スキル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.required_skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-sm text-gray-500">{skill.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">重要度: {skill.importance_level}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < skill.importance_level
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {project.required_skills.length === 0 && (
                <p className="text-gray-500">スキル要件が設定されていません</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>プロジェクトメンバー</CardTitle>
            <div className="flex gap-2">
              {canEdit && project.status === "recruiting" && (
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/projects/${project.id}/matching`)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  適任者を探す
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => setShowAddMemberDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  メンバーを追加
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{member.employee_name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="outline">{getRoleBadge(member.role)}</Badge>
                    <span className="text-sm text-gray-500">貢献度: {member.contribution_level}</span>
                    {member.notes && <span className="text-sm text-gray-500">{member.notes}</span>}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {project.members.length === 0 && (
              <p className="text-gray-500 text-center py-4">メンバーが登録されていません</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
            <DialogDescription>
              プロジェクトに新しいメンバーを追加します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">社員</Label>
              <Select
                value={newMember.employee_id}
                onValueChange={(value) => setNewMember({ ...newMember, employee_id: value })}
              >
                <SelectTrigger id="employee" aria-label="社員">
                  <SelectValue placeholder="社員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp) => !project.members.some((m) => m.employee_id === emp.id))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">役割</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger id="role" aria-label="役割">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_manager">プロジェクトマネージャー</SelectItem>
                  <SelectItem value="tech_lead">テックリード</SelectItem>
                  <SelectItem value="developer">開発者</SelectItem>
                  <SelectItem value="designer">デザイナー</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contribution">貢献度: {newMember.contribution_level}</Label>
              <Slider
                id="contribution"
                min={1}
                max={5}
                step={1}
                value={[newMember.contribution_level]}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, contribution_level: value[0] })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="notes">メモ</Label>
              <Input
                id="notes"
                value={newMember.notes}
                onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                placeholder="担当範囲など"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddMember}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}