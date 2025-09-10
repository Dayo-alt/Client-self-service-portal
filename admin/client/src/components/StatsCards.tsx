import { Users, UserCheck, UserPlus, UserX } from "lucide-react";
import type { UserStats } from "@shared/schema";

interface StatsCardsProps {
  stats: UserStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: UserCheck,
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "New This Month",
      value: stats.newUsers,
      icon: UserPlus,
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Inactive Users",
      value: stats.inactiveUsers,
      icon: UserX,
      bgColor: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title} className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`text-xl ${card.iconColor}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-semibold text-foreground" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {card.value.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
