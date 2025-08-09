import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, Building2, Plus, Search } from "lucide-react";

interface Project {
  id: number;
  name: string;
  client_id: number | null;
  client_name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  team_size: number | null;
  member_count?: number;
}

export default function Projects() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get("/projects/");
      setProjects(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("プロジェクトの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };


  const filterProjects = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  const canCreateProject = user?.role === "admin" || user?.role === "manager";

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">プロジェクト管理</h1>
        {canCreateProject && (
          <Button onClick={() => navigate("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" />
            新規プロジェクト
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="プロジェクト名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" aria-label="ステータス">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="planning">計画中</SelectItem>
            <SelectItem value="in_progress">進行中</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="on_hold">保留</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            role="button"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {getStatusBadge(project.status)}
              </div>
              <CardDescription className="flex items-center gap-1 mt-2">
                <Building2 className="h-4 w-4" />
                {project.client_name || "クライアント未設定"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>
                    {project.member_count || 0}/{project.team_size || "-"}人
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">プロジェクトが見つかりません</p>
        </div>
      )}
    </div>
  );
}