import { Users, Briefcase, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  // TODO: 実際のデータはAPIから取得
  const stats = [
    { label: '社員数', value: '0', icon: Users, color: 'bg-blue-500' },
    { label: 'アクティブプロジェクト', value: '0', icon: Briefcase, color: 'bg-green-500' },
    { label: '今月の稼働率', value: '0%', icon: TrendingUp, color: 'bg-purple-500' },
    { label: '平均応答時間', value: '0日', icon: Clock, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground">タレントマネジメントシステムの概要</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <div className={`${stat.color} rounded-md p-2`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>最近のアクティビティ</CardTitle>
          <CardDescription>
            システム内の最新の活動状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            データがありません
          </div>
        </CardContent>
      </Card>
    </div>
  );
}