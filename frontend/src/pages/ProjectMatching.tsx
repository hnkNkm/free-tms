import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  User, 
  Star, 
  Briefcase, 
  Clock, 
  UserPlus,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";

interface MatchedSkill {
  name: string;
  employee_level: number;
  required_level: number;
}

interface EmployeeRecommendation {
  employee: {
    id: number;
    name: string;
    email: string;
    department: string;
    position: string;
  };
  scores: {
    total: number;
    skill_match: number;
    experience: number;
    availability: number;
  };
  matched_skills: MatchedSkill[];
  past_client_projects: number;
  total_projects: number;
}

interface MatchingResult {
  project: {
    id: number;
    name: string;
    required_skills: Array<{ id: number; name: string }>;
  };
  summary: {
    total_candidates: number;
    excellent_matches: number;
    good_matches: number;
    fair_matches: number;
    poor_matches: number;
  };
  categorized_recommendations: {
    excellent: EmployeeRecommendation[];
    good: EmployeeRecommendation[];
    fair: EmployeeRecommendation[];
    poor: EmployeeRecommendation[];
  };
  weights_used: {
    skill: number;
    experience: number;
    availability: number;
  };
}

export default function ProjectMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [weights, setWeights] = useState({
    skill: 0.5,
    experience: 0.3,
    availability: 0.2,
  });
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canMatch = isAdmin || isManager;

  useEffect(() => {
    if (!canMatch) {
      navigate("/projects");
      return;
    }
    if (id) {
      runMatching();
    }
  }, [id]);

  const runMatching = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/projects/${id}/match-employees?skill_weight=${weights.skill}&experience_weight=${weights.experience}&availability_weight=${weights.availability}`
      );
      setMatchingResult(response.data);
    } catch (err: any) {
      console.error("Failed to run matching:", err);
      alert("マッチングの実行に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (type: "skill" | "experience" | "availability", value: number[]) => {
    const newWeights = { ...weights, [type]: value[0] };
    
    // Normalize weights to sum to 1
    const total = newWeights.skill + newWeights.experience + newWeights.availability;
    if (total > 0) {
      newWeights.skill = newWeights.skill / total;
      newWeights.experience = newWeights.experience / total;
      newWeights.availability = newWeights.availability / total;
    }
    
    setWeights(newWeights);
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    const newSelection = new Set(selectedEmployees);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployees(newSelection);
  };

  const handleAddSelectedMembers = async () => {
    if (selectedEmployees.size === 0) return;
    
    try {
      for (const employeeId of selectedEmployees) {
        await api.post(`/projects/${id}/members`, {
          employee_id: employeeId,
          role: "developer",
          contribution_level: 3,
        });
      }
      alert(`${selectedEmployees.size}名のメンバーをプロジェクトに追加しました`);
      navigate(`/projects/${id}`);
    } catch (err) {
      console.error("Failed to add members:", err);
      alert("メンバーの追加に失敗しました");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-100 text-green-800">優秀</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">良好</Badge>;
    if (score >= 30) return <Badge className="bg-orange-100 text-orange-800">可</Badge>;
    return <Badge className="bg-red-100 text-red-800">不適</Badge>;
  };

  const renderEmployeeCard = (rec: EmployeeRecommendation) => (
    <Card key={rec.employee.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold">{rec.employee.name}</h3>
              <p className="text-sm text-gray-500">{rec.employee.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getScoreBadge(rec.scores.total)}
            <span className={`font-bold text-lg ${getScoreColor(rec.scores.total)}`}>
              {rec.scores.total.toFixed(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">スキルマッチ</span>
            <span className="text-sm font-medium">{rec.scores.skill_match.toFixed(1)}%</span>
          </div>
          <Progress value={rec.scores.skill_match} className="h-2" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">経験値</span>
            <span className="text-sm font-medium">{rec.scores.experience.toFixed(1)}%</span>
          </div>
          <Progress value={rec.scores.experience} className="h-2" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">稼働可能性</span>
            <span className="text-sm font-medium">{rec.scores.availability.toFixed(1)}%</span>
          </div>
          <Progress value={rec.scores.availability} className="h-2" />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">マッチしたスキル</p>
          <div className="flex flex-wrap gap-1">
            {rec.matched_skills.map((skill, idx) => (
              <Badge 
                key={idx} 
                variant={skill.employee_level >= skill.required_level ? "default" : "outline"}
                className="text-xs"
              >
                {skill.name} (Lv.{skill.employee_level}/{skill.required_level})
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">プロジェクト数: {rec.total_projects}</span>
          </div>
          {rec.past_client_projects > 0 && (
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">同一クライアント: {rec.past_client_projects}</span>
            </div>
          )}
        </div>

        <Button
          variant={selectedEmployees.has(rec.employee.id) ? "default" : "outline"}
          className="w-full"
          onClick={() => toggleEmployeeSelection(rec.employee.id)}
        >
          {selectedEmployees.has(rec.employee.id) ? (
            <>選択済み</>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              選択
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">マッチング中...</div>
      </div>
    );
  }

  if (!matchingResult) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">プロジェクトマッチング</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{matchingResult.project.name}</CardTitle>
          <CardDescription>
            必要スキル: {matchingResult.project.required_skills.map(s => s.name).join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{matchingResult.summary.excellent_matches}</p>
              <p className="text-sm text-gray-500">優秀な候補</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{matchingResult.summary.good_matches}</p>
              <p className="text-sm text-gray-500">良好な候補</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{matchingResult.summary.fair_matches}</p>
              <p className="text-sm text-gray-500">可能な候補</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{matchingResult.summary.total_candidates}</p>
              <p className="text-sm text-gray-500">全候補者</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>重み付け調整</CardTitle>
          <CardDescription>
            マッチングアルゴリズムの重み付けを調整できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>スキル重視度: {(weights.skill * 100).toFixed(0)}%</Label>
            <Slider
              value={[weights.skill]}
              onValueChange={(v) => handleWeightChange("skill", v)}
              max={1}
              step={0.1}
              className="mt-2"
            />
          </div>
          <div>
            <Label>経験重視度: {(weights.experience * 100).toFixed(0)}%</Label>
            <Slider
              value={[weights.experience]}
              onValueChange={(v) => handleWeightChange("experience", v)}
              max={1}
              step={0.1}
              className="mt-2"
            />
          </div>
          <div>
            <Label>稼働可能性重視度: {(weights.availability * 100).toFixed(0)}%</Label>
            <Slider
              value={[weights.availability]}
              onValueChange={(v) => handleWeightChange("availability", v)}
              max={1}
              step={0.1}
              className="mt-2"
            />
          </div>
          <Button onClick={runMatching} className="w-full">
            再マッチング
          </Button>
        </CardContent>
      </Card>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">マッチング結果</h2>
          {selectedEmployees.size > 0 && (
            <Button onClick={handleAddSelectedMembers}>
              <UserPlus className="mr-2 h-4 w-4" />
              選択した{selectedEmployees.size}名を追加
            </Button>
          )}
        </div>

        <Tabs defaultValue="excellent" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="excellent">
              優秀 ({matchingResult.categorized_recommendations.excellent.length})
            </TabsTrigger>
            <TabsTrigger value="good">
              良好 ({matchingResult.categorized_recommendations.good.length})
            </TabsTrigger>
            <TabsTrigger value="fair">
              可 ({matchingResult.categorized_recommendations.fair.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              全て ({matchingResult.summary.total_candidates})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excellent" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchingResult.categorized_recommendations.excellent.map(renderEmployeeCard)}
            </div>
            {matchingResult.categorized_recommendations.excellent.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">優秀な候補者が見つかりませんでした</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="good" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchingResult.categorized_recommendations.good.map(renderEmployeeCard)}
            </div>
            {matchingResult.categorized_recommendations.good.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">良好な候補者が見つかりませんでした</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fair" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchingResult.categorized_recommendations.fair.map(renderEmployeeCard)}
            </div>
            {matchingResult.categorized_recommendations.fair.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">可能な候補者が見つかりませんでした</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                ...matchingResult.categorized_recommendations.excellent,
                ...matchingResult.categorized_recommendations.good,
                ...matchingResult.categorized_recommendations.fair,
                ...matchingResult.categorized_recommendations.poor,
              ].map(renderEmployeeCard)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}