export type DepartureCheckIn = {
  id: string;
  planId: string;
  planTitle: string;
  date: string;
  departedAt: string;
  plannedLeaveAt: string;
  onTime: boolean;
};

export function createDepartureCheckIn(args: {
  planId: string;
  planTitle: string;
  date: string;
  plannedLeaveAt: Date;
  departedAt?: Date;
}): DepartureCheckIn {
  const departedAt = args.departedAt ?? new Date();
  return {
    id: `departure:${args.planId}:${args.date}`,
    planId: args.planId,
    planTitle: args.planTitle,
    date: args.date,
    departedAt: departedAt.toISOString(),
    plannedLeaveAt: args.plannedLeaveAt.toISOString(),
    onTime: departedAt.getTime() <= args.plannedLeaveAt.getTime(),
  };
}
